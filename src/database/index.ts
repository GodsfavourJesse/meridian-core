import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "../config/env";

const pool = new Pool({
    connectionString: env.DATABASE_URL,
});

export const db = drizzle({
    client: pool,
});

export async function checkDatabaseConnection() {
    await pool.query("SELECT 1");
}

export async function closeDatabaseConnection() {
    await pool.end();
}