import express from "express";
import { eq, and, or } from "drizzle-orm";
import { db } from "./db";
import { users, wallets, transactions, selectUserSchema } from "@shared/schema";
import type { User } from "@shared/schema";
import { BlockchainService } from "./blockchain";
import fetch from 'node-fetch';
import crypto from 'crypto'; // Import crypto for encryption/decryption

// Authentication middleware
const authenticateUser = (req: any, res: any, next: any) => {
  try {
    // Check if session exists and has user
    if (req.session && req.session.user) {
      // Add user to request object for use in route handlers
      req.user = { id: req.session.user.id || req.session.user.sub };
      next();
    } else {
      // User is not authenticated
      return res.status(401).json({ error: 'Authentication required' });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// ===== ROUTER SETUP =====
const router = express.Router();

// ===== HELPER FUNCTIONS =====

// Function to encrypt sensitive data (like private keys) before storing in database
function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';                  // Encryption algorithm
  const key = process.env.ENCRYPTION_KEY || 'fallback-key-32-chars-long!!!!';  // Encryption key from environment
  const iv = crypto.randomBytes(16);               // Initialization vector for encryption
  const cipher = crypto.createCipher(algorithm, key);  // Create cipher
  let encrypted = cipher.update(text, 'utf8', 'hex');  // Encrypt the text
  encrypted += cipher.final('hex');                // Finalize encryption
  return iv.toString('hex') + ':' + encrypted;     // Return IV and encrypted text
}

// Function to decrypt sensitive data when retrieving from database
function decrypt(text: string): string {
  const algorithm = 'aes-256-cbc';                  // Same algorithm used for encryption
  const key = process.env.ENCRYPTION_KEY || 'fallback-key-32-chars-long!!!!';  // Same key used for encryption
  const textParts = text.split(':');               // Split IV and encrypted text
  const iv = Buffer.from(textParts.shift()!, 'hex');  // Extract IV
  const encryptedText = textParts.join(':');       // Get encrypted text
  const decipher = crypto.createDecipher(algorithm, key);  // Create decipher
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');  // Decrypt the text
  decrypted += decipher.final('utf8');             // Finalize decryption
  return decrypted;                                // Return decrypted text
}

// Token configuration with proper addresses
const tokenConfig = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native ETH
    decimals: 18,
    balance: '2.5',
    logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', // LINK token
    decimals: 18,
    balance: '150',
    logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png'
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI token
    decimals: 18,
    balance: '75',
    logoURI: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png'
  }
];

// USDC address (destination for price quotes)
const USDC_ADDRESS = '0xA0b86991c951449b402c7C27D170c54E0F13A8BfD';

// Fallback price function using CoinGecko
async function getCoinGeckoPrice(symbol: string): Promise<number | null> {
  try {
    const coinGeckoIds = {
      'ETH': 'ethereum',
      'LINK': 'chainlink',
      'UNI': 'uniswap'
    };

    const coinId = coinGeckoIds[symbol];
    if (!coinId) return null;

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BitWallet/1.0'
        },
        timeout: 10000
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data[coinId]?.usd || null;
    }
  } catch (error) {
    console.error(`CoinGecko error for ${symbol}:`, error.message);
  }
  return null;
}

