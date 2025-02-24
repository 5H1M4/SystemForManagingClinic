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

  const httpServer = createServer(app);
  return httpServer;
}
