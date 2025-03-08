import { type Wallet, type InsertWallet, type Transaction, type InsertTransaction, type Contact, type InsertContact } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private wallets: Map<string, Wallet>;
  private transactions: Map<number, Transaction>;
  private contacts: Map<number, Contact>;
  private currentIds: { transaction: number; contact: number };

  constructor() {
    this.wallets = new Map();
    this.transactions = new Map();
    this.contacts = new Map();
    this.currentIds = { transaction: 1, contact: 1 };
  }

  async getWallet(address: string): Promise<Wallet | undefined> {
    return this.wallets.get(address);
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const newWallet: Wallet = {
      ...wallet,
      id: this.wallets.size + 1,
      balance: wallet.balance || 0,
    };
    this.wallets.set(wallet.address, newWallet);
    return newWallet;
  }

  async updateWalletBalance(address: string, balance: number): Promise<Wallet> {
    const wallet = await this.getWallet(address);
    if (!wallet) throw new Error("Wallet not found");

    const updatedWallet = { ...wallet, balance };
    this.wallets.set(address, updatedWallet);
    return updatedWallet;
  }

  async getTransactions(address: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      tx => tx.fromAddress === address || tx.toAddress === address
    );
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentIds.transaction++;
    const newTransaction: Transaction = {
      ...transaction,
      id,
      timestamp: transaction.timestamp || new Date(),
      confirmed: transaction.confirmed || false,
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async confirmTransaction(id: number): Promise<Transaction> {
    const transaction = this.transactions.get(id);
    if (!transaction) throw new Error("Transaction not found");

    const confirmedTransaction = { ...transaction, confirmed: true };
    this.transactions.set(id, confirmedTransaction);
    return confirmedTransaction;
  }

  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const id = this.currentIds.contact++;
    const newContact = { ...contact, id };
    this.contacts.set(id, newContact);
    return newContact;
  }

  async deleteContact(id: number): Promise<void> {
    this.contacts.delete(id);
  }
}

export const storage = new MemStorage();