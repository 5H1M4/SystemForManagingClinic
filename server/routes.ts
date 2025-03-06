import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertClinicSchema, insertServiceSchema, insertAppointmentSchema, insertPaymentSchema } from "@shared/schema";

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
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertAppointmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const appointment = await storage.createAppointment(parsed.data);
    res.status(201).json(appointment);
  });

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

  app.post('/api/clinics/:clinicId/admin', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "SUPER_ADMIN") {
      return res.sendStatus(403);
    }

    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        console.error('Invalid clinic ID:', req.params.clinicId);
        return res.status(400).json({ error: "Invalid clinic ID" });
      }

      const admin = await storage.createClinicAdmin(clinicId, req.body);
      res.status(201).json(admin);
    } catch (error) {
      console.error('Error adding clinic admin:', error);
      res.status(500).json({ message: "Failed to add clinic admin" });
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

  const httpServer = createServer(app);
  return httpServer;
}
