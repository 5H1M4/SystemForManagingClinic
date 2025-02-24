import { IStorage } from "./storage";
import createMemoryStore from "memorystore";
import session from "express-session";
import {
  User,
  Clinic,
  Service,
  Appointment,
  Payment,
  InsertUser,
  InsertClinic,
  InsertService,
  InsertAppointment,
  InsertPayment
} from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clinics: Map<number, Clinic>;
  private services: Map<number, Service>;
  private appointments: Map<number, Appointment>;
  private payments: Map<number, Payment>;
  private currentIds: { [key: string]: number };
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.clinics = new Map();
    this.services = new Map();
    this.appointments = new Map();
    this.payments = new Map();
    this.currentIds = {
      users: 1,
      clinics: 1,
      services: 1,
      appointments: 1,
      payments: 1
    };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24h
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Clinic operations
  async getClinic(id: number): Promise<Clinic | undefined> {
    return this.clinics.get(id);
  }

  async createClinic(insertClinic: InsertClinic): Promise<Clinic> {
    const id = this.currentIds.clinics++;
    const clinic: Clinic = { ...insertClinic, id };
    this.clinics.set(id, clinic);
    return clinic;
  }

  async listClinics(): Promise<Clinic[]> {
    return Array.from(this.clinics.values());
  }

  // Service operations
  async createService(insertService: InsertService): Promise<Service> {
    const id = this.currentIds.services++;
    const service: Service = { ...insertService, id };
    this.services.set(id, service);
    return service;
  }

  async listServicesByClinic(clinicId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.clinicId === clinicId
    );
  }

  // Appointment operations
  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = this.currentIds.appointments++;
    const appointment: Appointment = { ...insertAppointment, id };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async listAppointmentsByClinic(clinicId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (appointment) => appointment.clinicId === clinicId
    );
  }

  async listAppointmentsByDoctor(doctorId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (appointment) => appointment.doctorId === doctorId
    );
  }

  // Payment operations
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = this.currentIds.payments++;
    const payment: Payment = { ...insertPayment, id };
    this.payments.set(id, payment);
    return payment;
  }

  async listPaymentsByClinic(clinicId: number): Promise<Payment[]> {
    const clinicAppointments = await this.listAppointmentsByClinic(clinicId);
    const appointmentIds = new Set(clinicAppointments.map(a => a.id));
    return Array.from(this.payments.values()).filter(
      (payment) => appointmentIds.has(payment.appointmentId)
    );
  }
}

export const storage = new MemStorage();
