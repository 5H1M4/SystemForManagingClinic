import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * Hashes a password using scrypt with a random salt.
 * @param password - The plaintext password to hash.
 * @returns The hashed password in the format "hash.salt".
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex"); // Generate a 16-byte salt
  const buf = (await scryptAsync(password, salt, 64)) as Buffer; // Hash the password with the salt
  return `${buf.toString("hex")}.${salt}`; // Return hash.salt format
}

/**
 * Compares a supplied password with a stored hashed password.
 * @param supplied - The plaintext password to check.
 * @param stored - The stored hashed password in the format "hash.salt".
 * @returns A boolean indicating whether the passwords match.
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  // Check if stored password has the correct format
  if (!stored || !stored.includes(".")) {
    console.error("Invalid password format - missing salt separator");
    return false;
  }
  
  const [hashed, salt] = stored.split(".");
  
  // Additional validation to prevent errors
  if (!hashed || !salt) {
    console.error("Invalid password format - missing hash or salt");
    return false;
  }
  
  try {
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}
