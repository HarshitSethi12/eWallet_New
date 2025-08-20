// ===== IMPORT SECTION =====
// Import necessary modules and dependencies for the API routes

import express from 'express';                    // Express.js web framework
import crypto from 'crypto';                      // Node.js crypto module for encryption
import { storage } from './storage';               // Database storage functions
import { generateMockAddress, generateMockPrivateKey } from '../client/src/lib/mock-blockchain';  // Mock blockchain utilities
import { ethers } from 'ethers';                  // Ethereum library for wallet operations

// ===== ROUTER SETUP =====
// Create Express router to define API endpoints
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

// ===== CRYPTOCURRENCY PRICE API ENDPOINT =====
// Endpoint to fetch real-time cryptocurrency prices from CoinGecko
router.get('/crypto-prices', async (req, res) => {
  try {
    console.log('📊 Fetching crypto prices from CoinGecko...');

    // List of cryptocurrencies to fetch prices for
    const cryptoIds = [
      'bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana',
      'usd-coin', 'ripple', 'dogecoin', 'cardano', 'avalanche-2',
      'shiba-inu', 'chainlink', 'polkadot', 'bitcoin-cash', 'polygon',
      'litecoin', 'near', 'uniswap', 'internet-computer', 'ethereum-classic',
      'stellar', 'filecoin', 'cosmos', 'monero', 'hedera-hashgraph',
      'tron', 'staked-ether', 'wrapped-bitcoin', 'sui', 'wrapped-steth',
      'leo-token', 'the-open-network', 'usds'
    ].join(',');

    // CoinGecko API URL with parameters for USD prices and 24h change
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd&include_24hr_change=true`;

    console.log('🌐 Making request to CoinGecko API...');

    // Fetch data from CoinGecko API
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BitWallet/1.0'
      }
    });

    // Check if the API request was successful
    if (!response.ok) {
      console.error('❌ CoinGecko API error:', response.status, response.statusText);
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    // Parse the JSON response
    const data = await response.json();
    console.log('✅ Successfully fetched crypto prices');

    // Return the price data to the client
    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching crypto prices:', error);

    // Return error response if fetching fails
    res.status(500).json({
      error: 'Failed to fetch crypto prices',
      message: error.message
    });
  }
});

// ===== WALLET MANAGEMENT ENDPOINTS =====

// Endpoint to get all wallets for the current user
router.get('/wallets', async (req, res) => {
  try {
    console.log('👛 Fetching wallets for user');

    // For now, return empty array since we don't have user-specific wallets yet
    // TODO: Implement proper user wallet management
    res.json([]);
  } catch (error) {
    console.error('❌ Error fetching wallets:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// Endpoint to create a new wallet for the user
router.post('/wallets', async (req, res) => {
  try {
    console.log('🆕 Creating new wallet');

    const { chain } = req.body;  // Get the blockchain type from request

    // Validate that a blockchain type was provided
    if (!chain) {
      return res.status(400).json({ error: 'Chain is required' });
    }

    let address: string;
    let privateKey: string;

    // Generate wallet based on the specified blockchain
    if (chain === 'ETH') {
      // Generate Ethereum wallet using ethers library
      console.log('🔗 Generating Ethereum wallet...');
      const wallet = ethers.Wallet.createRandom();  // Create random Ethereum wallet
      address = wallet.address;                      // Get wallet address
      privateKey = wallet.privateKey;               // Get private key
    } else if (chain === 'BTC') {
      // Generate Bitcoin wallet using mock functions (for development)
      console.log('🔗 Generating Bitcoin wallet...');
      address = generateMockAddress();              // Generate mock Bitcoin address
      privateKey = generateMockPrivateKey();        // Generate mock private key
    } else {
      // Return error for unsupported blockchain
      return res.status(400).json({ error: 'Unsupported chain' });
    }

    // Encrypt the private key before storing in database
    const encryptedPrivateKey = encrypt(privateKey);

    // Create wallet object to store in database
    const wallet = {
      chain,                          // Blockchain type (BTC/ETH)
      address,                        // Wallet address
      encryptedPrivateKey,            // Encrypted private key
      lastBalance: '0',               // Initial balance
    };

    console.log(`✅ Created ${chain} wallet:`, address);

    // Return the new wallet information (without private key)
    res.json({
      id: Date.now(),                 // Temporary ID (should be from database)
      chain: wallet.chain,
      address: wallet.address,
      lastBalance: wallet.lastBalance
    });
  } catch (error) {
    console.error('❌ Error creating wallet:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

// ===== TRANSACTION MANAGEMENT ENDPOINTS =====

// Endpoint to get transaction history for the user
router.get('/transactions', async (req, res) => {
  try {
    console.log('📊 Fetching transaction history');

    // For now, return empty array since we don't have user-specific transactions yet
    // TODO: Implement proper transaction history
    res.json([]);
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Endpoint to send a cryptocurrency transaction
router.post('/transactions/send', async (req, res) => {
  try {
    console.log('💸 Processing send transaction');

    const { fromAddress, toAddress, amount, chain } = req.body;

    // Validate required fields
    if (!fromAddress || !toAddress || !amount || !chain) {
      return res.status(400).json({
        error: 'Missing required fields: fromAddress, toAddress, amount, chain'
      });
    }

    // Validate amount is positive
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    // For now, simulate the transaction (since we're using mock blockchain)
    console.log(`📤 Simulating ${chain} transaction:`);
    console.log(`   From: ${fromAddress}`);
    console.log(`   To: ${toAddress}`);
    console.log(`   Amount: ${amount}`);

    // Create transaction record
    const transaction = {
      id: Date.now(),                           // Temporary ID
      fromAddress,
      toAddress,
      amount: parseFloat(amount),               // Convert amount to number
      chain,
      timestamp: new Date().toISOString(),     // Current timestamp
      confirmed: false,                        // Initially unconfirmed
      transactionHash: `mock_hash_${Date.now()}`, // Mock transaction hash
    };

    console.log('✅ Transaction created successfully');

    // Return the transaction record
    res.json(transaction);
  } catch (error) {
    console.error('❌ Error sending transaction:', error);
    res.status(500).json({ error: 'Failed to send transaction' });
  }
});

// ===== CONTACT MANAGEMENT ENDPOINTS =====

// Endpoint to get all saved contacts for the user
router.get('/contacts', async (req, res) => {
  try {
    console.log('📇 Fetching contacts');

    // For now, return empty array since we don't have user-specific contacts yet
    // TODO: Implement proper contact management
    res.json([]);
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Endpoint to add a new contact
router.post('/contacts', async (req, res) => {
  try {
    console.log('👤 Adding new contact');

    const { name, address } = req.body;

    // Validate required fields
    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    // Create contact object
    const contact = {
      id: Date.now(),                 // Temporary ID
      name: name.trim(),              // Remove whitespace
      address: address.trim(),        // Remove whitespace
      createdAt: new Date().toISOString()
    };

    console.log('✅ Contact added:', contact.name);

    // Return the new contact
    res.json(contact);
  } catch (error) {
    console.error('❌ Error adding contact:', error);
    res.status(500).json({ error: 'Failed to add contact' });
  }
});

// ===== METAMASK AUTHENTICATION ENDPOINT =====

// Endpoint to authenticate users with MetaMask wallet signatures
router.post('/auth/metamask', async (req, res) => {
  try {
    console.log('🦊 Processing MetaMask authentication');

    const { message, signature, address } = req.body;

    // Validate required fields
    if (!message || !signature || !address) {
      return res.status(400).json({
        error: 'Missing required fields: message, signature, address'
      });
    }

    console.log('🔐 Verifying signature...');
    console.log('   Address:', address);
    console.log('   Message:', message);

    // Verify the signature using ethers library
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      console.log('   Recovered Address:', recoveredAddress);

      // Check if the recovered address matches the claimed address
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        console.log('❌ Signature verification failed: address mismatch');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      console.log('✅ Signature verified successfully');
    } catch (verifyError) {
      console.error('❌ Signature verification error:', verifyError);
      return res.status(401).json({ error: 'Invalid signature format' });
    }

    // Create or update user in database
    try {
      console.log('👤 Creating/updating MetaMask user in database');

      const displayName = `${address.slice(0, 6)}...${address.slice(-4)}`;

      const user = {
        address,
        displayName,
        lastLogin: new Date()
      };

      // Store user in session
      req.session.user = {
        id: address,
        name: displayName,
        walletAddress: address,
        provider: 'metamask',
        picture: null
      };

      // Track login session if storage is available
      try {
        const sessionData = {
          userId: address,
          email: null,
          name: displayName,
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          sessionId: req.sessionID,
        };

        const sessionDbId = await storage.createUserSession(sessionData);
        req.session.sessionDbId = sessionDbId;
      } catch (dbError) {
        console.warn('Warning: Could not create database session:', dbError);
      }

      console.log('✅ MetaMask user authenticated successfully');

      // Return success response
      res.json({
        success: true,
        user: req.session.user,
        message: 'Authentication successful'
      });
    } catch (dbError) {
      console.error('❌ Database error during MetaMask auth:', dbError);
      // Continue with authentication even if database fails
      req.session.user = {
        id: address,
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        walletAddress: address,
        provider: 'metamask',
        picture: null
      };

      res.json({
        success: true,
        user: req.session.user,
        message: 'Authentication successful (database unavailable)'
      });
    }
  } catch (error) {
    console.error('❌ MetaMask authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// ===== AI ASSISTANT ENDPOINTS =====

// Endpoint for AI chat using Gemini API
router.post('/ai/gemini-chat', async (req, res) => {
  try {
    console.log('🤖 Processing Gemini AI chat request');

    const { message, context } = req.body;

    // Validate that a message was provided
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️ Gemini API key not configured, returning fallback response');
      return res.json({
        response: "I'm here to help with your crypto wallet questions! However, my AI features are currently limited. Try asking about crypto prices or wallet functions.",
        fallback: true
      });
    }

    console.log('🌐 Calling Gemini API...');

    // Prepare the prompt with context information
    let prompt = `You are a helpful AI assistant for BitWallet, a cryptocurrency wallet application. `;

    if (context?.user) {
      prompt += `The user is authenticated and their details are: ${JSON.stringify(context.user)}. `;
    }

    if (context?.wallet) {
      prompt += `User's wallet info: ${JSON.stringify(context.wallet)}. `;
    }

    if (context?.transactions && context.transactions.length > 0) {
      prompt += `Recent transactions: ${JSON.stringify(context.transactions)}. `;
    }

    if (context?.cryptoPrices && context.cryptoPrices.length > 0) {
      prompt += `Current crypto prices: ${JSON.stringify(context.cryptoPrices)}. `;
    }

    prompt += `User question: ${message}`;

    // Make request to Gemini API
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    // Check if Gemini API request was successful
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ Gemini API error:', geminiResponse.status, errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    // Parse Gemini API response
    const geminiData = await geminiResponse.json();
    console.log('✅ Gemini API response received');

    // Extract the response text from Gemini's response structure
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (responseText) {
      res.json({ response: responseText });
    } else {
      console.log('⚠️ No response text from Gemini API');
      res.json({
        response: "I'm here to help with your crypto wallet questions! Try asking about crypto prices or wallet functions.",
        fallback: true
      });
    }
  } catch (error) {
    console.error('❌ Gemini AI chat error:', error);

    // Return a fallback response if AI fails
    res.json({
      response: "I'm experiencing some technical difficulties. Please try asking about crypto prices or wallet functions!",
      error: true,
      fallback: true
    });
  }
});

