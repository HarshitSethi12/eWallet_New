import { Router } from "express";
import type { Application } from "express";
import { createServer } from "http";

export function registerRoutes(app: Application) {
  const router = Router();

  // Token list endpoint for 1inch integration
  router.get("/api/tokens", async (req, res) => {
    try {
      console.log('🔍 Fetching token data...');

      // Define tokens we want to fetch prices for with correct mainnet addresses
      const tokens = [
        { symbol: 'ETH', name: 'Ethereum', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', balance: '2.5', logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
        { symbol: 'USDC', name: 'USD Coin', address: '0xa0b86a33e6441e8c18d94ec8e42a99f0ba44683a', balance: '1000', logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png' },
        { symbol: 'USDT', name: 'Tether USD', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', balance: '500', logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', balance: '0.1', logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png' },
        { symbol: 'LINK', name: 'Chainlink', address: '0x514910771af9ca656af840dff83e8264ecf986ca', balance: '150', logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' }
      ];

      let priceData = {};
      let dataSource = 'fallback';

      // Try 1inch API first as priority
      try {
        console.log('🔄 Trying 1inch API as primary source...');
        const apiKey = process.env.ONEINCH_API_KEY;

        if (apiKey) {
          const tokenAddresses = tokens.map(t => t.address).join(',');
          const oneInchUrl = `https://api.1inch.dev/price/v1.1/1/${tokenAddresses}`;

          console.log('📡 1inch API URL:', oneInchUrl);

          const response = await fetch(oneInchUrl, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json'
            }
          });

          console.log('📊 1inch Response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('✅ 1inch API data received:', Object.keys(data).length, 'tokens');
            console.log('📋 Raw 1inch data:', data);

            // Process 1inch data
            priceData = {};
            for (const [address, price] of Object.entries(data)) {
              const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
              if (token && typeof price === 'number') {
                priceData[token.symbol.toLowerCase()] = {
                  usd: price,
                  usd_24h_change: 0 // 1inch doesn't provide 24h change
                };
                console.log(`📈 Added ${token.symbol} price from 1inch: $${price}`);
              }
            }
            
            if (Object.keys(priceData).length > 0) {
              dataSource = '1inch';
              console.log('✅ Using 1inch as primary data source');
            }
          } else {
            const errorText = await response.text();
            console.log('❌ 1inch API failed with status:', response.status, 'Error:', errorText);
          }
        } else {
          console.log('⚠️ No 1inch API key found in environment variables');
        }
      } catch (error) {
        console.error('❌ 1inch API error:', error.message);
      }

      // Use CoinGecko as fallback only if 1inch failed
      if (Object.keys(priceData).length === 0) {
        try {
          console.log('🔄 Falling back to CoinGecko...');
          const coinIds = 'ethereum,usd-coin,tether,wrapped-bitcoin,chainlink';
          const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`;

          const response = await fetch(cgUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'BitWallet/1.0'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ CoinGecko API data received (fallback)');

            // Map CoinGecko IDs to our token symbols
            const coinGeckoMap = {
              'ethereum': 'eth',
              'usd-coin': 'usdc',
              'tether': 'usdt',
              'wrapped-bitcoin': 'wbtc',
              'chainlink': 'link'
            };

            priceData = {};
            for (const [coinId, tokenData] of Object.entries(data)) {
              const symbol = coinGeckoMap[coinId];
              if (symbol && tokenData && typeof tokenData.usd === 'number') {
                priceData[symbol] = {
                  usd: tokenData.usd,
                  usd_24h_change: tokenData.usd_24h_change || 0
                };
              }
            }
            dataSource = 'coingecko';
            console.log('✅ Using CoinGecko as fallback');
          } else {
            console.log('❌ CoinGecko fallback failed with status:', response.status);
          }
        } catch (error) {
          console.error('❌ CoinGecko fallback error:', error.message);
        }
      }

      // Fallback with current realistic prices if all APIs failed
      if (Object.keys(priceData).length === 0) {
        console.log('⚠️ Using fallback mock data with current market prices');
        priceData = {
          'eth': { usd: 3420.50, usd_24h_change: 2.3 },
          'usdc': { usd: 1.00, usd_24h_change: -0.05 },
          'usdt': { usd: 1.00, usd_24h_change: 0.02 },
          'wbtc': { usd: 67800.00, usd_24h_change: 1.8 },
          'link': { usd: 14.85, usd_24h_change: 5.7 }
        };
        dataSource = 'mock';
      }

      // Calculate balances and format response
      const enrichedTokens = tokens.map(token => {
        const priceInfo = priceData[token.symbol.toLowerCase()];
        const balance = parseFloat(token.balance) || 0;
        const price = priceInfo?.usd || 0;

        if (!priceInfo) {
          console.warn(`⚠️ No price data for ${token.symbol}`);
        }

        return {
          ...token,
          price: price,
          change24h: priceInfo?.usd_24h_change || 0,
          balanceUSD: balance * price
        };
      });

      console.log('📋 Final token data:', enrichedTokens.length, 'tokens processed');
      console.log('💰 Sample prices:', enrichedTokens.slice(0, 3).map(t => `${t.symbol}: $${t.price.toFixed(2)}`));

      res.json({
        tokens: enrichedTokens,
        source: dataSource,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Token API error:', error);
      res.status(500).json({
        error: 'Failed to fetch token data',
        details: error.message,
        tokens: [] // Return empty array instead of crashing
      });
    }
  });

  // Get swap quote endpoint
  router.get('/api/swap-quote', async (req, res) => {
    try {
      const { fromToken, toToken, amount } = req.query;

      // Mock quote data - in production, this would call 1inch API
      const mockQuote = {
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: (parseFloat(amount as string) * 0.998).toString(), // Mock 0.2% slippage
        estimatedGas: '150000',
        protocols: ['Uniswap_V3', 'SushiSwap'],
        route: [
          { name: 'Uniswap V3', percentage: 60 },
          { name: 'SushiSwap', percentage: 40 }
        ]
      };

      res.json(mockQuote);
    } catch (error) {
      console.error('Error getting swap quote:', error);
      res.status(500).json({ error: 'Failed to get swap quote' });
    }
  });

  // Execute swap endpoint
  router.post('/api/execute-swap', async (req, res) => {
    try {
      const { fromToken, toToken, amount, userAddress } = req.body;

      // Mock transaction data - in production, this would execute the swap
      const mockTransaction = {
        hash: '0x' + Math.random().toString(16).substring(2, 66),
        status: 'pending',
        fromToken,
        toToken,
        amount,
        userAddress,
        timestamp: new Date().toISOString()
      };

      res.json(mockTransaction);
    } catch (error) {
      console.error('Error executing swap:', error);
      res.status(500).json({ error: 'Failed to execute swap' });
    }
  });

  // Get primary wallet for authenticated user
  router.get('/api/wallet/primary', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session?.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = req.session.user;

      // For MetaMask users, create a wallet based on their connected address
      if (user.provider === 'metamask' && user.walletAddress) {
        const mockWallet = {
          id: `wallet_${user.walletAddress}`,
          address: user.walletAddress,
          name: `MetaMask Wallet`,
          balance: '2.5',
          balanceUSD: 6250.00,
          privateKey: null, // Never expose private keys
          createdAt: new Date().toISOString(),
          userId: user.id
        };

        return res.json(mockWallet);
      }

      // For other users, create a mock wallet
      const mockWallet = {
        id: `wallet_${user.id}`,
        address: '0x742d35Cc6634C0532925a3b8D1b9E7c0896B79dC',
        name: 'Primary Wallet',
        balance: '1.5',
        balanceUSD: 3750.00,
        privateKey: null,
        createdAt: new Date().toISOString(),
        userId: user.id
      };

      res.json(mockWallet);
    } catch (error) {
      console.error('Error fetching primary wallet:', error);
      res.status(500).json({ error: 'Failed to fetch primary wallet' });
    }
  });

  // Get user token balances
  router.get('/api/wallet/tokens/:address', async (req, res) => {
    try {
      const { address } = req.params;

      // Mock token balances - in production, this would fetch from blockchain
      const mockBalances = [
        {
          symbol: 'ETH',
          name: 'Ethereum',
          address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          balance: '2.5',
          balanceUSD: 6250.00,
          price: 2500.00,
          change24h: 2.5
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0xa0b86a33e6441b8c18d94ec8e42a99f0ba44683a',
          balance: '1000.0',
          balanceUSD: 1000.00,
          price: 1.00,
          change24h: 0.1
        }
      ];

      res.json({ tokens: mockBalances });
    } catch (error) {
      console.error('Error fetching wallet tokens:', error);
      res.status(500).json({ error: 'Failed to fetch wallet tokens' });
    }
  });

  // MetaMask authentication endpoint
  router.post('/api/auth/metamask', async (req, res) => {
    try {
      const { message, signature, address } = req.body;

      // Validate required fields
      if (!message || !signature || !address) {
        return res.status(400).json({ error: 'Missing required fields: message, signature, and address' });
      }

      // Validate address format (basic Ethereum address validation)
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ error: 'Invalid Ethereum address format' });
      }

      // In a real implementation, you would verify the signature here
      // For now, we'll create a mock user session
      const metamaskUser = {
        id: `metamask_${address}`,
        walletAddress: address,
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        provider: 'metamask',
        picture: null
      };

      // Store user in session (assuming you have session middleware)
      if (req.session) {
        req.session.user = metamaskUser;
      }

      res.json({
        success: true,
        user: metamaskUser,
        message: 'MetaMask authentication successful'
      });
    } catch (error) {
      console.error('MetaMask authentication error:', error);
      res.status(500).json({ error: 'MetaMask authentication failed' });
    }
  });

  app.use(router);

  // Create and return the HTTP server
  const server = createServer(app);
  return server;
}