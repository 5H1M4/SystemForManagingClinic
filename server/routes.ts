import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertClinicSchema, insertServiceSchema, insertAppointmentSchema, insertPaymentSchema } from "@shared/schema";
import { hashPassword } from "./utils"; // Fix: Ensure the utils module is correctly imported or available
import { pool } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Clinic routes
  app.post("/api/clinics", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "SUPER_ADMIN") {
      return res.sendStatus(403);
    }
    
    const parsed = insertClinicSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    
    const clinic = await storage.createClinic(parsed.data);
    res.status(201).json(clinic);
  });

  app.get("/api/clinics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clinics = await storage.listClinics();
    res.json(clinics);
  });

  app.delete('/api/clinics/:clinicId', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "SUPER_ADMIN") {
      return res.sendStatus(403);
    }
  
    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        console.error('Invalid clinic ID:', req.params.clinicId);
        return res.status(400).json({ error: "Invalid clinic ID" });
      }
  
      console.log(`Attempting to delete clinic with ID: ${clinicId}`);
      const deleted = await storage.deleteClinic(clinicId);
      if (deleted) {
        console.log(`Clinic with ID: ${clinicId} deleted successfully.`);
        res.sendStatus(204);
      } else {
        console.warn(`Clinic with ID: ${clinicId} not found.`);
        res.status(404).json({ error: "Clinic not found" });
      }
    } catch (error) {
      console.error('Error deleting clinic:', error);
      res.status(500).json({ message: "Failed to delete clinic" });
    }
  });

  app.put('/api/clinics/:clinicId', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "SUPER_ADMIN") {
      return res.sendStatus(403);
    }

    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        console.error('Invalid clinic ID:', req.params.clinicId);
        return res.status(400).json({ error: "Invalid clinic ID" });
      }

      console.log(`Updating clinic with ID: ${clinicId}`);
      const updated = await storage.updateClinic(clinicId, req.body);
      if (updated) {
        console.log(`Clinic with ID: ${clinicId} updated successfully.`);
        res.json(updated);
      } else {
        console.warn(`Clinic with ID: ${clinicId} not found.`);
        res.status(404).json({ error: "Clinic not found" });
      }
    } catch (error) {
      console.error('Error updating clinic:', error);
      res.status(500).json({ message: "Failed to update clinic" });
    }
  });
  
  

  
  // Service routes
  app.post("/api/services", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }

    const parsed = insertServiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const service = await storage.createService(parsed.data);
    res.status(201).json(service);
  });

  app.get("/api/clinics/:clinicId/services", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const services = await storage.listServicesByClinic(Number(req.params.clinicId));
    res.json(services);
  });

  // Appointment routes
  app.post("/api/appointments", async (req, res) => {
    console.log("=== Starting Appointment Creation ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("User:", JSON.stringify(req.user, null, 2));
  
    if (!req.isAuthenticated() || (req.user.role !== "DOCTOR" && req.user.role !== "CLINIC_ADMIN")) {
      console.log("Authentication failed - User role:", req.user?.role);
      return res.sendStatus(403);
    }
  
    try {
      // Parse and validate the start time
      const startTime = new Date(req.body.startTime);
      if (isNaN(startTime.getTime())) {
        throw new Error("Invalid start time format");
      }
  
      // Get the service to calculate duration
      console.log("Fetching service details for ID:", req.body.serviceId);
      const service = await storage.getService(Number(req.body.serviceId));
      if (!service) {
        console.log("Service not found for ID:", req.body.serviceId);
        return res.status(400).json({ error: "Invalid service selected" });
      }
  
      // Calculate end time
      const endTime = new Date(startTime.getTime() + service.duration * 60000);
  
      // Check for duplicate appointments with validated dates
      const existingAppointment = await storage.checkDuplicateAppointment({
        doctorId: Number(req.body.doctorId),
        startTime,
        endTime
      });
  
      if (existingAppointment) {
        return res.status(400).json({ 
          error: "Doctor already has an appointment scheduled for this time slot" 
        });
      }
  
      // Build appointment data
      const appointmentData = {
        clientId: req.body.clientId || 1,
        doctorId: Number(req.body.doctorId),
        serviceId: Number(req.body.serviceId),
        startTime,
        endTime,
        notes: req.body.notes || "",
        clinicId: req.user.clinicId,
        clientName: req.body.clientName,
        clientEmail: req.body.clientEmail,
        clientPhone: req.body.clientPhone,
      };
  
      const parsed = insertAppointmentSchema.safeParse(appointmentData);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      
      const appointment = await storage.createAppointment(parsed.data);
      console.log("Appointment created successfully:", JSON.stringify(appointment, null, 2));
      res.status(201).json(appointment);
    } catch (error: any) {
      console.error("Error creating appointment:", error.message);
      console.error("Error stack:", error.stack);
      res.status(400).json({ error: error.message });
    }
  });
  
  //end of appointment routes

  app.get("/api/clinics/:clinicId/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const appointments = await storage.listAppointmentsByClinic(Number(req.params.clinicId));
    res.json(appointments);
  });

  app.get("/api/doctors/:doctorId/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const appointments = await storage.listAppointmentsByDoctor(Number(req.params.doctorId));
    res.json(appointments);
  });

  // Payment routes
  app.post("/api/payments", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }

    const parsed = insertPaymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const payment = await storage.createPayment(parsed.data);
    res.status(201).json(payment);
  });

  app.get("/api/clinics/:clinicId/payments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const payments = await storage.listPaymentsByClinic(Number(req.params.clinicId));
    res.json(payments);
  });

  // Add or update this route for creating clinic admins
  app.post("/api/clinics/:clinicId/admin", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "SUPER_ADMIN") {
      return res.sendStatus(403);
    }

    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: "Invalid clinic ID" });
      }

      // Validate required fields
      if (!req.body.username || !req.body.password || !req.body.firstName || !req.body.lastName || !req.body.email) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash the password before creating the admin
      console.log("Original password length:", req.body.password.length);
      const hashedPassword = await hashPassword(req.body.password);
      console.log("Hashed password format:", hashedPassword.includes(".") ? "correct (hash.salt)" : "incorrect");

      // Create admin with hashed password
      const adminData = {
        ...req.body,
        password: hashedPassword,
        role: "CLINIC_ADMIN"
      };

      const admin = await storage.createClinicAdmin(clinicId, adminData);
      res.status(201).json(admin);
    } catch (error) {
      console.error("Error creating clinic admin:", error);
      res.status(500).json({ message: "Failed to create clinic admin" });
    }
  });

  // Get clinic admins for a specific clinic
  app.get('/api/clinics/:clinicId/admins', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "SUPER_ADMIN") {
      return res.sendStatus(403);
    }

    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: "Invalid clinic ID" });
      }

      const admins = await storage.listClinicAdmins(clinicId);
      res.json(admins);
    } catch (error) {
      console.error('Error fetching clinic admins:', error);
      res.status(500).json({ message: "Failed to fetch clinic admins" });
    }
  });

  // Delete a clinic admin
  app.delete('/api/clinics/:clinicId/admins/:adminId', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "SUPER_ADMIN") {
      return res.sendStatus(403);
    }

    try {
      const adminId = parseInt(req.params.adminId);
      if (isNaN(adminId)) {
        return res.status(400).json({ error: "Invalid admin ID" });
      }

      const deleted = await storage.deleteClinicAdmin(adminId);
      if (deleted) {
        res.sendStatus(204);
      } else {
        res.status(404).json({ error: "Admin not found" });
      }
    } catch (error) {
      console.error('Error deleting clinic admin:', error);
      res.status(500).json({ message: "Failed to delete clinic admin" });
    }
  });

  // Get a specific clinic by ID
  app.get('/api/clinics/:clinicId', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: "Invalid clinic ID" });
      }

      const clinic = await storage.getClinic(clinicId);
      if (clinic) {
        res.json(clinic);
      } else {
        res.status(404).json({ error: "Clinic not found" });
      }
    } catch (error) {
      console.error('Error fetching clinic:', error);
      res.status(500).json({ message: "Failed to fetch clinic" });
    }
  });

  // Update the PUT route for updating clinic admins
  app.put('/api/clinics/:clinicId/admins/:adminId', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "SUPER_ADMIN") {
      return res.sendStatus(403);
    }

    try {
      const adminId = parseInt(req.params.adminId);
      if (isNaN(adminId)) {
        return res.status(400).json({ error: "Invalid admin ID" });
      }

      // Check if the admin exists and belongs to the specified clinic
      const admin = await storage.getUser(adminId);
      if (!admin || admin.role !== "CLINIC_ADMIN") {
        return res.status(404).json({ error: "Admin not found" });
      }

      // Handle password hashing if a new password is provided
      let userData = { ...req.body };
      
      if (userData.password) {
        console.log("Updating password - original length:", userData.password.length);
        // Hash the new password
        userData.password = await hashPassword(userData.password);
        console.log("Hashed password format:", userData.password.includes(".") ? "correct (hash.salt)" : "incorrect");
      } else {
        // If no password provided, remove it from the update data
        delete userData.password;
      }

      // Update the admin
      const updatedAdmin = await storage.updateUser(adminId, userData);
      if (updatedAdmin) {
        res.json(updatedAdmin);
      } else {
        res.status(404).json({ error: "Admin not found" });
      }
    } catch (error) {
      console.error('Error updating clinic admin:', error);
      res.status(500).json({ message: "Failed to update clinic admin" });
    }
  });

  // Add this route to get the current admin's clinic
  app.get('/api/clinics/current', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // For clinic admins, return their assigned clinic
      if (req.user.role === "CLINIC_ADMIN" && req.user.clinicId) {
        const clinic = await storage.getClinic(req.user.clinicId);
        if (clinic) {
          // Get staff count for this clinic
          const { rows } = await pool.query(
            "SELECT COUNT(*) FROM users WHERE clinic_id = $1",
            [req.user.clinicId]
          );
          
          // Add staff count to clinic data
          const clinicWithStaffCount = {
            ...clinic,
            staffCount: parseInt(rows[0].count)
          };
          
          return res.json(clinicWithStaffCount);
        }
      }
      
      // For other roles or if clinic not found
      res.status(404).json({ error: "No clinic found for current user" });
    } catch (error) {
      console.error('Error fetching current clinic:', error);
      res.status(500).json({ message: "Failed to fetch current clinic" });
    }
  });

  // Add these routes for services management
  app.get('/api/services', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }
    if (req.user.clinicId) {
      const services = await storage.listServicesByClinic(req.user.clinicId);
      res.json(services);
    } else {
      res.status(400).json({ error: "Clinic ID is required" });
    }
  });

  app.post('/api/services', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }
    try {
      const service = await storage.createService({ ...req.body, clinicId: req.user.clinicId });
      res.status(201).json(service);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/services/:serviceId', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }
    try {
      const updatedService = await storage.updateService(Number(req.params.serviceId), req.body);
      res.json(updatedService);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/services/:serviceId', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }
    try {
      await storage.deleteService(Number(req.params.serviceId));
      res.sendStatus(204);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Add these routes for doctor management
  app.get('/api/doctors', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }
    try {
      if (req.user.clinicId === null) {
        throw new Error("Clinic ID is null");
      }
      const doctors = await storage.listDoctorsByClinic(req.user.clinicId);
      res.json(doctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  });

  app.post('/api/doctors', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }
    try {
      const doctor = await storage.createDoctor({
        ...req.body,
        clinicId: req.user.clinicId,
        role: "DOCTOR"
      });
      res.status(201).json(doctor);
    } catch (error) {
      console.error('Error creating doctor:', error);
      res.status(500).json({ error: "Failed to create doctor" });
    }
  });

  app.put('/api/doctors/:doctorId', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }
    try {
      const doctor = await storage.updateDoctor(Number(req.params.doctorId), req.body);
      res.json(doctor);
    } catch (error) {
      console.error('Error updating doctor:', error);
      res.status(500).json({ error: "Failed to update doctor" });
    }
  });

  app.delete('/api/doctors/:doctorId', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }
    try {
      await storage.deleteDoctor(Number(req.params.doctorId));
      res.sendStatus(204);
    } catch (error) {
      console.error('Error deleting doctor:', error);
      res.status(500).json({ error: "Failed to delete doctor" });
    }
  });

  // Add these routes for scheduling and revenue
  app.get('/api/appointments', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }
    if (req.user.clinicId) {
      const appointments = await storage.listAppointmentsByClinic(req.user.clinicId);
      res.json(appointments);
    } else {
      res.status(400).json({ error: "Clinic ID is required" });
    }
  });

  app.post('/api/appointments/:appointmentId/cancel', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }
    try {
      await storage.cancelAppointment(Number(req.params.appointmentId));
      res.sendStatus(204);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/revenue', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }
    if (req.user.clinicId) {
      const revenue = await storage.calculateRevenue(req.user.clinicId);
      res.json(revenue);
    } else {
      res.status(400).json({ error: "Clinic ID is required" });
    }
  });

  // Add these routes for appointment management
  app.put('/api/appointments/:appointmentId', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "DOCTOR" && req.user.role !== "CLINIC_ADMIN")) {
      return res.sendStatus(403);
    }
    
    try {
      const appointmentId = Number(req.params.appointmentId);
      
      // Verify that the appointment belongs to the user's clinic
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment || appointment.clinicId !== req.user.clinicId) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      const updatedAppointment = await storage.updateAppointment(appointmentId, req.body);
      res.json(updatedAppointment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/appointments/:appointmentId/complete', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== "DOCTOR" && req.user.role !== "CLINIC_ADMIN")) {
      return res.sendStatus(403);
    }
    
    try {
      const appointmentId = Number(req.params.appointmentId);
      
      // Verify that the appointment belongs to the user's clinic
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment || appointment.clinicId !== req.user.clinicId) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      const completedAppointment = await storage.completeAppointment(appointmentId);
      res.json(completedAppointment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
