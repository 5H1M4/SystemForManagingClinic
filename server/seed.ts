// server/seed.ts
import { db } from "./db";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import dotenv from "dotenv";
import * as schema from "../shared/schema"; // adjust if needed
import { eq } from "drizzle-orm"; // used for checking duplicates
dotenv.config();

const { users, clinics, services } = schema; // Destructure table definitions
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedInitialData() {
  // Check if admin already exists to prevent duplicate insertion
  const existingAdmins = await db
    .select()
    .from(users)
    .where(eq(users.username, "admin"));
    
  if (existingAdmins.length > 0) {
    console.log("Admin user already exists. Skipping seeding.");
    return;
  }

  // Insert Super Admin
  const hashedAdminPassword = await hashPassword("admin123");
  const [adminUser] = await db.insert(users)
    .values({
      username: "admin",
      password: hashedAdminPassword,
      firstName: "Super",
      lastName: "Admin",
      email: "admin@clinicflow.com",
      phone: "1234567890",
      role: "SUPER_ADMIN",
      clinicId: null,
    })
    .returning();
  console.log("Inserted Super Admin:", adminUser);

  // Insert a Clinic
  const [clinic] = await db.insert(clinics)
    .values({
      name: "ClinicFlow Medical Center",
      address: "123 Healthcare Ave",
      phone: "1234567890",
      email: "contact@clinicflow.com",
    })
    .returning();
  console.log("Inserted Clinic:", clinic);

  // Insert Clinic Admin
  const hashedClinicAdminPassword = await hashPassword("clinic123");
  const [clinicAdmin] = await db.insert(users)
    .values({
      username: "clinicadmin",
      password: hashedClinicAdminPassword,
      firstName: "Clinic",
      lastName: "Admin",
      email: "clinic.admin@clinicflow.com",
      phone: "1234567891",
      role: "CLINIC_ADMIN",
      clinicId: clinic.id,
    })
    .returning();
  console.log("Inserted Clinic Admin:", clinicAdmin);

  // Insert Doctor
  const hashedDoctorPassword = await hashPassword("doctor123");
  const [doctor] = await db.insert(users)
    .values({
      username: "doctor",
      password: hashedDoctorPassword,
      firstName: "John",
      lastName: "Doc",
      email: "doctor@clinicflow.com",
      phone: "1234567892",
      role: "DOCTOR",
      clinicId: clinic.id,
    })
    .returning();
  console.log("Inserted Doctor:", doctor);

  // Insert Client
  const hashedPatientPassword = await hashPassword("patient123");
  const [patient] = await db.insert(users)
    .values({
      username: "patient",
      password: hashedPatientPassword,
      firstName: "Jane",
      lastName: "Patient",
      email: "patient@example.com",
      phone: "1234567893",
      role: "CLIENT",
      clinicId: null,
    })
    .returning();
  console.log("Inserted Client:", patient);

  // Insert Services
  const [service1] = await db.insert(services)
    .values({
      name: "General Consultation",
      description: "Regular checkup and consultation",
      price: "50.00",
      duration: 30,
      clinicId: clinic.id,
    })
    .returning();
  console.log("Inserted Service 1:", service1);

  const [service2] = await db.insert(services)
    .values({
      name: "Specialist Consultation",
      description: "Consultation with a specialist doctor",
      price: "100.00",
      duration: 45,
      clinicId: clinic.id,
    })
    .returning();
  console.log("Inserted Service 2:", service2);

  console.log("Seed data inserted successfully!");
}

// When this module is run directly, execute the seeding
if (process.argv[1] && process.argv[1].includes("seed.ts")) {
  seedInitialData().catch((error) => {
    console.error("Error seeding data:", error);
  });
}
