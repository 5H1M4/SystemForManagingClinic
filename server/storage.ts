// storage.ts
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
import { pool } from "./db"; // Use the same pool instance for DB queries

const MemoryStore = createMemoryStore(session);

// Define the storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // Clinic operations
  getClinic(id: number): Promise<Clinic | undefined>;
  createClinic(insertClinic: InsertClinic): Promise<Clinic>;
  updateClinic(clinicId: number, updateData: Partial<Clinic>): Promise<Clinic | null>;
  deleteClinic(clinicId: number): Promise<boolean>;
  listClinics(): Promise<Clinic[]>;
  
  // Service operations
  createService(insertService: InsertService): Promise<Service>;
  listServicesByClinic(clinicId: number): Promise<Service[]>;
  
  // Appointment operations
  createAppointment(insertAppointment: InsertAppointment): Promise<Appointment>;
  listAppointmentsByClinic(clinicId: number): Promise<Appointment[]>;
  listAppointmentsByDoctor(doctorId: number): Promise<Appointment[]>;
  
  // Payment operations
  createPayment(insertPayment: InsertPayment): Promise<Payment>;
  listPaymentsByClinic(clinicId: number): Promise<Payment[]>;
  
  // Admin operations
  createClinicAdmin(clinicId: number, adminData: InsertUser): Promise<User>;
  
  // Session store
  sessionStore: session.Store;
  
  // Service operations
  getService(serviceId: number): Promise<Service | null>;

  checkDuplicateAppointment(params: { doctorId: number; startTime: Date; endTime: Date }): Promise<boolean>;

  listAppointmentsByClinicAndDate(clinicId: number, date: Date): Promise<Appointment[]>;
}

