import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertClinicSchema, insertServiceSchema, insertAppointmentSchema, insertPaymentSchema } from "@shared/schema";
import { hashPassword, comparePasswords } from "./utils"; // Fix: Ensure the utils module is correctly imported or available
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
  // Service Routes

// POST /api/services - Create a new service
app.post("/api/services", async (req, res) => {
  console.log("Creating service - Request body:", req.body);
  
  if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
    return res.sendStatus(403);
  }

  // Ensure clinicId is available
  if (!req.user.clinicId) {
    return res.status(400).json({ error: "Clinic ID is required" });
  }

  try {
    // Prepare the data with the correct types
    const serviceData = {
      ...req.body,
      clinicId: req.user.clinicId,
      price: Number(req.body.price), // Ensure price is a number
      duration: Number(req.body.duration), // Ensure duration is a number
    };

    console.log("Formatted service data:", serviceData);

    // Validate with schema
    const parsed = insertServiceSchema.safeParse(serviceData);
    if (!parsed.success) {
      console.error("Validation errors:", parsed.error);
      return res.status(400).json(parsed.error);
    }

    const service = await storage.createService(parsed.data);
    console.log("Service created successfully:", service);
    return res.status(201).json(service);
  } catch (error) {
    console.error("Error creating service:", error);
    return res.status(500).json({ message: "Failed to create service" });
  }
});


