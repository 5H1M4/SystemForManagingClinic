import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const client = new Client({
    connectionString: process.env.DATABASE_URL, // Ensure this is correctly set in your .env file
});

async function checkDB() {
    try {
        await client.connect();
        const res = await client.query('SELECT NOW()');
        console.log('Connected to DB. Current time:', res.rows[0].now);
    } catch (err) {
        console.error('DB Connection Error:', err);
    } finally {
        await client.end();
    }
}

checkDB();
