import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedInitialData() {
  // Create a super admin
  await storage.createUser({
    username: "admin",
    password: await hashPassword("admin123"),
    firstName: "Super",
    lastName: "Admin",
    email: "admin@clinicflow.com",
    phone: "1234567890",
    role: "SUPER_ADMIN",
    clinicId: null,
  });

  // Create a clinic
  const clinic = await storage.createClinic({
    name: "ClinicFlow Medical Center",
    address: "123 Healthcare Ave",
    phone: "1234567890",
    email: "contact@clinicflow.com",
  });

  // Create a clinic admin
  await storage.createUser({
    username: "clinicadmin",
    password: await hashPassword("clinic123"),
    firstName: "Clinic",
    lastName: "Admin",
    email: "clinic.admin@clinicflow.com",
    phone: "1234567891",
    role: "CLINIC_ADMIN",
    clinicId: clinic.id,
  });

  // Create a doctor
  await storage.createUser({
    username: "doctor",
    password: await hashPassword("doctor123"),
    firstName: "John",
    lastName: "Doc",
    email: "doctor@clinicflow.com",
    phone: "1234567892",
    role: "DOCTOR",
    clinicId: clinic.id,
  });

  // Create a client
  await storage.createUser({
    username: "patient",
    password: await hashPassword("patient123"),
    firstName: "Jane",
    lastName: "Patient",
    email: "patient@example.com",
    phone: "1234567893",
    role: "CLIENT",
    clinicId: null,
  });

  // Create some services
  await storage.createService({
    name: "General Consultation",
    description: "Regular checkup and consultation",
    price: "50.00",
    duration: 30,
    clinicId: clinic.id,
  });

  await storage.createService({
    name: "Specialist Consultation",
    description: "Consultation with a specialist doctor",
    price: "100.00",
    duration: 45,
    clinicId: clinic.id,
  });
}
