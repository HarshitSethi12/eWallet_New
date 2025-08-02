import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertWalletSchema, insertTransactionSchema, insertContactSchema } from "@shared/schema";
import { ethers } from "ethers";

export async function registerRoutes(app: Express) {
  // MetaMask Authentication
  app.post('/api/auth/metamask', async (req, res) => {
    console.log('🔵 MetaMask auth endpoint hit');

    try {
      console.log('🔵 MetaMask auth request received:', req.body);
      console.log('🔵 Session before auth:', req.session);

      const { address, message, signature } = req.body;

      if (!address || !message || !signature) {
        console.log('❌ Missing required fields:', { address: !!address, message: !!message, signature: !!signature });
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Basic signature verification (in production, you'd want proper signature verification)
      if (!signature.startsWith('0x') || signature.length !== 132) {
        console.log('❌ Invalid signature format');
        return res.status(400).json({ error: 'Invalid signature format' });
      }

      console.log('🔵 Processing MetaMask auth for address:', address);

      // Ensure session exists
      if (!req.session) {
        console.error('❌ No session available');
        return res.status(500).json({ error: 'Session not available' });
      }

      // Store user in session
      const userData = {
        id: `metamask_${address}`,
        walletAddress: address,
        address: address, // Add both for compatibility
        provider: 'metamask',
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        picture: null
      };

      req.session.user = userData;
      req.session.isAuthenticated = true;

      // Track login session in database
      const sessionData = {
        userId: null,
        email: null,
        name: userData.name,
        walletAddress: address,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        sessionId: req.sessionID,
      };

      console.log('Creating MetaMask session with data:', sessionData);

      try {
        const sessionDbId = await storage.createUserSession(sessionData);
        console.log('MetaMask session created with ID:', sessionDbId);
        req.session.sessionDbId = sessionDbId;
      } catch (dbError) {
        console.warn('Warning: Could not create database session:', dbError);
        // Continue without database session tracking
      }

      console.log('✅ MetaMask session created for:', address);
      console.log('🔵 Session after auth:', req.session);

      // Ensure we're sending JSON response
      res.setHeader('Content-Type', 'application/json');
      res.json(userData);
    } catch (error) {
      console.error('❌ MetaMask auth error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Authentication failed', details: error.message });
    }
  });

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

  // Gemini AI Chat endpoint
  app.post('/api/ai/gemini-chat', async (req, res) => {
    try {
      const { message, context } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
      }

      // Build context prompt for Gemini
      const systemPrompt = `You are BitWallet AI Assistant. Here's the user's current data:
${context.wallet ? `Wallet: ${context.wallet.address} with balance ${context.wallet.lastBalance}` : 'No wallet data'}
${context.transactions ? `Recent transactions: ${context.transactions.length} transactions` : 'No transactions'}
Current crypto prices: ${context.cryptoPrices?.map(c => `${c.symbol}: $${c.price}`).join(', ') || 'No price data'}

Provide helpful, personalized responses about their BitWallet account and crypto.`;

      // Call Gemini API
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser: ${message}`
            }]
          }]
        })
      });

      if (!geminiResponse.ok) {
        throw new Error(`Gemini API error: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process your request.';

      res.json({ response: aiResponse });
    } catch (error) {
      console.error('Gemini API error:', error);
      res.status(500).json({ error: 'AI service temporarily unavailable' });
    }
  });

  // Gemini health check endpoint
  app.get('/api/ai/gemini-health', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          status: 'error',
          message: 'Gemini API key not configured' 
        });
      }

      // Test Gemini API with a simple request
      const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Say 'Hello from BitWallet!' in one sentence."
            }]
          }]
        })
      });

      if (testResponse.ok) {
        const data = await testResponse.json();
        res.json({ 
          status: 'healthy',
          message: 'Gemini API is working',
          response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Test successful'
        });
      } else {
        res.status(500).json({ 
          status: 'error',
          message: `Gemini API returned status ${testResponse.status}` 
        });
      }
    } catch (error) {
      res.status(500).json({ 
        status: 'error',
        message: 'Failed to connect to Gemini API',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  return createServer(app);
}