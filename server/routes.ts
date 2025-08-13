
import { Router } from "express";
import type { Application } from "express";
import { createServer } from "http";

export function registerRoutes(app: Application) {
  const router = Router();
  
  // Token list endpoint for 1inch integration
  router.get('/api/tokens', async (req, res) => {
    try {
      // First try to get token data from 1inch API if API key is available
      let tokenPrices = {};
      
      if (process.env.ONEINCH_API_KEY) {
        try {
          const chainId = 1; // Ethereum mainnet
          const oneInchResponse = await fetch(`https://api.1inch.dev/price/v1.1/${chainId}`, {
            headers: {
              'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
              'Accept': 'application/json'
            }
          });

          if (oneInchResponse.ok) {
            tokenPrices = await oneInchResponse.json();
            console.log('✅ Using 1inch API for token prices');
          }
        } catch (error) {
          console.warn('⚠️ 1inch API failed, falling back to CoinGecko:', error.message);
        }
      }

      // Fallback to CoinGecko for price data
      let priceData = {};
      if (Object.keys(tokenPrices).length === 0) {
        try {
          const priceResponse = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin,tether,wrapped-bitcoin,chainlink,uniswap,bitcoin&vs_currencies=usd&include_24hr_change=true'
          );
          priceData = await priceResponse.json();
          console.log('✅ Using CoinGecko API for token prices');
        } catch (error) {
          console.error('❌ Both APIs failed:', error);
        }
      }

      // Token addresses for 1inch price lookup
      const ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      const USDC_ADDRESS = '0xa0b86a33e6441b8c18d94ec8e42a99f0ba44683a';
      const USDT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
      const WBTC_ADDRESS = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
      const LINK_ADDRESS = '0x514910771af9ca656af840dff83e8264ecf986ca';
      const UNI_ADDRESS = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';

      // Helper function to get price from 1inch or fallback to CoinGecko
      const getTokenPrice = (address, coinGeckoId, fallbackPrice) => {
        if (tokenPrices[address]) {
          return parseFloat(tokenPrices[address]) / Math.pow(10, 18); // Convert from wei if needed
        }
        return priceData[coinGeckoId]?.usd || fallbackPrice;
      };

      const getTokenChange = (coinGeckoId, fallbackChange) => {
        return priceData[coinGeckoId]?.usd_24h_change || fallbackChange;
      };

      // Map the popular tokens with their prices
      const popularTokens = [
        {
          symbol: 'ETH',
          name: 'Ethereum',
          address: ETH_ADDRESS,
          decimals: 18,
          logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
          price: getTokenPrice(ETH_ADDRESS, 'ethereum', 2340.50),
          change24h: getTokenChange('ethereum', 5.2)
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: USDC_ADDRESS,
          decimals: 6,
          logoURI: 'https://tokens.1inch.io/0xa0b86a33e6441b8c18d94ec8e42a99f0ba44683a.png',
          price: getTokenPrice(USDC_ADDRESS, 'usd-coin', 1.00),
          change24h: getTokenChange('usd-coin', -0.1)
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          address: USDT_ADDRESS,
          decimals: 6,
          logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
          price: getTokenPrice(USDT_ADDRESS, 'tether', 1.00),
          change24h: getTokenChange('tether', -0.05)
        },
        {
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin',
          address: WBTC_ADDRESS,
          decimals: 8,
          logoURI: 'https://tokens.1inch.io/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png',
          price: getTokenPrice(WBTC_ADDRESS, 'wrapped-bitcoin', 45000.00),
          change24h: getTokenChange('wrapped-bitcoin', 1.8)
        },
        {
          symbol: 'LINK',
          name: 'Chainlink',
          address: LINK_ADDRESS,
          decimals: 18,
          logoURI: 'https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png',
          price: getTokenPrice(LINK_ADDRESS, 'chainlink', 14.25),
          change24h: getTokenChange('chainlink', 8.7)
        },
        {
          symbol: 'UNI',
          name: 'Uniswap',
          address: UNI_ADDRESS,
          decimals: 18,
          logoURI: 'https://tokens.1inch.io/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984.png',
          price: getTokenPrice(UNI_ADDRESS, 'uniswap', 6.80),
          change24h: getTokenChange('uniswap', -3.2)
        }
      ];
      
      res.json({ 
        tokens: popularTokens,
        source: Object.keys(tokenPrices).length > 0 ? '1inch' : 'coingecko'
      });
    } catch (error) {
      console.error('Error fetching tokens:', error);
      res.status(500).json({ error: 'Failed to fetch tokens' });
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