// Enhanced 1inch price fetching with better error handling
async function get1inchPrice(token: any): Promise<{ price: number; change24h: number } | null> {
  const oneInchApiKey = process.env.ONEINCH_API_KEY;
  if (!oneInchApiKey) {
    console.log('⚠️ 1inch API key not configured');
    return null;
  }

  try {
    // Use 1 token as amount (in smallest unit)
    const amount = '1000000000000000000'; // 1 ETH/LINK/UNI in wei

    const url = `https://api.1inch.dev/swap/v6.0/1/quote?src=${token.address}&dst=${USDC_ADDRESS}&amount=${amount}`;

    console.log(`🔍 Fetching 1inch price for ${token.symbol}`);
    console.log(`🔗 URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${oneInchApiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'BitWallet/1.0'
      },
      timeout: 15000
    });

    console.log(`📊 ${token.symbol} response status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();

      if (data.dstAmount) {
        // Convert USDC amount (6 decimals) to price
        const price = parseFloat(data.dstAmount) / 1000000;
        console.log(`✅ ${token.symbol} 1inch price: $${price.toFixed(2)}`);

        return {
          price: price,
          change24h: Math.random() * 6 - 3 // Random change for demo
        };
      } else {
        console.warn(`⚠️ No dstAmount in 1inch response for ${token.symbol}`);
        return null;
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ 1inch API error for ${token.symbol}: ${response.status} - ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ 1inch request failed for ${token.symbol}:`, error.message);
    return null;
  }
}

// ===== CRYPTOCURRENCY PRICE API ENDPOINTS =====

// GET /api/tokens - Get token prices from 1inch with CoinGecko fallback
router.get("/api/tokens", async (req, res) => {
  console.log('🎯 Token prices endpoint called');

  const results = [];
  let successfulRequests = 0;
  const apiErrors = [];
  let dataSource = 'fallback';

  // Add USDC as baseline
  results.push({
    symbol: 'USDC',
    name: 'USD Coin',
    price: 1.00,
    change24h: 0,
    balance: '1000',
    balanceUSD: 1000,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png'
  });

  // Try to get real prices for each token
  for (const token of tokenConfig) {
    console.log(`\n💫 Processing ${token.symbol}...`);

    let priceData = null;
    let usedSource = 'fallback';

    // First try 1inch
    priceData = await get1inchPrice(token);
    if (priceData) {
      usedSource = '1inch';
      successfulRequests++;
    } else {
      // Fallback to CoinGecko
      console.log(`🔄 Trying CoinGecko for ${token.symbol}...`);
      const coinGeckoPrice = await getCoinGeckoPrice(token.symbol);
      if (coinGeckoPrice) {
        priceData = {
          price: coinGeckoPrice,
          change24h: Math.random() * 6 - 3
        };
        usedSource = 'coingecko';
        successfulRequests++;
      }
    }

    // Use the price data or fallback to mock prices
    const fallbackPrices = { ETH: 3650.25, LINK: 22.45, UNI: 9.87 };
    const finalPrice = priceData?.price || fallbackPrices[token.symbol] || 0;
    const finalChange = priceData?.change24h || (Math.random() * 6 - 3);

    const balanceUSD = finalPrice * parseFloat(token.balance);

    results.push({
      symbol: token.symbol,
      name: token.name,
      price: parseFloat(finalPrice.toFixed(2)),
      change24h: parseFloat(finalChange.toFixed(8)),
      balance: token.balance,
      balanceUSD: parseFloat(balanceUSD.toFixed(2)),
      logoURI: token.logoURI
    });

    console.log(`📈 ${token.symbol}: $${finalPrice.toFixed(2)} (${usedSource})`);

    // If we got at least one real price, update data source
    if (priceData && dataSource === 'fallback') {
      dataSource = usedSource;
    }

    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 Final Results:`);
  console.log(`   Successful requests: ${successfulRequests}/${tokenConfig.length}`);
  console.log(`   Data source: ${dataSource}`);

  return res.json({
    tokens: results,
    source: dataSource,
    timestamp: new Date().toISOString(),
    debug: {
      apiKeyConfigured: !!process.env.ONEINCH_API_KEY,
      tokensRequested: tokenConfig.length,
      tokensReturned: results.length,
      successfulRequests: successfulRequests,
      realPricesFound: successfulRequests,
      apiErrors: apiErrors
    }
  });
});

// GET /api/crypto-prices - Separate endpoint for market overview
router.get("/api/crypto-prices", async (req, res) => {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin,solana,usd-coin,ripple,dogecoin,cardano,avalanche-2,shiba-inu,chainlink,polkadot,bitcoin-cash,polygon,litecoin,near,uniswap,internet-computer,ethereum-classic,stellar,filecoin,cosmos,monero,hedera-hashgraph,tron,staked-ether,wrapped-bitcoin,sui,wrapped-steth,leo-token,the-open-network,usds&vs_currencies=usd&include_24hr_change=true',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BitWallet/1.0'
        },
        timeout: 10000
      }
    );

    if (response.ok) {
      const data = await response.json();
      return res.json(data);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('CoinGecko API error:', error);

    // Return fallback data
    const fallbackData = {
      bitcoin: { usd: 43250.50, usd_24h_change: 2.34 },
      ethereum: { usd: 3650.25, usd_24h_change: 1.45 },
      tether: { usd: 1.00, usd_24h_change: 0.01 },
      binancecoin: { usd: 305.20, usd_24h_change: 0.87 },
      solana: { usd: 95.40, usd_24h_change: 3.21 },
      'usd-coin': { usd: 1.00, usd_24h_change: 0.00 },
      ripple: { usd: 0.52, usd_24h_change: 1.92 },
      dogecoin: { usd: 0.08, usd_24h_change: 2.15 },
      cardano: { usd: 0.42, usd_24h_change: 1.67 },
      chainlink: { usd: 22.45, usd_24h_change: 2.08 },
      polkadot: { usd: 7.25, usd_24h_change: 1.34 },
      litecoin: { usd: 85.30, usd_24h_change: 0.95 }
    };

    return res.json(fallbackData);
  }
});

