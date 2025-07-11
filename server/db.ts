import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  email: text("email"),
  name: text("name").notNull(),
  walletAddress: text("wallet_address"),
  phone: text("phone"),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent").notNull(),
  sessionId: text("session_id").notNull(),
  loginTime: timestamp("login_time").defaultNow().notNull(),
  logoutTime: timestamp("logout_time"),
});