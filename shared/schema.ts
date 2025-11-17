import { pgTable, text, serial, integer, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
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
  walletAddress: text("wallet_address"),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent").notNull(),
  sessionId: text("session_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const metamaskUsers = pgTable("metamask_users", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  displayName: text("display_name").notNull(),
  ensName: text("ens_name"),
  lastLogin: timestamp("last_login").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailWallets = pgTable('email_wallets', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(), // Removed .unique() to allow multiple wallets per email
  passwordHash: text('password_hash').notNull(), // bcrypt hash for authentication
  salt: text('salt').notNull(), // Random salt for key derivation (unique per wallet)
  walletAddress: text('wallet_address').notNull(),
  chain: text('chain').notNull().default('ETH'), // Blockchain: ETH, BTC, SOL
  // SELF-CUSTODIAL: Private keys never stored on server!
  // Keys are derived client-side from password + salt using scrypt + BIP39
  createdAt: timestamp('created_at').defaultNow(),
  lastLogin: timestamp('last_login'),
}, (table) => ({
  // Unique constraint: one wallet per email per chain
  emailChainUnique: uniqueIndex('email_chain_unique_idx').on(table.email, table.chain),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true });
export const insertMetaMaskUserSchema = createInsertSchema(metamaskUsers).omit({ id: true });
export const insertEmailWalletSchema = createInsertSchema(emailWallets).pick({
  email: true,
  passwordHash: true,
  salt: true,
  walletAddress: true,
  chain: true,
});

export const selectUserSchema = z.object({
  id: z.number(),
  googleId: z.string().nullable(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  createdAt: z.date().nullable(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
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
export type EmailWallet = typeof emailWallets.$inferSelect;
export type InsertEmailWallet = z.infer<typeof insertEmailWalletSchema>;