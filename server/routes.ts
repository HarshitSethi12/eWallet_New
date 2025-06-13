import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertWalletSchema, insertTransactionSchema, insertContactSchema } from "@shared/schema";

export async function registerRoutes(app: Express) {
  // Wallet routes
  app.get("/api/wallet/primary", async (req, res) => {
    // For demo purposes, we'll create a default wallet if none exists
    const defaultAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
    let wallet = await storage.getWallet(defaultAddress);

    if (!wallet) {
      // Create a default wallet for demo
      wallet = await storage.createWallet({
        chain: "BTC",
        address: defaultAddress,
        encryptedPrivateKey: "5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ",
        lastBalance: "1000000" // 1 million satoshis for demo
      });
    }

    return res.json(wallet);
  });

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

  // AI Chat endpoint
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      
      // Create a prompt with wallet context
      const systemPrompt = `You are a helpful Bitcoin wallet assistant. You have access to the user's wallet information:
- Balance: ${context.balance} BTC
- Wallet Address: ${context.address}
- Total Transactions: ${context.totalTransactions}
- Recent Transactions: ${JSON.stringify(context.recentTransactions, null, 2)}

Answer questions about their wallet, explain Bitcoin concepts, provide transaction insights, and give helpful advice. Be friendly and informative.`;

      // For demonstration, we'll use a mock response
      // In production, you'd call OpenAI API here
      const mockResponses = [
        `Based on your wallet data, you have ${context.balance} BTC across ${context.totalTransactions} transactions. Your wallet address ${context.address} shows recent activity.`,
        "I can help you understand your Bitcoin transactions, check your balance, or explain crypto concepts. What would you like to know?",
        "Your wallet is looking good! Bitcoin is a decentralized digital currency that allows peer-to-peer transactions without intermediaries.",
        `You've made ${context.totalTransactions} transactions so far. Would you like me to analyze your spending patterns or explain any specific transaction?`
      ];

      const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];

      res.json({ response });
    } catch (error) {
      console.error('AI Chat error:', error);
      res.status(500).json({ error: 'Failed to process AI request' });
    }
  });

  // Crypto prices endpoint
  app.get("/api/crypto-prices", async (req, res) => {
    try {
      const coinIds = [
        'bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana', 'usd-coin', 'ripple', 'dogecoin', 'cardano',
        'tron', 'avalanche-2', 'shiba-inu', 'chainlink', 'bitcoin-cash', 'polkadot', 'near',
        'uniswap', 'internet-computer', 'dai', 'litecoin', 'leo-token', 'wrapped-bitcoin',
        'aptos', 'staked-ether', 'stellar'
      ];

      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true`;
      console.log('Fetching crypto prices from:', url);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BitWallet/1.0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`CoinGecko API error: ${response.status} - ${errorText}`);
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Crypto data fetched successfully:', Object.keys(data).length, 'coins');
      res.json(data);
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      res.status(500).json({ error: 'Failed to fetch crypto prices', details: error.message });
    }
  });

  return createServer(app);
}