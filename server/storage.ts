import { 
  type Wallet, 
  type InsertWallet, 
  type Transaction, 
  type InsertTransaction, 
  type Contact, 
  type InsertContact,
  wallets,
  transactions,
  contacts
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { wallets, transactions, contacts, userSessions } from "@shared/schema";
import type { Wallet, InsertWallet, Transaction, InsertTransaction, Contact, InsertContact } from "@shared/schema";

export interface IStorage {
  // Wallet operations
  getWallet(address: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletBalance(address: string, balance: number): Promise<Wallet>;

  // Transaction operations
  getTransactions(address: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  confirmTransaction(id: number): Promise<Transaction>;

  // Contact operations
  getContacts(): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  deleteContact(id: number): Promise<void>;

  // Session operations
  createUserSession(sessionData: {
    userId?: number | null;
    email: string;
    name: string;
    ipAddress: string;
    userAgent: string;
    sessionId: string;
  }): Promise<number>;
  endUserSession(sessionId: number): Promise<void>;
  getAllUserSessions(): Promise<any[]>;
  getUserSessionsByEmail(email: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getWallet(address: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.address, address));
    return wallet || undefined;
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const [newWallet] = await db
      .insert(wallets)
      .values(wallet)
      .returning();
    return newWallet;
  }

  async updateWalletBalance(address: string, balance: number): Promise<Wallet> {
    const [updatedWallet] = await db
      .update(wallets)
      .set({ lastBalance: balance.toString(), updatedAt: new Date() })
      .where(eq(wallets.address, address))
      .returning();
    if (!updatedWallet) {
      throw new Error(`Wallet not found: ${address}`);
    }
    return updatedWallet;
  }

  async getTransactions(address: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.fromAddress, address))
      .orderBy(transactions.timestamp);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        ...transaction,
        timestamp: new Date(),
        confirmed: false
      })
      .returning();
    return newTransaction;
  }

  async confirmTransaction(id: number): Promise<Transaction> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set({ confirmed: true })
      .where(eq(transactions.id, id))
      .returning();
    if (!updatedTransaction) {
      throw new Error(`Transaction not found: ${id}`);
    }
    return updatedTransaction;
  }

  async getContacts(): Promise<Contact[]> {
    return await db.select().from(contacts).orderBy(contacts.name);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db
      .insert(contacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  async createUserSession(sessionData: {
    userId?: number | null;
    email: string;
    name: string;
    ipAddress: string;
    userAgent: string;
    sessionId: string;
  }): Promise<number> {
    const result = await db.insert(userSessions).values({
      ...sessionData,
      loginTime: new Date(),
    }).returning();
    return result[0].id;
  }

  async endUserSession(sessionId: number): Promise<void> {
    const session = await db.select().from(userSessions).where(eq(userSessions.id, sessionId));
    if (session[0]) {
      const loginTime = new Date(session[0].loginTime);
      const logoutTime = new Date();
      const duration = Math.floor((logoutTime.getTime() - loginTime.getTime()) / (1000 * 60)); // duration in minutes

      await db.update(userSessions)
        .set({ 
          logoutTime,
          duration 
        })
        .where(eq(userSessions.id, sessionId));
    }
  }

  async getAllUserSessions(): Promise<any[]> {
    return await db.select().from(userSessions).orderBy(desc(userSessions.loginTime));
  }

  async getUserSessionsByEmail(email: string): Promise<any[]> {
    return await db.select().from(userSessions)
      .where(eq(userSessions.email, email))
      .orderBy(desc(userSessions.loginTime));
  }
}

export const storage = new DatabaseStorage();