// GET /api/clinics/:clinicId/services - List services for a clinic
app.get("/api/clinics/:clinicId/services", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.sendStatus(401);
  }

  const services = await storage.listServicesByClinic(Number(req.params.clinicId));

  // Convert the stored price to a number for the client response
  const formattedServices = services.map(service => ({
    ...service,
    price: Number(service.price),
  }));

  return res.json(formattedServices);
});

  

  // Appointment routes
  app.post("/api/appointments", async (req, res) => {
    console.log("=== Starting Appointment Creation ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("User:", JSON.stringify(req.user, null, 2));
    if (!req.isAuthenticated() || !["DOCTOR", "CLINIC_ADMIN", "CLIENT"].includes(req.user.role)) {
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
  
      // If doctorId is not provided (client booking), assign the first doctor from the clinic
      let doctorId = Number(req.body.doctorId);
      if ((!doctorId || isNaN(doctorId)) && req.user.role === "CLIENT") {
        const doctors = await storage.listDoctorsByClinic(Number(req.body.clinicId));
        if (!doctors || doctors.length === 0) {
          return res.status(400).json({ error: "No doctors available for this clinic" });
        }
        doctorId = doctors[0].id;
      }
  
      // Calculate end time
      const endTime = new Date(startTime.getTime() + service.duration * 60000);
  
      // Check for duplicate appointments with validated dates
      let existingAppointment = false;
      if (!isNaN(doctorId) && doctorId > 0) {
        existingAppointment = await storage.checkDuplicateAppointment({
          doctorId: doctorId,
          startTime,
          endTime
        });
        if (existingAppointment) {
          return res.status(400).json({ 
            error: "Doctor already has an appointment scheduled for this time slot" 
          });
        }
      }
  
      // Build appointment data
      const appointmentData = {
        clientId: req.body.clientId || 1,
        doctorId: doctorId,
        serviceId: Number(req.body.serviceId),
        startTime,
        endTime,
        notes: req.body.notes || "",
        clinicId: req.user.role === "CLIENT" ? Number(req.body.clinicId) : req.user.clinicId,
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
      // Hash the password coming from the request body.
      const hashedPassword = await hashPassword(req.body.password);
  
      // Pass the hashed password instead of the plain text one.
      const doctor = await storage.createDoctor({
        ...req.body,
        password: hashedPassword,
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
        const { password, ...otherFields } = req.body; // ✅ Separate password field
        let updatedFields = { ...otherFields };

        if (password) {
            console.log("Hashing new password before updating doctor.");
            updatedFields.password = await hashPassword(password); // ✅ Hash only if password is provided
        }

        const doctor = await storage.updateDoctor(Number(req.params.doctorId), updatedFields);
        res.json(doctor);
    } catch (error) {
        console.error("Error updating doctor:", error);
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

  // Fix appointments route to properly handle date filtering
  app.get('/api/appointments', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "CLINIC_ADMIN") {
      return res.sendStatus(403);
    }
    
    try {
      if (req.user.clinicId) {
        // Get the date parameter from the query string
        const dateParam = req.query.date as string;
        console.log(`Appointment request for date: ${dateParam}`);
        
        let date: Date;
        if (dateParam) {
          // Create date object from the date string (YYYY-MM-DD)
          date = new Date(dateParam);
          
          // Ensure it's a valid date
          if (isNaN(date.getTime())) {
            console.error(`Invalid date parameter: ${dateParam}`);
            return res.status(400).json({ error: "Invalid date parameter" });
          }
          
        } else {
          date = new Date(); // Default to today if no date provided
        }
        
        console.log(`Querying appointments for clinic ${req.user.clinicId} on date ${date.toISOString().split('T')[0]}`);
        
        // Get appointments for the clinic and date
        const appointments = await storage.listAppointmentsByClinicAndDate(req.user.clinicId, date);
        
        console.log(`Found ${appointments.length} appointments for the specified date`);
        console.log('Appointments:', JSON.stringify(appointments.map(a => ({ 
          id: a.id,
          clientName: a.clientName,
          startTime: a.startTime,
          formattedDate: new Date(a.startTime).toISOString().split('T')[0]
        })), null, 2));
        
        res.json(appointments);
      } else {
        res.status(400).json({ error: "Clinic ID is required" });
      }
    } catch (error) {
      console.error('Error in appointments route:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post('/api/appointments/:appointmentId/cancel', async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const user = req.user;

      console.log(`Cancel request for appointment ${appointmentId} by user ${user?.id} (${user?.role})`);

      if (!user) {
        console.log('Cancel failed: User not authenticated');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Allow both clinic admins and doctors to cancel appointments
      if (user.role !== 'CLINIC_ADMIN' && user.role !== 'DOCTOR') {
        console.log(`Cancel failed: User role ${user.role} not authorized`);
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Check if appointmentId is a valid number
      const appointmentIdNum = parseInt(appointmentId);
      if (isNaN(appointmentIdNum)) {
        console.log(`Cancel failed: Invalid appointment ID format: ${appointmentId}`);
        return res.status(400).json({ error: 'Invalid appointment ID' });
      }

      const appointment = await storage.getAppointment(appointmentIdNum);
      console.log(`Appointment found: ${appointment ? 'Yes' : 'No'}`);
      
      if (!appointment) {
        console.log(`Cancel failed: Appointment ${appointmentId} not found`);
        return res.status(404).json({ error: 'Appointment not found' });
      }

      console.log(`Appointment details: doctorId=${appointment.doctorId}, clinicId=${appointment.clinicId}, status=${appointment.status}`);
      console.log(`User details: id=${user.id}, clinicId=${user.clinicId}, role=${user.role}`);

      // For doctors, only allow cancelling their own appointments
      const appointmentDoctorId = typeof appointment.doctorId === 'string' 
        ? parseInt(appointment.doctorId) 
        : appointment.doctorId;
        
      const userId = typeof user.id === 'string' 
        ? parseInt(user.id) 
        : user.id;
        
      if (user.role === 'DOCTOR' && appointmentDoctorId !== userId) {
        console.log(`Cancel failed: Doctor ID mismatch. Appointment doctorId=${appointmentDoctorId}, user.id=${userId}`);
        return res.status(403).json({ error: 'You can only cancel your own appointments' });
      }

      // For clinic admins, only allow cancelling appointments in their clinic
      const appointmentClinicId = typeof appointment.clinicId === 'string' 
        ? parseInt(appointment.clinicId) 
        : appointment.clinicId;
        
      const userClinicId = typeof user.clinicId === 'string' 
        ? parseInt(user.clinicId) 
        : user.clinicId;
        
      if (user.role === 'CLINIC_ADMIN' && appointmentClinicId !== userClinicId) {
        console.log(`Cancel failed: Clinic ID mismatch. Appointment clinicId=${appointmentClinicId}, user.clinicId=${userClinicId}`);
        return res.status(403).json({ error: 'You can only cancel appointments in your clinic' });
      }

      // Verify appointment is in SCHEDULED status
      if (appointment.status !== 'SCHEDULED') {
        console.log(`Cancel failed: Appointment status is ${appointment.status}, not SCHEDULED`);
        return res.status(400).json({ error: 'Only scheduled appointments can be cancelled' });
      }

      console.log(`Proceeding with cancellation of appointment ${appointmentId}`);
      const updatedAppointment = await storage.cancelAppointment(appointmentIdNum);
      console.log(`Appointment ${appointmentId} cancelled successfully`);
      res.json(updatedAppointment);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/appointments/:appointmentId/complete', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.log('Complete failed: User not authenticated');
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (req.user.role !== "DOCTOR" && req.user.role !== "CLINIC_ADMIN") {
        console.log(`Complete failed: User role ${req.user.role} not authorized`);
        return res.status(403).json({ error: 'Forbidden' });
      }

      const appointmentId = Number(req.params.appointmentId);
      console.log(`Complete request for appointment ${appointmentId} by user ${req.user.id} (${req.user.role})`);
      
      if (isNaN(appointmentId)) {
        console.log(`Complete failed: Invalid appointment ID format: ${req.params.appointmentId}`);
        return res.status(400).json({ error: 'Invalid appointment ID' });
      }
      
      // Get the appointment to check permissions
      const appointment = await storage.getAppointment(appointmentId);
      console.log(`Appointment found: ${appointment ? 'Yes' : 'No'}`);
      
      if (!appointment) {
        console.log(`Complete failed: Appointment ${appointmentId} not found`);
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      console.log(`Appointment details: doctorId=${appointment.doctorId}, clinicId=${appointment.clinicId}, status=${appointment.status}`);
      console.log(`User details: id=${req.user.id}, clinicId=${req.user.clinicId}, role=${req.user.role}`);
      
      // Verify doctor is authorized to complete this appointment
      const appointmentDoctorId = typeof appointment.doctorId === 'string' 
        ? parseInt(appointment.doctorId) 
        : appointment.doctorId;
        
      const userId = typeof req.user.id === 'string' 
        ? parseInt(req.user.id) 
        : req.user.id;
        
      if (req.user.role === "DOCTOR" && appointmentDoctorId !== userId) {
        console.log(`Complete failed: Doctor ID mismatch. Appointment doctorId=${appointmentDoctorId}, user.id=${userId}`);
        return res.status(403).json({ error: "You are not authorized to complete this appointment" });
      }
      
      // For clinic admins, verify they belong to the same clinic
      const appointmentClinicId = typeof appointment.clinicId === 'string' 
        ? parseInt(appointment.clinicId) 
        : appointment.clinicId;
        
      const userClinicId = typeof req.user.clinicId === 'string' 
        ? parseInt(req.user.clinicId) 
        : req.user.clinicId;
        
      if (req.user.role === "CLINIC_ADMIN" && appointmentClinicId !== userClinicId) {
        console.log(`Complete failed: Clinic ID mismatch. Appointment clinicId=${appointmentClinicId}, user.clinicId=${userClinicId}`);
        return res.status(403).json({ error: "You are not authorized to complete this appointment" });
      }
      
      // Verify appointment is in SCHEDULED status
      if (appointment.status !== "SCHEDULED") {
        console.log(`Complete failed: Appointment status is ${appointment.status}, not SCHEDULED`);
        return res.status(400).json({ error: "Only scheduled appointments can be completed" });
      }
      
      // All checks passed, proceed with completion
      console.log(`Proceeding with completion of appointment ${appointmentId}`);
      const completedAppointment = await storage.completeAppointment(appointmentId);
      console.log(`Appointment ${appointmentId} completed successfully`);
      res.json(completedAppointment);
    } catch (error: any) {
      console.error("Error completing appointment:", error);
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

  // New endpoint for super admin to get total revenue across all clinics
  app.get('/api/revenue/total', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "SUPER_ADMIN") {
      return res.sendStatus(403);
    }
    
    try {
      const totalRevenue = await storage.calculateTotalRevenue();
      res.json(totalRevenue);
    } catch (error) {
      console.error('Error fetching total revenue:', error);
      res.status(500).json({ error: "Failed to calculate total revenue" });
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

  // Add this endpoint for available slots for a service on a given date
  app.get('/api/services/:serviceId/slots', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const serviceId = Number(req.params.serviceId);
    const date = req.query.date as string;
    if (!serviceId || !date) return res.status(400).json({ error: 'Missing serviceId or date' });

    // Get the service to determine duration and clinic
    const service = await storage.getService(serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    const clinicId = service.clinicId;
    const duration = Number(service.duration) || 30;
    const startHour = 9, endHour = 17;
    const slots: string[] = [];
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    // Generate all possible slots for the day
    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += duration) {
        const slot = new Date(dateObj);
        slot.setHours(hour, min, 0, 0);
        slots.push(slot.toTimeString().slice(0, 5)); // "HH:MM"
      }
    }

    // Get all appointments for this clinic/service/date
    const appointments = await storage.listAppointmentsByClinicAndDate(clinicId, dateObj);
    const bookedTimes = appointments
      .filter(a => a.serviceId === serviceId)
      .map(a => {
        const d = new Date(a.startTime);
        return d.toTimeString().slice(0, 5);
      });

    // Filter out booked slots
    const availableSlots = slots.filter(slot => !bookedTimes.includes(slot));
    res.json(availableSlots);
  });

  app.get("/api/clients/:clientId/appointments", async (req, res) => {
    console.log("=== Fetching Client Appointments ===");
    console.log("Client ID:", req.params.clientId);
    console.log("User:", req.user);
    
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    // Only allow clients to view their own appointments or clinic admins/doctors to view any client's appointments
    if (req.user.role === "CLIENT" && req.user.id !== Number(req.params.clientId)) {
      return res.sendStatus(403);
    }

    try {
      // Get appointments
      const appointments = await storage.listAppointmentsByClient(Number(req.params.clientId));
      
      // Get service details for each appointment
      const appointmentsWithDetails = await Promise.all(
        appointments.map(async (appointment) => {
          const service = await storage.getService(appointment.serviceId);
          return {
            ...appointment,
            serviceName: service?.name || "Unknown Service",
            servicePrice: service?.price || 0
          };
        })
      );

      console.log("Fetched appointments:", JSON.stringify(appointmentsWithDetails, null, 2));
      res.json(appointmentsWithDetails);
    } catch (error) {
      console.error("Error fetching client appointments:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
