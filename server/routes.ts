import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertWalletSchema, insertTransactionSchema, insertContactSchema } from "@shared/schema";

export async function registerRoutes(app: Express) {
  // Wallet routes
  app.get("/api/wallet/:address", async (req, res) => {
    const wallet = await storage.getWallet(req.params.address);
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    return res.json(wallet);
  });

  app.post("/api/wallet", async (req, res) => {
    const result = insertWalletSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error });
    const wallet = await storage.createWallet(result.data);
    return res.json(wallet);
  });

  // Transaction routes
  app.get("/api/transactions/:address", async (req, res) => {
    const transactions = await storage.getTransactions(req.params.address);
    return res.json(transactions);
  });

  app.post("/api/transaction", async (req, res) => {
    const result = insertTransactionSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error });

    const fromWallet = await storage.getWallet(result.data.fromAddress);
    if (!fromWallet) return res.status(404).json({ message: "Sender wallet not found" });
    if (fromWallet.balance < result.data.amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    const transaction = await storage.createTransaction(result.data);
    await storage.updateWalletBalance(
      result.data.fromAddress, 
      fromWallet.balance - result.data.amount
    );

    const toWallet = await storage.getWallet(result.data.toAddress);
    if (toWallet) {
      await storage.updateWalletBalance(
        result.data.toAddress,
        toWallet.balance + result.data.amount
      );
    }

    return res.json(transaction);
  });

  // Contact routes
  app.get("/api/contacts", async (_req, res) => {
    const contacts = await storage.getContacts();
    return res.json(contacts);
  });

  app.post("/api/contacts", async (req, res) => {
    const result = insertContactSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error });
    const contact = await storage.createContact(result.data);
    return res.json(contact);
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    await storage.deleteContact(parseInt(req.params.id));
    return res.status(204).end();
  });

  // Crypto prices endpoint
  app.get("/api/crypto-prices", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,cardano,polkadot,chainlink&order=market_cap_desc&per_page=5&page=1&sparkline=false"
    );
    
    if (!response.ok) {
      // Fallback mock data if API fails
      const mockData = [
        {
          id: "bitcoin",
          symbol: "btc",
          name: "Bitcoin",
          current_price: 43250.00,
          price_change_percentage_24h: 2.35,
          market_cap: 850000000000,
          total_volume: 25000000000
        },
        {
          id: "ethereum",
          symbol: "eth",
          name: "Ethereum",
          current_price: 2650.00,
          price_change_percentage_24h: -1.25,
          market_cap: 320000000000,
          total_volume: 15000000000
        },
        {
          id: "cardano",
          symbol: "ada",
          name: "Cardano",
          current_price: 0.48,
          price_change_percentage_24h: 0.85,
          market_cap: 17000000000,
          total_volume: 450000000
        },
        {
          id: "polkadot",
          symbol: "dot",
          name: "Polkadot",
          current_price: 7.25,
          price_change_percentage_24h: -0.65,
          market_cap: 9500000000,
          total_volume: 180000000
        },
        {
          id: "chainlink",
          symbol: "link",
          name: "Chainlink",
          current_price: 15.80,
          price_change_percentage_24h: 1.45,
          market_cap: 9200000000,
          total_volume: 420000000
        }
      ];
      return res.json(mockData);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Failed to fetch crypto prices:", error);
    
    // Return mock data as fallback
    const mockData = [
      {
        id: "bitcoin",
        symbol: "btc",
        name: "Bitcoin",
        current_price: 43250.00,
        price_change_percentage_24h: 2.35,
        market_cap: 850000000000,
        total_volume: 25000000000
      },
      {
        id: "ethereum",
        symbol: "eth",
        name: "Ethereum",
        current_price: 2650.00,
        price_change_percentage_24h: -1.25,
        market_cap: 320000000000,
        total_volume: 15000000000
      },
      {
        id: "cardano",
        symbol: "ada",
        name: "Cardano",
        current_price: 0.48,
        price_change_percentage_24h: 0.85,
        market_cap: 17000000000,
        total_volume: 450000000
      },
      {
        id: "polkadot",
        symbol: "dot",
        name: "Polkadot",
        current_price: 7.25,
        price_change_percentage_24h: -0.65,
        market_cap: 9500000000,
        total_volume: 180000000
      },
      {
        id: "chainlink",
        symbol: "link",
        name: "Chainlink",
        current_price: 15.80,
        price_change_percentage_24h: 1.45,
        market_cap: 9200000000,
        total_volume: 420000000
      }
    ];
    res.json(mockData);
  }
  });

  return createServer(app);
}
