import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CLINIC_ADMIN: 'CLINIC_ADMIN',
  DOCTOR: 'DOCTOR',
  CLIENT: 'CLIENT'
} as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull().$type<keyof typeof UserRole>(),
  clinicId: integer("clinic_id").references(() => clinics.id)
});

export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email")
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(), // in minutes
  clinicId: integer("clinic_id").references(() => clinics.id).notNull()
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().$type<'SCHEDULED' | 'COMPLETED' | 'CANCELLED'>(),
  clinicId: integer("clinic_id").references(() => clinics.id).notNull(),
  notes: text("notes"),
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone")
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").references(() => appointments.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().$type<'PENDING' | 'COMPLETED' | 'REFUNDED'>(),
  paidAt: timestamp("paid_at")
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  clinicId: true
});

export const insertClinicSchema = createInsertSchema(clinics);
export const insertServiceSchema = createInsertSchema(services);
export const insertAppointmentSchema = createInsertSchema(appointments)
  .omit({ endTime: true })
  .extend({
    startTime: z.string().or(z.date()),
    endTime: z.string().or(z.date()).optional(),
    serviceId: z.number(),
    doctorId: z.number(),
    clientId: z.number(),
    clientName: z.string().optional(),     // Add this line
    clientEmail: z.string().optional(),    // Add this line
    clientPhone: z.string().optional(),  
    notes: z.string().optional(),
    status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).default('SCHEDULED'),
  });
export const insertPaymentSchema = createInsertSchema(payments);

// Types
export type User = typeof users.$inferSelect;
export type Clinic = typeof clinics.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Payment = typeof payments.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
