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

  // Crypto prices endpoint
  app.get("/api/crypto-prices", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=25&page=1&sparkline=false"
    );

    if (!response.ok) {
      // Fallback mock data for top 25 coins if API fails
      // Return mock data for top 25 coins as fallback with correct CoinGecko IDs
    const mockData = [
      { id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 43250.00, price_change_percentage_24h: 2.35, market_cap: 850000000000, total_volume: 25000000000 },
      { id: "ethereum", symbol: "eth", name: "Ethereum", current_price: 2650.00, price_change_percentage_24h: -1.25, market_cap: 320000000000, total_volume: 15000000000 },
      { id: "tether", symbol: "usdt", name: "Tether", current_price: 1.00, price_change_percentage_24h: 0.05, market_cap: 95000000000, total_volume: 45000000000 },
      { id: "binancecoin", symbol: "bnb", name: "BNB", current_price: 310.50, price_change_percentage_24h: 1.85, market_cap: 47000000000, total_volume: 1200000000 },
      { id: "solana", symbol: "sol", name: "Solana", current_price: 98.75, price_change_percentage_24h: 3.25, market_cap: 45000000000, total_volume: 2800000000 },
      { id: "usd-coin", symbol: "usdc", name: "USDC", current_price: 1.00, price_change_percentage_24h: -0.02, market_cap: 42000000000, total_volume: 8500000000 },
      { id: "ripple", symbol: "xrp", name: "XRP", current_price: 0.63, price_change_percentage_24h: -0.45, market_cap: 36000000000, total_volume: 1100000000 },
      { id: "dogecoin", symbol: "doge", name: "Dogecoin", current_price: 0.082, price_change_percentage_24h: 4.15, market_cap: 12000000000, total_volume: 890000000 },
      { id: "cardano", symbol: "ada", name: "Cardano", current_price: 0.48, price_change_percentage_24h: 0.85, market_cap: 17000000000, total_volume: 450000000 },
      { id: "avalanche-2", symbol: "avax", name: "Avalanche", current_price: 36.80, price_change_percentage_24h: 2.95, market_cap: 15000000000, total_volume: 650000000 },
      { id: "shiba-inu", symbol: "shib", name: "Shiba Inu", current_price: 0.00002455, price_change_percentage_24h: 5.25, market_cap: 14000000000, total_volume: 680000000 },
      { id: "chainlink", symbol: "link", name: "Chainlink", current_price: 15.80, price_change_percentage_24h: 1.45, market_cap: 9200000000, total_volume: 420000000 },
      { id: "polkadot", symbol: "dot", name: "Polkadot", current_price: 7.25, price_change_percentage_24h: -0.65, market_cap: 9500000000, total_volume: 180000000 },
      { id: "bitcoin-cash", symbol: "bch", name: "Bitcoin Cash", current_price: 485.50, price_change_percentage_24h: 1.95, market_cap: 9600000000, total_volume: 280000000 },
      { id: "polygon", symbol: "matic", name: "Polygon", current_price: 0.92, price_change_percentage_24h: -1.15, market_cap: 9200000000, total_volume: 420000000 },
      { id: "litecoin", symbol: "ltc", name: "Litecoin", current_price: 72.50, price_change_percentage_24h: 1.85, market_cap: 5400000000, total_volume: 380000000 },
      { id: "near", symbol: "near", name: "NEAR Protocol", current_price: 5.40, price_change_percentage_24h: 3.85, market_cap: 5100000000, total_volume: 290000000 },
      { id: "uniswap", symbol: "uni", name: "Uniswap", current_price: 8.90, price_change_percentage_24h: -2.15, market_cap: 5300000000, total_volume: 210000000 },
      { id: "internet-computer", symbol: "icp", name: "Internet Computer", current_price: 12.80, price_change_percentage_24h: 2.45, market_cap: 5900000000, total_volume: 120000000 },
      { id: "ethereum-classic", symbol: "etc", name: "Ethereum Classic", current_price: 26.40, price_change_percentage_24h: -0.85, market_cap: 3900000000, total_volume: 190000000 },
      { id: "stellar", symbol: "xlm", name: "Stellar", current_price: 0.12, price_change_percentage_24h: 1.95, market_cap: 3600000000, total_volume: 85000000 },
      { id: "filecoin", symbol: "fil", name: "Filecoin", current_price: 5.80, price_change_percentage_24h: 1.35, market_cap: 3200000000, total_volume: 150000000 },
      { id: "cosmos", symbol: "atom", name: "Cosmos Hub", current_price: 8.90, price_change_percentage_24h: -1.45, market_cap: 3500000000, total_volume: 125000000 },
      { id: "monero", symbol: "xmr", name: "Monero", current_price: 158.50, price_change_percentage_24h: 0.95, market_cap: 2900000000, total_volume: 85000000 },
      { id: "hedera-hashgraph", symbol: "hbar", name: "Hedera", current_price: 0.08, price_change_percentage_24h: 3.25, market_cap: 2900000000, total_volume: 95000000 }
    ];
      return res.json(mockData);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Failed to fetch crypto prices:", error);

    // Return mock data for top 25 coins as fallback
    // Return mock data for top 25 coins as fallback with correct CoinGecko IDs
    const mockData = [
      { id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 43250.00, price_change_percentage_24h: 2.35, market_cap: 850000000000, total_volume: 25000000000 },
      { id: "ethereum", symbol: "eth", name: "Ethereum", current_price: 2650.00, price_change_percentage_24h: -1.25, market_cap: 320000000000, total_volume: 15000000000 },
      { id: "tether", symbol: "usdt", name: "Tether", current_price: 1.00, price_change_percentage_24h: 0.05, market_cap: 95000000000, total_volume: 45000000000 },
      { id: "binancecoin", symbol: "bnb", name: "BNB", current_price: 310.50, price_change_percentage_24h: 1.85, market_cap: 47000000000, total_volume: 1200000000 },
      { id: "solana", symbol: "sol", name: "Solana", current_price: 98.75, price_change_percentage_24h: 3.25, market_cap: 45000000000, total_volume: 2800000000 },
      { id: "usd-coin", symbol: "usdc", name: "USDC", current_price: 1.00, price_change_percentage_24h: -0.02, market_cap: 42000000000, total_volume: 8500000000 },
      { id: "ripple", symbol: "xrp", name: "XRP", current_price: 0.63, price_change_percentage_24h: -0.45, market_cap: 36000000000, total_volume: 1100000000 },
      { id: "dogecoin", symbol: "doge", name: "Dogecoin", current_price: 0.082, price_change_percentage_24h: 4.15, market_cap: 12000000000, total_volume: 890000000 },
      { id: "cardano", symbol: "ada", name: "Cardano", current_price: 0.48, price_change_percentage_24h: 0.85, market_cap: 17000000000, total_volume: 450000000 },
      { id: "avalanche-2", symbol: "avax", name: "Avalanche", current_price: 36.80, price_change_percentage_24h: 2.95, market_cap: 15000000000, total_volume: 650000000 },
      { id: "shiba-inu", symbol: "shib", name: "Shiba Inu", current_price: 0.00002455, price_change_percentage_24h: 5.25, market_cap: 14000000000, total_volume: 680000000 },
      { id: "chainlink", symbol: "link", name: "Chainlink", current_price: 15.80, price_change_percentage_24h: 1.45, market_cap: 9200000000, total_volume: 420000000 },
      { id: "polkadot", symbol: "dot", name: "Polkadot", current_price: 7.25, price_change_percentage_24h: -0.65, market_cap: 9500000000, total_volume: 180000000 },
      { id: "bitcoin-cash", symbol: "bch", name: "Bitcoin Cash", current_price: 485.50, price_change_percentage_24h: 1.95, market_cap: 9600000000, total_volume: 280000000 },
      { id: "polygon", symbol: "matic", name: "Polygon", current_price: 0.92, price_change_percentage_24h: -1.15, market_cap: 9200000000, total_volume: 420000000 },
      { id: "litecoin", symbol: "ltc", name: "Litecoin", current_price: 72.50, price_change_percentage_24h: 1.85, market_cap: 5400000000, total_volume: 380000000 },
      { id: "near", symbol: "near", name: "NEAR Protocol", current_price: 5.40, price_change_percentage_24h: 3.85, market_cap: 5100000000, total_volume: 290000000 },
      { id: "uniswap", symbol: "uni", name: "Uniswap", current_price: 8.90, price_change_percentage_24h: -2.15, market_cap: 5300000000, total_volume: 210000000 },
      { id: "internet-computer", symbol: "icp", name: "Internet Computer", current_price: 12.80, price_change_percentage_24h: 2.45, market_cap: 5900000000, total_volume: 120000000 },
      { id: "ethereum-classic", symbol: "etc", name: "Ethereum Classic", current_price: 26.40, price_change_percentage_24h: -0.85, market_cap: 3900000000, total_volume: 190000000 },
      { id: "stellar", symbol: "xlm", name: "Stellar", current_price: 0.12, price_change_percentage_24h: 1.95, market_cap: 3600000000, total_volume: 85000000 },
      { id: "filecoin", symbol: "fil", name: "Filecoin", current_price: 5.80, price_change_percentage_24h: 1.35, market_cap: 3200000000, total_volume: 150000000 },
      { id: "cosmos", symbol: "atom", name: "Cosmos Hub", current_price: 8.90, price_change_percentage_24h: -1.45, market_cap: 3500000000, total_volume: 125000000 },
      { id: "monero", symbol: "xmr", name: "Monero", current_price: 158.50, price_change_percentage_24h: 0.95, market_cap: 2900000000, total_volume: 85000000 },
      { id: "hedera-hashgraph", symbol: "hbar", name: "Hedera", current_price: 0.08, price_change_percentage_24h: 3.25, market_cap: 2900000000, total_volume: 95000000 }
    ];
    res.json(mockData);
  }
  });

  return createServer(app);
}