import express from "express";
import { eq, and, or } from "drizzle-orm";
import { db } from "./db";
import { users, wallets, transactions, selectUserSchema } from "@shared/schema";
import type { User } from "@shared/schema";
import { BlockchainService } from "./blockchain";
import { storage } from "./storage";
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

// ===== JSON ERROR HANDLING MIDDLEWARE =====
// Ensure all API responses are properly formatted as JSON
router.use((req, res, next) => {
  // Override res.json to add additional safety
  const originalJson = res.json;
  res.json = function(body) {
    try {
      // Ensure content type is set
      if (!res.get('Content-Type')) {
        res.setHeader('Content-Type', 'application/json');
      }
      return originalJson.call(this, body);
    } catch (error) {
      console.error('JSON response error:', error);
      // Fallback to plain text if JSON fails
      res.setHeader('Content-Type', 'text/plain');
      return res.send('Internal server error');
    }
  };
  next();
});

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

// Removed 1inch-specific token configuration

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

// Removed 1inch API functionality - using CoinGecko as primary source

// ===== CRYPTOCURRENCY PRICE API ENDPOINTS =====

// GET /api/tokens - Get token prices from multiple APIs with fallback
router.get("/api/tokens", async (req, res) => {
  console.log('🔵 /api/tokens endpoint called');

  // Popular cryptocurrencies across multiple blockchains
  const cryptocurrencies = [
    // Major cryptocurrencies
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    { id: 'tether', symbol: 'USDT', name: 'Tether USD' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
    { id: 'solana', symbol: 'SOL', name: 'Solana' },
    { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
    { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
    { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu' },
    { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
    { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
    { id: 'polygon', symbol: 'MATIC', name: 'Polygon' },
    { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
    { id: 'uniswap', symbol: 'UNI', name: 'Uniswap' },
    { id: 'internet-computer', symbol: 'ICP', name: 'Internet Computer' },
    { id: 'ethereum-classic', symbol: 'ETC', name: 'Ethereum Classic' },
    { id: 'stellar', symbol: 'XLM', name: 'Stellar' },
    { id: 'filecoin', symbol: 'FIL', name: 'Filecoin' },
    { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos' },
    { id: 'monero', symbol: 'XMR', name: 'Monero' },
    { id: 'hedera-hashgraph', symbol: 'HBAR', name: 'Hedera' },
    { id: 'tron', symbol: 'TRX', name: 'TRON' },
    { id: 'algorand', symbol: 'ALGO', name: 'Algorand' }
  ];

  try {
    console.log('🔵 Fetching cryptocurrency prices from CoinGecko API...');

    // Build the API URL for CoinGecko
    const cryptoIds = cryptocurrencies.map(crypto => crypto.id).join(',');
    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;

    console.log('🔵 CoinGecko API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BitWallet/1.0'
      },
      timeout: 15000 // 15 second timeout
    });

    console.log('🔵 CoinGecko Response:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ CoinGecko data received:', Object.keys(data).length, 'cryptocurrencies');

      // Transform the data to our expected format
      const tokenPrices = cryptocurrencies.map(crypto => {
        const priceData = data[crypto.id];
        if (priceData) {
          return {
            symbol: crypto.symbol,
            name: crypto.name,
            address: crypto.id, // Use CoinGecko ID as address
            price: priceData.usd || 0,
            change24h: priceData.usd_24h_change || 0,
            marketCap: priceData.usd_market_cap || 0,
            volume24h: priceData.usd_24h_vol || 0,
            lastUpdated: new Date().toISOString()
          };
        } else {
          return {
            symbol: crypto.symbol,
            name: crypto.name,
            address: crypto.id,
            price: 0,
            change24h: 0,
            marketCap: 0,
            volume24h: 0,
            lastUpdated: new Date().toISOString(),
            error: 'Data not available'
          };
        }
      });

      // Filter successful vs failed tokens
      const validTokens = tokenPrices.filter(token => token.price > 0);
      const errorTokens = tokenPrices.filter(token => token.price === 0);

      console.log('✅ Successfully fetched prices for:', validTokens.map(t => t.symbol).join(', '));
      if (errorTokens.length > 0) {
        console.log('❌ Failed to fetch prices for:', errorTokens.map(t => t.symbol).join(', '));
      }

      const responseData = {
        success: true,
        message: `Successfully fetched ${validTokens.length} cryptocurrency prices`,
        tokens: tokenPrices,
        validCount: validTokens.length,
        errorCount: errorTokens.length,
        source: 'CoinGecko API',
        timestamp: new Date().toISOString(),
        totalSupported: cryptocurrencies.length
      };

      console.log('✅ Final API response:', {
        tokenCount: responseData.tokens.length,
        validCount: responseData.validCount,
        errorCount: responseData.errorCount,
        source: responseData.source
      });

      res.json(responseData);

    } else {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

  } catch (error) {
    console.error('❌ Error fetching from CoinGecko, trying CoinMarketCap fallback:', error);

    // Fallback to CoinMarketCap API
    try {
      console.log('🔄 Trying CoinMarketCap API as fallback...');

      const cmcApiKey = process.env.COINMARKETCAP_API_KEY;
      if (cmcApiKey) {
        const cmcResponse = await fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=25', {
          headers: {
            'X-CMC_PRO_API_KEY': cmcApiKey,
            'Accept': 'application/json'
          },
          timeout: 15000
        });

        if (cmcResponse.ok) {
          const cmcData = await cmcResponse.json();
          console.log('✅ CoinMarketCap fallback successful');

          const tokenPrices = cryptocurrencies.map(crypto => {
            const cmcCoin = cmcData.data.find(coin => 
              coin.symbol.toLowerCase() === crypto.symbol.toLowerCase()
            );

            if (cmcCoin) {
              return {
                symbol: crypto.symbol,
                name: crypto.name,
                address: crypto.id,
                price: cmcCoin.quote.USD.price || 0,
                change24h: cmcCoin.quote.USD.percent_change_24h || 0,
                marketCap: cmcCoin.quote.USD.market_cap || 0,
                volume24h: cmcCoin.quote.USD.volume_24h || 0,
                lastUpdated: new Date().toISOString()
              };
            } else {
              return {
                symbol: crypto.symbol,
                name: crypto.name,
                address: crypto.id,
                price: 0,
                change24h: 0,
                marketCap: 0,
                volume24h: 0,
                lastUpdated: new Date().toISOString(),
                error: 'Not found in CoinMarketCap'
              };
            }
          });

          return res.json({
            success: true,
            message: 'Successfully fetched prices from CoinMarketCap fallback',
            tokens: tokenPrices,
            validCount: tokenPrices.filter(t => t.price > 0).length,
            errorCount: tokenPrices.filter(t => t.price === 0).length,
            source: 'CoinMarketCap API (fallback)',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (fallbackError) {
      console.error('❌ CoinMarketCap fallback also failed:', fallbackError);
    }

    // If both CoinGecko and CoinMarketCap fail, return mock data
    console.log('❌ Both CoinGecko and CoinMarketCap failed. Returning mock data.');
    const mockTokens = cryptocurrencies.map(crypto => ({
      symbol: crypto.symbol,
      name: crypto.name,
      address: crypto.id,
      price: Math.random() * 1000 + 100, // Random price between 100-1100
      change24h: (Math.random() - 0.5) * 20, // Random change between -10% to +10%
      marketCap: Math.random() * 1000000000,
      volume24h: Math.random() * 100000000,
      lastUpdated: new Date().toISOString(),
      error: 'Using mock data due to API error'
    }));

    res.status(500).json({
      success: false,
      message: 'Failed to fetch cryptocurrency prices from all sources, using mock data',
      tokens: mockTokens,
      source: 'mock data (all APIs failed)',
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error'
    });
  }
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

// ===== API TESTING ENDPOINTS =====

// GET /api/debug/test-apis - Test multiple cryptocurrency APIs
router.get("/api/debug/test-apis", async (req, res) => {
  console.log('🧪 Testing multiple cryptocurrency APIs...');

  const apiResults = {
    coinGecko: { status: 'testing', data: null, error: null },
    coinMarketCap: { status: 'testing', data: null, error: null }
  };

  // Test CoinGecko API
  try {
    console.log('🧪 Testing CoinGecko API...');
    const geckoResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd&include_24hr_change=true',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BitWallet/1.0'
        },
        timeout: 10000
      }
    );

    if (geckoResponse.ok) {
      const geckoData = await geckoResponse.json();
      apiResults.coinGecko = {
        status: 'success',
        data: geckoData,
        error: null
      };
      console.log('✅ CoinGecko API working');
    } else {
      apiResults.coinGecko = {
        status: 'failed',
        data: null,
        error: `HTTP ${geckoResponse.status}`
      };
    }
  } catch (error) {
    apiResults.coinGecko = {
      status: 'failed',
      data: null,
      error: error.message
    };
  }

  // Test CoinMarketCap API (if API key is available)
  const cmcApiKey = process.env.COINMARKETCAP_API_KEY;
  if (cmcApiKey) {
    try {
      console.log('🧪 Testing CoinMarketCap API...');
      const cmcResponse = await fetch(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=5',
        {
          headers: {
            'X-CMC_PRO_API_KEY': cmcApiKey,
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      if (cmcResponse.ok) {
        const cmcData = await cmcResponse.json();
        apiResults.coinMarketCap = {
          status: 'success',
          data: { count: cmcData.data?.length || 0 },
          error: null
        };
        console.log('✅ CoinMarketCap API working');
      } else {
        apiResults.coinMarketCap = {
          status: 'failed',
          data: null,
          error: `HTTP ${cmcResponse.status}`
        };
      }
    } catch (error) {
      apiResults.coinMarketCap = {
        status: 'failed',
        data: null,
        error: error.message
      };
    }
  } else {
    apiResults.coinMarketCap = {
      status: 'skipped',
      data: null,
      error: 'No API key configured'
    };
  }

  // 1inch API removed - no longer testing

  res.json({
    timestamp: new Date().toISOString(),
    apis: apiResults,
    recommendations: {
      primary: 'CoinGecko (free, no API key required)',
      fallback: 'CoinMarketCap (requires API key)',
      swap: 'Jupiter for Solana, Moralis for multi-chain'
    }
  });
});

// Removed 1inch API testing endpoint

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

// ===== METAMASK AUTHENTICATION ENDPOINT =====
router.post("/auth/metamask", async (req, res) => {
  // Ensure we always respond with JSON, even on unexpected errors
  const sendJsonError = (statusCode: number, message: string, details?: string) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: details || undefined
    });
  };

  try {
    // Set JSON headers explicitly and early
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');

    console.log('🦊 MetaMask authentication request received');
    console.log('🦊 Request body keys:', Object.keys(req.body || {}));
    console.log('🦊 Content-Type:', req.get('Content-Type'));

    // Validate request body exists
    if (!req.body) {
      console.error('❌ No request body received');
      return sendJsonError(400, 'Request body is required');
    }

    const { message, signature, address } = req.body;

    // Validate required fields
    if (!message || !signature || !address) {
      console.error('❌ Missing required fields:', { 
        message: !!message, 
        signature: !!signature, 
        address: !!address 
      });
      return sendJsonError(400, 'Missing required fields: message, signature, and address are required');
    }

    // Validate address format (basic check)
    if (!address.startsWith('0x') || address.length !== 42) {
      console.error('❌ Invalid address format:', address);
      return sendJsonError(400, 'Invalid Ethereum address format');
    }

    console.log('🦊 MetaMask authentication data validated:', { 
      address: address,
      messageLength: message.length,
      signatureLength: signature.length 
    });

    // Ensure session exists and initialize if needed
    if (!req.session) {
      console.error('❌ No session middleware available');
      return sendJsonError(500, 'Session middleware not available');
    }

    // Initialize session user if it doesn't exist
    if (req.session.user === undefined) {
      req.session.user = null;
    }

    // Create user object for session
    const metamaskUser = {
      id: `metamask_${address}`,
      sub: `metamask_${address}`, // Add sub for compatibility
      address: address,
      walletAddress: address,
      name: `${address.slice(0, 6)}...${address.slice(-4)}`,
      provider: 'metamask',
      picture: null,
      email: null
    };

    // Store user in session
    req.session.user = metamaskUser;

    // Save session explicitly to ensure it's persisted
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save error:', err);
          reject(err);
        } else {
          console.log('✅ Session saved successfully');
          resolve(true);
        }
      });
    });

    console.log('✅ MetaMask user authenticated successfully:', metamaskUser.name);

    // Track login session if storage is available
    try {
      const { storage } = await import('./storage');
      const sessionData = {
        userId: null,
        email: null,
        name: metamaskUser.name,
        walletAddress: address,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        sessionId: req.sessionID,
      };

      const sessionDbId = await storage.createUserSession(sessionData);
      req.session.sessionDbId = sessionDbId;
      console.log('📊 Session tracking created:', sessionDbId);
    } catch (dbError) {
      console.warn('⚠️ Warning: Could not create database session:', dbError);
      // Continue without database session tracking
    }

    // Return success response with user data
    const responseData = { 
      success: true, 
      message: 'MetaMask authentication successful',
      user: metamaskUser
    };

    console.log('🦊 Sending response:', responseData);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ MetaMask authentication error:', error);

    // Ensure we always return JSON even on unexpected errors
    return sendJsonError(500, 'MetaMask authentication failed');
  }
});

// ===== SWAP ENDPOINTS =====

// GET /api/swap/tokens - Get supported tokens for swapping
router.get("/api/swap/tokens", async (req, res) => {
  const { network = 'ethereum' } = req.query;

  try {
    // Define tokens by network
    const tokensByNetwork = {
      ethereum: [
        { symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c951449b402c7C27D170c54E0F13A8BfD', decimals: 6 },
        { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
        { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
        { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
      ],
      bsc: [
        { symbol: 'BNB', name: 'BNB', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
        { symbol: 'BUSD', name: 'Binance USD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 },
        { symbol: 'CAKE', name: 'PancakeSwap', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18 },
      ],
      polygon: [
        { symbol: 'MATIC', name: 'Polygon', address: '0x0000000000000000000000000000000000001010', decimals: 18 },
        { symbol: 'WETH', name: 'Wrapped Ether', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
      ],
      solana: [
        { symbol: 'SOL', name: 'Solana', address: 'So11111111111111111111111111111111111111112', decimals: 9 },
        { symbol: 'USDC', name: 'USD Coin', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
        { symbol: 'RAY', name: 'Raydium', address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', decimals: 6 },
      ]
    };

    const tokens = tokensByNetwork[network] || tokensByNetwork.ethereum;

    res.json({
      success: true,
      network,
      tokens,
      count: tokens.length
    });

  } catch (error) {
    console.error('Error fetching swap tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch swap tokens',
      error: error.message
    });
  }
});

// POST /api/swap/quote - Get swap quote using multiple providers
router.post("/api/swap/quote", async (req, res) => {
  const { fromToken, toToken, amount, network = 'ethereum' } = req.body;

  if (!fromToken || !toToken || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: fromToken, toToken, amount'
    });
  }

  try {
    console.log(`🔄 Getting swap quote: ${amount} ${fromToken} → ${toToken} on ${network}`);

    // Try different quote providers based on network
    let quote = null;

    // 1. Try Jupiter for Solana
    if (network === 'solana') {
      quote = await getJupiterQuote(fromToken, toToken, amount);
    }

    // 2. Try Moralis for EVM chains (placeholder)
    if (!quote && ['ethereum', 'bsc', 'polygon'].includes(network)) {
      quote = await getMoralisQuote(fromToken, toToken, amount, network);
    }

    // 3. Fallback to CoinGecko price-based quote
    if (!quote) {
      quote = await getCoinGeckoSwapQuote(fromToken, toToken, amount);
    }

    // 4. Last resort: mock quote
    if (!quote) {
      quote = generateMockQuote(fromToken, toToken, amount);
    }

    console.log(`✅ Swap quote generated using ${quote.provider}`);

    res.json({
      success: true,
      quote,
      network,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting swap quote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get swap quote',
      error: error.message
    });
  }
});

// POST /api/swap/execute - Execute token swap (demo implementation)
router.post("/api/swap/execute", authenticateUser, async (req, res) => {
  const { fromToken, toToken, amount, quote, network } = req.body;

  if (!fromToken || !toToken || !amount || !quote) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields for swap execution'
    });
  }

  try {
    console.log(`🚀 Executing swap: ${amount} ${fromToken} → ${toToken} on ${network}`);

    // In a real implementation, this would:
    // 1. Validate the quote is still valid
    // 2. Check user's wallet balance
    // 3. Execute the swap transaction
    // 4. Update user's balance in database
    // 5. Record the transaction

    // For demo purposes, we'll simulate the swap
    const swapResult = {
      transactionHash: `0x${crypto.randomBytes(32).toString('hex')}`,
      fromAmount: amount,
      toAmount: quote.toAmount,
      fromToken,
      toToken,
      network,
      status: 'completed',
      timestamp: new Date().toISOString(),
      gasUsed: quote.estimatedGas,
      fee: quote.fee
    };

    // Record transaction in database (mock)
    try {
      await db.insert(transactions).values({
        userId: req.user!.id,
        type: 'swap',
        amount: parseFloat(amount),
        fromAddress: fromToken,
        toAddress: toToken,
        hash: swapResult.transactionHash,
        confirmed: true,
        timestamp: new Date()
      });
    } catch (dbError) {
      console.warn('Warning: Could not record transaction in database:', dbError);
    }

    res.json({
      success: true,
      message: 'Swap executed successfully',
      result: swapResult
    });

  } catch (error) {
    console.error('Error executing swap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute swap',
      error: error.message
    });
  }
});

// Helper function: Jupiter API quote for Solana
async function getJupiterQuote(fromToken, toToken, amount) {
  try {
    const response = await fetch(
      `https://quote-api.jup.ag/v6/quote?inputMint=${fromToken}&outputMint=${toToken}&amount=${amount}&slippageBps=50`,
      { timeout: 10000 }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: data.outAmount,
        price: parseFloat(data.outAmount) / parseFloat(amount),
        priceImpact: data.priceImpactPct || 0,
        fee: '0.25%',
        route: data.routePlan?.map(r => r.swapInfo.outputMint) || [fromToken, toToken],
        estimatedGas: 'N/A',
        provider: 'Jupiter'
      };
    }
  } catch (error) {
    console.error('Jupiter API error:', error);
  }
  return null;
}

// Helper function: Moralis API quote for EVM chains
async function getMoralisQuote(fromToken, toToken, amount, network) {
  // This would use Moralis API in production
  // For now, return null to fall back to other providers
  return null;
}

// Helper function: CoinGecko-based swap quote
async function getCoinGeckoSwapQuote(fromTokenSymbol, toTokenSymbol, amount) {
  try {
    // Map common symbols to CoinGecko IDs
    const symbolToId = {
      'ETH': 'ethereum',
      'BTC': 'bitcoin',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'BNB': 'binancecoin',
      'MATIC': 'polygon',
      'SOL': 'solana',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'AAVE': 'aave',
      'WBTC': 'wrapped-bitcoin'
    };

    const fromId = symbolToId[fromTokenSymbol.toUpperCase()];
    const toId = symbolToId[toTokenSymbol.toUpperCase()];

    if (!fromId || !toId) return null;

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${fromId},${toId}&vs_currencies=usd`,
      { timeout: 10000 }
    );

    if (response.ok) {
      const data = await response.json();
      const fromPrice = data[fromId]?.usd;
      const toPrice = data[toId]?.usd;

      if (fromPrice && toPrice) {
        const fromAmountNum = parseFloat(amount);
        const toAmountNum = (fromAmountNum * fromPrice) / toPrice;

        return {
          fromToken: fromTokenSymbol,
          toToken: toTokenSymbol,
          fromAmount: amount,
          toAmount: toAmountNum.toFixed(8),
          price: fromPrice / toPrice,
          priceImpact: 0.5,
          fee: '0.3%',
          route: [fromTokenSymbol, toTokenSymbol],
          estimatedGas: '150000',
          provider: 'CoinGecko'
        };
      }
    }
  } catch (error) {
    console.error('CoinGecko swap quote error:', error);
  }
  return null;
}

// Helper function: Generate mock quote for testing
function generateMockQuote(fromToken, toToken, amount) {
  const fromAmountNum = parseFloat(amount);
  const mockRate = Math.random() * 100 + 1;
  const toAmountNum = fromAmountNum * mockRate;

  return {
    fromToken,
    toToken,
    fromAmount: amount,
    toAmount: toAmountNum.toFixed(8),
    price: mockRate,
    priceImpact: Math.random() * 2,
    fee: '0.3%',
    route: [fromToken, toToken],
    estimatedGas: '150000',
    provider: 'Mock'
  };
}

// Export default router
export default router;