import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  googleId: text("google_id").unique(),
  email: text("email").unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  chain: text("chain").notNull(), // 'BTC' or 'ETH'
  address: text("address").notNull(),
  encryptedPrivateKey: text("encrypted_private_key").notNull(),
  lastBalance: text("last_balance").default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  amount: integer("amount").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  confirmed: boolean("confirmed").notNull().default(false),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull().unique(),
});

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  email: text("email"),
  name: text("name").notNull(),
  phone: text("phone"),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent").notNull(),
  sessionId: text("session_id").notNull(),
  loginTime: timestamp("login_time").defaultNow(),
  logoutTime: timestamp("logout_time"),
  duration: integer("duration"), // duration in minutes
});

export const metamaskUsers = pgTable("metamask_users", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  displayName: text("display_name").notNull(),
  ensName: text("ens_name"),
  lastLogin: timestamp("last_login").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true });
export const insertMetaMaskUserSchema = createInsertSchema(metamaskUsers).omit({ id: true });

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type MetaMaskUser = typeof metamaskUsers.$inferSelect;
export type InsertMetaMaskUser = z.infer<typeof insertMetaMaskUserSchema>;