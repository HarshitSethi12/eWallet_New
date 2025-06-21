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

  // DEX Swap Quote Endpoint
  app.post('/api/swap-quote', async (req, res) => {
    try {
      const { fromToken, toToken, amount, userAddress } = req.body;

      // Example integration with 1inch API
      const quoteResponse = await fetch(`https://api.1inch.dev/swap/v5.2/1/quote?src=${fromToken}&dst=${toToken}&amount=${amount}`, {
        headers: {
          'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
          'accept': 'application/json'
        }
      });

      if (!quoteResponse.ok) {
        throw new Error('Failed to get swap quote');
      }

      const quoteData = await quoteResponse.json();

      // Calculate our fee (0.25% of trade)
      const ourFee = 0.0025;
      const outputAmount = (parseFloat(quoteData.toTokenAmount) * (1 - ourFee)).toString();

      const quote = {
        inputAmount: amount,
        outputAmount: outputAmount,
        price: parseFloat(quoteData.toTokenAmount) / parseFloat(amount),
        priceImpact: parseFloat(quoteData.estimatedGas) / 100000, // Simplified calculation
        fee: ourFee * 100,
        originalQuote: quoteData
      };

      res.json(quote);
    } catch (error) {
      console.error('Error getting swap quote:', error);
      res.status(500).json({ error: 'Failed to get swap quote' });
    }
  });

  // DEX Swap Execution Endpoint
  app.post('/api/execute-swap', async (req, res) => {
    try {
      const { quote, userAddress } = req.body;

      // Get swap transaction data from 1inch
      const swapResponse = await fetch(`https://api.1inch.dev/swap/v5.2/1/swap`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          src: quote.originalQuote.fromToken.address,
          dst: quote.originalQuote.toToken.address,
          amount: quote.inputAmount,
          from: userAddress,
          slippage: 1, // 1% slippage tolerance
          disableEstimate: true
        })
      });

      if (!swapResponse.ok) {
        throw new Error('Failed to get swap transaction');
      }

      const swapData = await swapResponse.json();

      // Return transaction data for MetaMask to sign
      res.json({
        transactionData: {
          to: swapData.tx.to,
          data: swapData.tx.data,
          value: swapData.tx.value,
          gasPrice: swapData.tx.gasPrice,
          gas: swapData.tx.gas
        }
      });
    } catch (error) {
      console.error('Error executing swap:', error);
      res.status(500).json({ error: 'Failed to execute swap' });
    }
  });

  return createServer(app);
}