export class PostgresStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24h
    });
  }

  // ============
  // User Methods
  // ============
  async getUser(id: number): Promise<User | undefined> {
    try {
      const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
      if (rows.length === 0) return undefined;
      return this.convertUser(rows[0]);
    } catch (error) {
      console.error("Error fetching user:", error);
      throw new Error("Failed to fetch user");
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
      if (rows.length === 0) return undefined;
      return this.convertUser(rows[0]);
    } catch (error) {
      console.error("Error fetching user by username:", error);
      throw new Error("Failed to fetch user by username");
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const { rows } = await pool.query(
        `INSERT INTO users 
           (username, password, first_name, last_name, email, phone, role, clinic_id)
         VALUES 
           ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          insertUser.username,
          insertUser.password,
          insertUser.firstName,
          insertUser.lastName,
          insertUser.email,
          insertUser.phone,
          insertUser.role,
          insertUser.clinicId,
        ]
      );
      return this.convertUser(rows[0]);
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }

  // Helper function to convert a DB row (with snake_case fields) to the expected User shape.
  private convertUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      clinicId: row.clinic_id,
    };
  }

  // =================
  // Clinic Operations
  // =================
  async getClinic(id: number): Promise<Clinic | undefined> {
    try {
      const { rows } = await pool.query("SELECT * FROM clinics WHERE id = $1", [id]);
      if (rows.length === 0) return undefined;
      return this.convertClinic(rows[0]);
    } catch (error) {
      console.error("Error fetching clinic:", error);
      throw new Error("Failed to fetch clinic");
    }
  }

  async createClinic(insertClinic: InsertClinic): Promise<Clinic> {
    try {
      const { rows } = await pool.query(
        `INSERT INTO clinics 
           (name, address, phone, email)
         VALUES 
           ($1, $2, $3, $4)
         RETURNING *`,
        [
          insertClinic.name,
          insertClinic.address,
          insertClinic.phone,
          insertClinic.email,
        ]
      );
      return this.convertClinic(rows[0]);
    } catch (error) {
      console.error("Error creating clinic:", error);
      throw new Error("Failed to create clinic");
    }
  }

  async updateClinic(clinicId: number, updateData: Partial<Clinic>): Promise<Clinic | null> {
    try {
      const { rows } = await pool.query(
        `UPDATE clinics 
         SET name = $1, address = $2, phone = $3, email = $4 
         WHERE id = $5 
         RETURNING *`,
        [updateData.name, updateData.address, updateData.phone, updateData.email, clinicId]
      );
      
      if (rows.length === 0) return null;
      return this.convertClinic(rows[0]);
    } catch (error) {
      console.error("Error updating clinic:", error);
      throw new Error("Failed to update clinic");
    }
  }

  async deleteClinic(clinicId: number): Promise<boolean> {
    try {
      // First check if clinic has associated services
      const { rows: serviceRows } = await pool.query(
        "SELECT COUNT(*) FROM services WHERE clinic_id = $1",
        [clinicId]
      );
      
      if (parseInt(serviceRows[0].count) > 0) {
        // Option 1: Prevent deletion with clear message
        throw new Error("Cannot delete clinic with associated services. Please delete services first.");
        
        // Option 2: Cascade delete (uncomment to use this approach instead)
        // await pool.query("DELETE FROM services WHERE clinic_id = $1", [clinicId]);
      }
      
      // Check for associated appointments
      const { rows: appointmentRows } = await pool.query(
        "SELECT COUNT(*) FROM appointments WHERE clinic_id = $1",
        [clinicId]
      );
      
      if (parseInt(appointmentRows[0].count) > 0) {
        throw new Error("Cannot delete clinic with associated appointments. Please delete appointments first.");
        // Or cascade delete if preferred
      }
      
      // Check for associated users (doctors, admins)
      const { rows: userRows } = await pool.query(
        "SELECT COUNT(*) FROM users WHERE clinic_id = $1",
        [clinicId]
      );
      
      if (parseInt(userRows[0].count) > 0) {
        throw new Error("Cannot delete clinic with associated users. Please reassign or delete users first.");
        // Or cascade delete if preferred
      }
      
      // Now safe to delete the clinic
      const result = await pool.query("DELETE FROM clinics WHERE id = $1", [clinicId]);
      if (result.rowCount === null) {
        throw new Error("Failed to delete clinic");
      }
      return result.rowCount > 0;
    } catch (error) {
      console.error("Database error during clinic deletion:", error);
      throw error; // Rethrow to handle in the route
    }
  }

  async listClinics(): Promise<Clinic[]> {
    try {
      const { rows } = await pool.query("SELECT * FROM clinics ORDER BY id");
      return rows.map(row => this.convertClinic(row));
    } catch (error) {
      console.error("Error listing clinics:", error);
      throw new Error("Failed to list clinics");
    }
  }

  // Helper function to convert a DB row to the expected Clinic shape
  private convertClinic(row: any): Clinic {
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone,
      email: row.email,
    };
  }

  // ==================
  // Service Operations
  // ==================
  async addService(insertService: InsertService): Promise<Service> {
    try {
      const { rows } = await pool.query(
        `INSERT INTO services 
           (name, description, price, duration, clinic_id)
         VALUES 
           ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          insertService.name,
          insertService.description,
          insertService.price,
          insertService.duration,
          insertService.clinicId,
        ]
      );
      return this.convertService(rows[0]);
    } catch (error) {
      console.error("Error creating service:", error);
      throw new Error("Failed to create service");
    }
  }

  async listServicesByClinic(clinicId: number): Promise<Service[]> {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM services WHERE clinic_id = $1 ORDER BY id",
        [clinicId]
      );
      return rows.map(row => this.convertService(row));
    } catch (error) {
      console.error("Error listing services by clinic:", error);
      throw new Error("Failed to list services by clinic");
    }
  }

  // Helper function to convert a DB row to the expected Service shape
  private convertService(row: any): Service {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      duration: row.duration,
      clinicId: row.clinic_id,
    };
  }

  // ======================
  // Appointment Operations
  // ======================
  async createAppointment(appointmentData: InsertAppointment): Promise<Appointment> {
    console.log('=== Starting createAppointment in Storage ===');
    try {
      console.log('Appointment data received:', JSON.stringify(appointmentData, null, 2));

      // Construct the SQL query
      const query = `
        INSERT INTO appointments (
          client_id, 
          doctor_id, 
          service_id, 
          start_time, 
          end_time, 
          notes, 
          status, 
          clinic_id,
          client_name,
          client_email,
          client_phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`;

      const values = [
        appointmentData.clientId,
        appointmentData.doctorId,
        appointmentData.serviceId,
        appointmentData.startTime,
        appointmentData.endTime,
        appointmentData.notes || '',
        appointmentData.status || 'SCHEDULED',
        appointmentData.clinicId,
        appointmentData.clientName || null,
        appointmentData.clientEmail || null,
        appointmentData.clientPhone || null
      ];

      console.log('Executing SQL query:', query);
      console.log('Query values:', JSON.stringify(values, null, 2));

      const { rows } = await pool.query(query, values);
      
      if (rows.length === 0) {
        console.error('No rows returned from insert query');
        throw new Error('Failed to create appointment - no rows returned');
      }

      console.log('Raw database result:', JSON.stringify(rows[0], null, 2));
      const appointment = this.convertAppointment(rows[0]);
      console.log('Converted appointment:', JSON.stringify(appointment, null, 2));
      
    return appointment;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error in createAppointment:', error.message);
        console.error('Error stack:', error.stack);
        throw new Error(`Failed to create appointment: ${error.message}`);
      } else {
        console.error('Unknown error in createAppointment:', error);
        throw new Error('Failed to create appointment due to an unknown error');
      }
    }
  }

  async listAppointmentsByClinic(clinicId: number): Promise<Appointment[]> {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM appointments WHERE clinic_id = $1 ORDER BY start_time",
        [clinicId]
      );
      return rows.map(row => this.convertAppointment(row));
    } catch (error) {
      console.error("Error listing appointments by clinic:", error);
      throw new Error("Failed to list appointments by clinic");
    }
  }

  async listAppointmentsByDoctor(doctorId: number): Promise<Appointment[]> {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM appointments WHERE doctor_id = $1 ORDER BY start_time",
        [doctorId]
      );
      return rows.map(row => this.convertAppointment(row));
    } catch (error) {
      console.error("Error listing appointments by doctor:", error);
      throw new Error("Failed to list appointments by doctor");
    }
  }

  // Helper function to convert a DB row to the expected Appointment shape
  private convertAppointment(row: any): Appointment {
    {/*console.log('Converting row to Appointment:', JSON.stringify(row, null, 2));*/}
    const appointment = {
      id: row.id,
      clientId: row.client_id,
      doctorId: row.doctor_id,
      serviceId: row.service_id,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      clinicId: row.clinic_id,
      notes: row.notes,
      clientName: row.client_name,
      clientEmail: row.client_email,
      clientPhone: row.client_phone
    };
    {/*console.log('Converted appointment:', JSON.stringify(appointment, null, 2));*/}
    return appointment;
  }

  // ===================
  // Payment Operations
  // ===================
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    try {
      const { rows } = await pool.query(
        `INSERT INTO payments 
           (appointment_id, amount, status, paid_at)
         VALUES 
           ($1, $2, $3, $4)
         RETURNING *`,
        [
          insertPayment.appointmentId,
          insertPayment.amount,
          insertPayment.status,
          insertPayment.paidAt,
        ]
      );
      return this.convertPayment(rows[0]);
    } catch (error) {
      console.error("Error creating payment:", error);
      throw new Error("Failed to create payment");
    }
  }

  async listPaymentsByClinic(clinicId: number): Promise<Payment[]> {
    try {
      const { rows } = await pool.query(
        `SELECT p.* 
         FROM payments p
         JOIN appointments a ON p.appointment_id = a.id
         WHERE a.clinic_id = $1
         ORDER BY p.id`,
        [clinicId]
      );
      return rows.map(row => this.convertPayment(row));
    } catch (error) {
      console.error("Error listing payments by clinic:", error);
      throw new Error("Failed to list payments by clinic");
    }
  }

  // Helper function to convert a DB row to the expected Payment shape
  private convertPayment(row: any): Payment {
    return {
      id: row.id,
      appointmentId: row.appointment_id,
      amount: row.amount,
      status: row.status,
      paidAt: row.paid_at,
    };
  }

  // ======================
  // Admin Operations
  // ======================
  async createClinicAdmin(clinicId: number, adminData: InsertUser): Promise<User> {
    try {
      // Verify the clinic exists
      const clinic = await this.getClinic(clinicId);
      if (!clinic) {
        throw new Error(`Clinic with ID ${clinicId} not found`);
      }

      // Ensure the password is in the correct format (should already be hashed)
      if (!adminData.password || !adminData.password.includes('.')) {
        console.error("Warning: Password may not be properly hashed");
      }

      // Create the admin user with clinic_id
      const userData = {
        ...adminData,
        role: "CLINIC_ADMIN",
        clinicId: clinicId
      };

      // Insert the user into the database
      const { rows } = await pool.query(
        `INSERT INTO users (
          username, password, first_name, last_name, email, phone, role, clinic_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          userData.username,
          userData.password,
          userData.firstName,
          userData.lastName,
          userData.email,
          userData.phone || null,
          userData.role,
          userData.clinicId
        ]
      );

      if (rows.length === 0) {
        throw new Error("Failed to create clinic admin");
      }

      return this.convertUser(rows[0]);
    } catch (error) {
      console.error("Error creating clinic admin:", error);
      throw new Error("Failed to create clinic admin");
    }
  }
  
  // Additional methods for clinic admin management
  async listClinicAdmins(clinicId: number): Promise<User[]> {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM users WHERE role = 'CLINIC_ADMIN' AND clinic_id = $1",
        [clinicId]
      );
      return rows.map(row => this.convertUser(row));
    } catch (error) {
      console.error("Error listing clinic admins:", error);
      throw new Error("Failed to list clinic admins");
    }
  }
  
  async deleteClinicAdmin(adminId: number): Promise<boolean> {
    try {
      const result = await pool.query(
        "DELETE FROM users WHERE id = $1 AND role = 'CLINIC_ADMIN'",
        [adminId]
      );
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting clinic admin:", error);
      throw new Error("Failed to delete clinic admin");
    }
  }

  async updateUser(userId: number, updateData: Partial<User>): Promise<User | null> {
    try {
      // Start by getting the current user to ensure it exists
      const currentUser = await this.getUser(userId);
      if (!currentUser) {
        return null;
      }

      // Build the SET clause and values array dynamically based on provided fields
      let setClause = [];
      let values = [];
      let paramIndex = 1;

      if (updateData.username !== undefined) {
        setClause.push(`username = $${paramIndex++}`);
        values.push(updateData.username);
      }
      
      if (updateData.password !== undefined) {
        setClause.push(`password = $${paramIndex++}`);
        values.push(updateData.password);
      }
      
      if (updateData.firstName !== undefined) {
        setClause.push(`first_name = $${paramIndex++}`);
        values.push(updateData.firstName);
      }
      
      if (updateData.lastName !== undefined) {
        setClause.push(`last_name = $${paramIndex++}`);
        values.push(updateData.lastName);
      }
      
      if (updateData.email !== undefined) {
        setClause.push(`email = $${paramIndex++}`);
        values.push(updateData.email);
      }
      
      if (updateData.phone !== undefined) {
        setClause.push(`phone = $${paramIndex++}`);
        values.push(updateData.phone);
      }
      
      if (updateData.role !== undefined) {
        setClause.push(`role = $${paramIndex++}`);
        values.push(updateData.role);
      }
      
      if (updateData.clinicId !== undefined) {
        setClause.push(`clinic_id = $${paramIndex++}`);
        values.push(updateData.clinicId);
      }

      // If no fields to update, return the current user
      if (setClause.length === 0) {
        return currentUser;
      }

      // Add the user ID as the last parameter
      values.push(userId);

      // Execute the update query
      const { rows } = await pool.query(
        `UPDATE users SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (rows.length === 0) {
        return null;
      }

      return this.convertUser(rows[0]);
    } catch (error) {
      console.error("Error updating user:", error);
      throw new Error("Failed to update user");
    }
  }

  async createService(serviceData: InsertService): Promise<Service> {
    const { rows } = await pool.query(
      "INSERT INTO services (name, description, price, duration, clinic_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [serviceData.name, serviceData.description, serviceData.price, serviceData.duration, serviceData.clinicId]
    );
    return rows[0];
  }

  async updateService(serviceId: number, updateData: Partial<Service>): Promise<Service> {
    const { rows } = await pool.query(
      "UPDATE services SET name = $1, description = $2, price = $3, duration = $4 WHERE id = $5 RETURNING *",
      [updateData.name, updateData.description, updateData.price, updateData.duration, serviceId]
    );
    return rows[0];
  }

  async deleteService(serviceId: number): Promise<void> {
    await pool.query("DELETE FROM services WHERE id = $1", [serviceId]);
  }

  async listDoctorsByClinic(clinicId: number): Promise<User[]> {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE clinic_id = $1 AND role = 'DOCTOR'`,
      [clinicId]
    );
    return rows.map(this.convertUser);
  }
  

  async createDoctor(doctorData: InsertUser): Promise<User> {
    const { rows } = await pool.query(
      "INSERT INTO users (username, password, first_name, last_name, email, phone, role, clinic_id) VALUES ($1, $2, $3, $4, $5, $6, 'DOCTOR', $7) RETURNING *",
      [doctorData.username, doctorData.password, doctorData.firstName, doctorData.lastName, doctorData.email, doctorData.phone, doctorData.clinicId]
    );
    return rows[0];
  }

  async updateDoctor(doctorId: number, updateData: Partial<User>): Promise<User> {
    // Build the query dynamically based on which fields are provided
    const fields = [];
    const values = [];
    let paramCounter = 1;

    if (updateData.username !== undefined) {
      fields.push(`username = $${paramCounter++}`);
      values.push(updateData.username);
    }
    
    if (updateData.password !== undefined) {
      fields.push(`password = $${paramCounter++}`);
      values.push(updateData.password);
    }
    
    if (updateData.firstName !== undefined) {
      fields.push(`first_name = $${paramCounter++}`);
      values.push(updateData.firstName);
    }
    
    if (updateData.lastName !== undefined) {
      fields.push(`last_name = $${paramCounter++}`);
      values.push(updateData.lastName);
    }
    
    if (updateData.email !== undefined) {
      fields.push(`email = $${paramCounter++}`);
      values.push(updateData.email);
    }
    
    if (updateData.phone !== undefined) {
      fields.push(`phone = $${paramCounter++}`);
      values.push(updateData.phone);
    }
    
    // Add the doctor ID to the values array
    values.push(doctorId);
    
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCounter} RETURNING *`,
      values
    );
    
    return rows[0];
  }

  async deleteDoctor(doctorId: number): Promise<void> {
    await pool.query("DELETE FROM users WHERE id = $1", [doctorId]);
  }

  async cancelAppointment(appointmentId: number): Promise<void> {
    await pool.query("UPDATE appointments SET status = 'CANCELLED' WHERE id = $1", [appointmentId]);
  }

  async calculateRevenue(clinicId: number): Promise<any> {
    // Implement your revenue calculation logic here
    // This should return data matching the Revenue interface defined above
  }

  async updateAppointment(
    appointmentId: number,
    updateData: Partial<Appointment>
  ): Promise<Appointment> {
    const query = `
      UPDATE appointments
      SET 
        client_id  = COALESCE($1, client_id),
        doctor_id  = COALESCE($2, doctor_id),
        service_id = COALESCE($3, service_id),
        start_time = COALESCE($4, start_time),
        end_time   = COALESCE($5, end_time),
        status     = COALESCE($6, status),
        clinic_id  = COALESCE($7, clinic_id)
      WHERE id = $8
      RETURNING *;
    `;
  
    const values = [
      updateData.clientId ?? null,
      updateData.doctorId ?? null,
      updateData.serviceId ?? null,
      updateData.startTime ?? null,
      updateData.endTime ?? null,
      updateData.status ?? null,
      updateData.clinicId ?? null,
      appointmentId
    ];
  
    try {
      const { rows } = await pool.query(query, values);
      if (!rows.length) {
        throw new Error("Appointment not found.");
      }
      return rows[0];
    } catch (error) {
      console.error("Error updating appointment:", error);
      throw new Error("Failed to update appointment.");
    }
  }
  

  async completeAppointment(appointmentId: number): Promise<Appointment> {
    const { rows } = await pool.query(
      "UPDATE appointments SET status = 'COMPLETED' WHERE id = $1 RETURNING *",
      [appointmentId]
    );
    return rows[0];
  }

  async getAppointment(appointmentId: number): Promise<Appointment | null> {
    const { rows } = await pool.query(
      "SELECT * FROM appointments WHERE id = $1",
      [appointmentId]
    );
    return rows[0] || null;
  }

  async getService(serviceId: number): Promise<Service | null> {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM services WHERE id = $1",
        [serviceId]
      );
      if (rows.length === 0) return null;
      return this.convertService(rows[0]);
    } catch (error) {
      console.error("Error fetching service:", error);
      throw new Error("Failed to fetch service");
    }
  }

  async checkDuplicateAppointment({ doctorId, startTime, endTime }: { 
    doctorId: number; 
    startTime: Date; 
    endTime: Date; 
  }): Promise<boolean> {
    try {
      // Ensure proper date formatting
      const formattedStartTime = startTime instanceof Date ? startTime.toISOString() : startTime;
      const formattedEndTime = endTime instanceof Date ? endTime.toISOString() : endTime;

      const { rows } = await pool.query(
        `SELECT id FROM appointments 
         WHERE doctor_id = $1 
         AND status != 'CANCELLED'
         AND (
           (start_time <= $2 AND end_time > $2)
           OR (start_time < $3 AND end_time >= $3)
           OR (start_time >= $2 AND end_time <= $3)
         )`,
        [doctorId, formattedStartTime, formattedEndTime]
      );
      return rows.length > 0;
    } catch (error) {
      console.error("Error checking duplicate appointment:", error);
      return false; // Return false on error to allow the main error handling to catch it
    }
  }

  async listAppointmentsByClinicAndDate(clinicId: number, date: Date): Promise<Appointment[]> {
    try {
      console.log('Fetching appointments for clinic ID:', clinicId, 'and date:', date);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      console.log('Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());
      
      const { rows } = await pool.query(
        `SELECT * FROM appointments 
         WHERE clinic_id = $1 
         AND start_time >= $2 
         AND start_time <= $3 
         ORDER BY start_time`,
        [clinicId, startOfDay, endOfDay]
      );
      
      console.log('Query returned', rows.length, 'appointments');
      return rows.map(row => this.convertAppointment(row));
    } catch (error) {
      console.error("Error listing appointments by date:", error);
      throw new Error("Failed to list appointments by date");
    }
  }
}

// Export a singleton instance of the PostgresStorage
export const storage = new PostgresStorage();