// Debug endpoint for testing 1inch API
router.get("/api/debug/1inch", async (req, res) => {
  const oneInchApiKey = process.env.ONEINCH_API_KEY;
  const diagnostics = {
    apiKeyConfigured: !!oneInchApiKey,
    apiKeyLength: oneInchApiKey?.length || 0,
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  };

  if (!oneInchApiKey) {
    return res.json({
      status: 'error',
      message: '1inch API key not found in environment variables',
      diagnostics,
      recommendation: 'Please add ONEINCH_API_KEY to your Replit secrets'
    });
  }

  const tests = [
    {
      name: 'ETH to USDC Quote',
      src: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      dst: '0xA0b86991c951449b402c7C27D170c54E0F13A8BfD',
      amount: '1000000000000000000',
      expectedSymbol: 'ETH'
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`🧪 Testing: ${test.name}`);

    const testUrl = `https://api.1inch.dev/swap/v6.0/1/quote?src=${test.src}&dst=${test.dst}&amount=${test.amount}`;

    const testResult = {
      name: test.name,
      url: testUrl,
      success: false,
      status: null,
      price: null,
      error: null,
      responseTime: 0
    };

    const startTime = Date.now();

    try {
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${oneInchApiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'BitWallet/1.0'
        },
        timeout: 15000
      });

      testResult.responseTime = Date.now() - startTime;
      testResult.status = response.status;

      if (response.ok) {
        const data = await response.json();

        if (data.dstAmount) {
          const price = parseFloat(data.dstAmount) / 1000000;
          testResult.success = true;
          testResult.price = price;
          console.log(`✅ ${test.name}: $${price.toFixed(2)}`);
        } else {
          testResult.error = 'No dstAmount in response';
          console.log(`⚠️ ${test.name}: No dstAmount`);
        }
      } else {
        const errorText = await response.text();
        testResult.error = errorText;
        console.log(`❌ ${test.name}: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      testResult.responseTime = Date.now() - startTime;
      testResult.error = error.message;
      console.log(`💥 ${test.name}: ${error.message}`);
    }

    results.push(testResult);
  }

  const successfulTests = results.filter(r => r.success).length;
  const status = successfulTests > 0 ? 'success' : 'error';

  return res.json({
    status,
    message: `${successfulTests}/${results.length} tests passed`,
    diagnostics,
    tests: results,
    recommendation: status === 'error'
      ? 'Check API key validity and network connectivity'
      : 'API is working correctly'
  });
});

// ===== WALLET MANAGEMENT ENDPOINTS =====

// GET /api/wallets - Get all wallets for the authenticated user
router.get("/api/wallets", authenticateUser, async (req, res) => {
  try {
    const userWallets = await db.select().from(wallets).where(eq(wallets.userId, req.user!.id));
    res.json(userWallets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/wallets - Create a new wallet for the authenticated user
router.post("/api/wallets", authenticateUser, async (req, res) => {
  try {
    const { type } = req.body;
    let walletData;

    if (type === 'BTC') {
      // Assuming BlockchainService has a createBitcoinWallet method
      walletData = await BlockchainService.createBitcoinWallet();
    } else if (type === 'ETH') {
      // Assuming BlockchainService has a createEthereumWallet method
      walletData = await BlockchainService.createEthereumWallet();
    } else {
      return res.status(400).json({ message: "Unsupported wallet type" });
    }

    // Encrypt the private key before storing
    const encryptedPrivateKey = encrypt(walletData.privateKey);

    const [wallet] = await db.insert(wallets).values({
      userId: req.user!.id,
      address: walletData.address,
      privateKey: encryptedPrivateKey, // Store encrypted private key
      type: type,
      balance: "0"
    }).returning();

    // Return wallet details without the private key
    res.json({
      id: wallet.id,
      userId: wallet.userId,
      address: wallet.address,
      type: wallet.type,
      balance: wallet.balance,
      createdAt: wallet.createdAt
    });
  } catch (error: any) {
    console.error('Error creating wallet:', error);
    res.status(500).json({ message: 'Failed to create wallet', error: error.message });
  }
});

// ===== TRANSACTION MANAGEMENT ENDPOINTS =====

// GET /api/transactions - Get all transactions for the authenticated user
router.get("/api/transactions", authenticateUser, async (req, res) => {
  try {
    const userTransactions = await db.select().from(transactions).where(eq(transactions.userId, req.user!.id));
    res.json(userTransactions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ===== AUTHENTICATION ENDPOINTS =====

// POST /api/register - Register a new user
router.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required" });
    }
    
    // Check if username or email already exists
    const existingUser = await db.select()
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)));

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Username or email already exists" });
    }

    const [user] = await db.insert(users).values({ username, email, password }).returning();
    res.status(201).json({ message: "User registered successfully", user: { id: user.id, username: user.username, email: user.email } });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(400).json({ message: error.message });
  }
});

// POST /api/login - Log in a user
router.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const [user] = await db.select()
      .from(users)
      .where(eq(users.username, username));

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Regenerate session to prevent fixation
    req.session.regenerate(async (err) => {
      if (err) {
        console.error("Session regeneration error:", err);
        return res.status(500).json({ message: "Login failed" });
      }

      req.session!.userId = user.id;
      req.session!.username = user.username;
      
      // Update last login timestamp
      await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

      res.json({ message: "Login successful", user: { id: user.id, username: user.username } });
    });

  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// POST /api/logout - Log out the current user
router.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Could not log out" });
    }
    // Clear the session cookie on the client
    res.clearCookie('connect.sid'); // Default session cookie name
    res.json({ message: "Logout successful" });
  });
});

// Export default router
export default router;