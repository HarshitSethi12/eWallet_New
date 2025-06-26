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

  app.post('/api/swap-quote', async (req, res) => {
    const { fromToken, toToken, amount, userAddress, aggregator } = req.body;

    try {
      let quote;

      switch (aggregator) {
        case '1inch':
          quote = await get1inchQuote(fromToken, toToken, amount, userAddress);
          break;
        case 'paraswap':
          quote = await getParaswapQuote(fromToken, toToken, amount, userAddress);
          break;
        case '0x':
          quote = await get0xQuote(fromToken, toToken, amount, userAddress);
          break;
        case 'uniswap':
          quote = await getUniswapQuote(fromToken, toToken, amount, userAddress);
          break;
        default:
          // Return mock data for development
          quote = {
            inputAmount: amount,
            outputAmount: (parseFloat(amount) * 3245.67).toString(),
            price: 3245.67,
            priceImpact: 0.12,
            fee: 0.25,
            aggregator: aggregator || 'mock',
            gas: '0.003',
            route: [fromToken, toToken]
          };
      }

      res.json(quote);
    } catch (error) {
      console.error('Swap quote error:', error);
      res.status(500).json({ error: 'Failed to fetch swap quote', details: error.message });
    }
  });
  return createServer(app);
}

async function get1inchQuote(fromToken: string, toToken: string, amount: string, userAddress: string) {
  // Implement 1inch quote logic here
  console.log("calling 1inch quote")
  return {
    inputAmount: amount,
    outputAmount: (parseFloat(amount) * 3245.67).toString(),
    price: 3245.67,
    priceImpact: 0.12,
    fee: 0.25,
    aggregator: '1inch',
    gas: '0.003',
    route: [fromToken, toToken]
  };
}

async function getParaswapQuote(fromToken: string, toToken: string, amount: string, userAddress: string) {
  // Implement Paraswap quote logic here
  console.log("calling paraswap quote")
  return {
    inputAmount: amount,
    outputAmount: (parseFloat(amount) * 3244.12).toString(),
    price: 3244.12,
    priceImpact: 0.15,
    fee: 0.30,
    aggregator: 'paraswap',
    gas: '0.004',
    route: [fromToken, toToken]
  };
}

async function get0xQuote(fromToken: string, toToken: string, amount: string, userAddress: string) {
  // Implement 0x quote logic here
  console.log("calling 0x quote")
  return {
    inputAmount: amount,
    outputAmount: (parseFloat(amount) * 3243.89).toString(),
    price: 3243.89,
    priceImpact: 0.10,
    fee: 0.20,
    aggregator: '0x',
    gas: '0.003',
    route: [fromToken, toToken]
  };
}

async function getUniswapQuote(fromToken: string, toToken: string, amount: string, userAddress: string) {
  // Implement Uniswap quote logic here
  console.log("calling uniswap quote")
  return {
    inputAmount: amount,
    outputAmount: (parseFloat(amount) * 3241.23).toString(),
    price: 3241.23,
    priceImpact: 0.18,
    fee: 0.35,
    aggregator: 'uniswap',
    gas: '0.005',
    route: [fromToken, toToken]
  };
}