// Health check endpoint for Gemini API
router.get('/ai/gemini-health', async (req, res) => {
  try {
    console.log('🔍 Checking Gemini API health');

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        status: 'error',
        message: 'Gemini API key not configured',
        hasApiKey: false
      });
    }

    // Make a simple test request to Gemini API
    const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Say 'API is working' if you can read this."
              }
            ]
          }
        ]
      })
    });

    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log('✅ Gemini API is healthy');

      res.json({
        status: 'healthy',
        message: 'Gemini API is working correctly',
        hasApiKey: true,
        response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text'
      });
    } else {
      const errorText = await testResponse.text();
      console.error('❌ Gemini API health check failed:', testResponse.status, errorText);

      res.json({
        status: 'error',
        message: `API returned status ${testResponse.status}`,
        hasApiKey: true,
        error: errorText
      });
    }
  } catch (error) {
    console.error('❌ Gemini health check error:', error);

    res.json({
      status: 'error',
      message: 'Failed to connect to Gemini API',
      hasApiKey: !!process.env.GEMINI_API_KEY,
      error: error.message
    });
  }
});

// ===== TOKEN PRICES API ENDPOINT =====
// Endpoint to fetch real-time token prices from 1inch API
router.get('/tokens', async (req, res) => {
  try {
    console.log('🪙 Fetching token prices from 1inch API...');

    // Check if 1inch API key is available
    const oneInchApiKey = process.env.ONEINCH_API_KEY;
    if (!oneInchApiKey) {
      console.warn('⚠️ 1inch API key not found in environment variables');
      throw new Error('1inch API key not configured');
    }

    // Define token addresses for 1inch API calls (corrected addresses)
    const tokenAddresses = {
      'ETH': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH native token
      'USDC': '0xa0b86a33e6441b15d93d2c248c2c4e48d5e7f4bb', // USDC on Ethereum
      'LINK': '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK on Ethereum
      'UNI': '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984'   // UNI on Ethereum
    };

    console.log('🔑 Using 1inch API Key:', oneInchApiKey ? 'Present' : 'Missing');

    // Fetch prices from 1inch API using quote endpoint with USDC as base
    const usdcAddress = '0xa0b86a33e6441b15d93d2c248c2c4e48d5e7f4bb'; // USDC address
    
    const tokenPrices = await Promise.allSettled(
      Object.entries(tokenAddresses).map(async ([symbol, address]) => {
        try {
          console.log(`📞 Fetching ${symbol} price from 1inch...`);
          
          // For ETH, get price by quoting 1 ETH to USDC
          // For other tokens, quote 1000 tokens to USDC (to get better precision)
          const amount = symbol === 'ETH' ? '1000000000000000000' : // 1 ETH in wei
                        symbol === 'USDC' ? '1000000' : // 1 USDC (already in correct decimals)
                        '1000000000000000000000'; // 1000 tokens (assuming 18 decimals)
          
          let url;
          if (symbol === 'USDC') {
            // USDC price is always $1
            const priceData = { price: 1 };
            console.log(`✅ USDC price set to $1.00`);
            
            const balance = '1000';
            const balanceNum = parseFloat(balance);
            
            return {
              symbol,
              name: 'USD Coin',
              price: 1.00,
              change24h: -0.02,
              balance,
              balanceUSD: parseFloat((1.00 * balanceNum).toFixed(2)),
              logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png'
            };
          } else {
            // For other tokens, get quote from token to USDC
            url = `https://api.1inch.dev/swap/v5.0/1/quote?fromTokenAddress=${address}&toTokenAddress=${usdcAddress}&amount=${amount}`;
          }
          
          console.log(`🌐 Request URL: ${url}`);
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${oneInchApiKey}`,
              'Accept': 'application/json',
              'User-Agent': 'BitWallet/1.0'
            }
          });

          console.log(`📊 Response status for ${symbol}:`, response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ 1inch API error for ${symbol}:`, response.status, response.statusText, errorText);
            throw new Error(`1inch API error: ${response.status} - ${errorText}`);
          }

          const quoteData = await response.json();
          console.log(`✅ Raw ${symbol} quote response from 1inch:`, quoteData);

          // Calculate 24h change (using realistic mock data)
          const mockChange24h = {
            'ETH': -1.84,
            'LINK': -2.15,
            'UNI': -0.89
          };

          // Calculate price from the quote
          let price = 0;
          if (quoteData && quoteData.toTokenAmount) {
            const fromAmount = parseFloat(amount);
            const toAmount = parseFloat(quoteData.toTokenAmount);
            
            if (symbol === 'ETH') {
              // 1 ETH = toAmount USDC (USDC has 6 decimals)
              price = toAmount / 1000000; // Convert from USDC wei to actual USDC
            } else {
              // 1000 tokens = toAmount USDC
              price = (toAmount / 1000000) / 1000; // Price per single token
            }
          }
          
          console.log(`🔢 Calculated ${symbol} price: $${price.toFixed(2)}`);
          
          const balance = symbol === 'ETH' ? '2.5' : symbol === 'LINK' ? '150' : '75';
          const balanceNum = parseFloat(balance);
          
          return {
            symbol,
            name: symbol === 'ETH' ? 'Ethereum' : 
                  symbol === 'LINK' ? 'Chainlink' : 'Uniswap',
            price: parseFloat(price.toFixed(2)),
            change24h: mockChange24h[symbol] || 0,
            balance,
            balanceUSD: parseFloat((price * balanceNum).toFixed(2)),
            logoURI: symbol === 'ETH' ? 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' :
                     symbol === 'LINK' ? 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' :
                     'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png'
          };
        } catch (error) {
          console.error(`❌ Error fetching ${symbol} price:`, error.message);
          throw error;
        }
      })
    );

    // Process results and handle any failures
    const successfulTokens = [];
    const failedTokens = [];

    tokenPrices.forEach((result, index) => {
      const symbol = Object.keys(tokenAddresses)[index];
      if (result.status === 'fulfilled') {
        successfulTokens.push(result.value);
      } else {
        failedTokens.push({ symbol, error: result.reason.message });
      }
    });

    if (successfulTokens.length === 0) {
      throw new Error('Failed to fetch any token prices from 1inch API');
    }

    console.log('✅ Successfully fetched real 1inch token prices');
    console.log('📊 Real 1inch prices:', successfulTokens.map(t => `${t.symbol}: $${t.price}`));
    
    return res.json({
      tokens: successfulTokens,
      source: '1inch',
      timestamp: new Date().toISOString(),
      debug: {
        tokensFound: successfulTokens.length,
        failedTokens: failedTokens.length > 0 ? failedTokens : undefined,
        method: '1inch_api_real_prices',
        message: 'Real-time prices from 1inch DEX API'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching 1inch prices:', error);

    // Fallback to mock prices with clear indication
    const fallbackTokens = [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        price: 0, // Show zero instead of mock prices
        change24h: 0,
        balance: '2.5',
        balanceUSD: 0,
        logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        price: 0,
        change24h: 0,
        balance: '1000',
        balanceUSD: 0,
        logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png'
      },
      {
        symbol: 'LINK',
        name: 'Chainlink',
        price: 0,
        change24h: 0,
        balance: '150',
        balanceUSD: 0,
        logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png'
      },
      {
        symbol: 'UNI',
        name: 'Uniswap',
        price: 0,
        change24h: 0,
        balance: '75',
        balanceUSD: 0,
        logoURI: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png'
      }
    ];

    console.log('⚠️ Using fallback zero prices (API failed)');
    
    res.json({
      tokens: fallbackTokens,
      source: '1inch_failed',
      timestamp: new Date().toISOString(),
      debug: {
        errorMessage: error.message,
        note: 'API failed - showing zero prices instead of mock data',
        suggestion: 'Check 1inch API key configuration'
      }
    });
  }
});

