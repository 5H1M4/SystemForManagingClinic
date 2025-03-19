import { pool } from "./db";
import { hashPassword } from "./utils";

async function fixPasswords() {
  try {
    // Get all users
    const { rows: users } = await pool.query("SELECT id, username, password FROM users");
    
    console.log(`Found ${users.length} users to check`);
    let fixedCount = 0;
    
    for (const user of users) {
      // Check if password is already in the correct format
      if (!user.password.includes('.')) {
        console.log(`Fixing password for user: ${user.username}`);
        
        // Hash the password (assuming the current password is plain text)
        const hashedPassword = await hashPassword(user.password);
        
        // Update the user's password
        await pool.query(
          "UPDATE users SET password = $1 WHERE id = $2",
          [hashedPassword, user.id]
        );
        
        fixedCount++;
      }
    }
    
    console.log(`Fixed ${fixedCount} user passwords`);
  } catch (error) {
    console.error("Error fixing passwords:", error);
  } finally {
    await pool.end();
  }
}

// Run the script
fixPasswords(); 