// ===== EXPORT ROUTER =====
// Export the router so it can be used in the main server file
export { router };
export default router;

// ===== 1INCH API DEBUG ENDPOINT =====
// Debug endpoint to test 1inch API connectivity
router.get('/debug/1inch', async (req, res) => {
  try {
    console.log('🔍 Testing 1inch API connectivity...');

    const oneInchApiKey = process.env.ONEINCH_API_KEY;
    console.log('🔑 API Key available:', !!oneInchApiKey);

    const testAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'; // ETH
    const testUrl = `https://api.1inch.dev/price/v1.1/1/${testAddress}`;

    console.log('📞 Test URL:', testUrl);

    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'BitWallet/1.0'
    };

    if (oneInchApiKey) {
      headers['Authorization'] = `Bearer ${oneInchApiKey}`;
    }

    console.log('📋 Request headers:', headers);

    const response = await fetch(testUrl, { headers });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 1inch API test successful:', data);
      
      res.json({
        success: true,
        status: response.status,
        data,
        message: '1inch API is working',
        hasApiKey: !!oneInchApiKey
      });
    } else {
      const errorText = await response.text();
      console.log('❌ 1inch API test failed:', errorText);
      
      res.json({
        success: false,
        status: response.status,
        error: errorText,
        message: '1inch API returned an error',
        hasApiKey: !!oneInchApiKey
      });
    }
  } catch (error) {
    console.error('❌ 1inch API test error:', error);
    
    res.json({
      success: false,
      error: error.message,
      message: 'Failed to connect to 1inch API',
      hasApiKey: !!process.env.ONEINCH_API_KEY
    });
  }
});

