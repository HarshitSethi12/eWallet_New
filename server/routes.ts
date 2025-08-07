
import { Router } from "express";
import type { Application } from "express";

export function registerRoutes(app: Application) {
  const router = Router();
  
  // Token list endpoint for 1inch integration
  router.get('/api/tokens', async (req, res) => {
    try {
      // Mock token data - in production, this would fetch from 1inch API
      const mockTokens = [
        {
          symbol: 'ETH',
          name: 'Ethereum',
          address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          decimals: 18,
          logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
          price: 2500.00,
          change24h: 2.5
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0xa0b86a33e6441b8c18d94ec8e42a99f0ba44683a',
          decimals: 6,
          logoURI: 'https://tokens.1inch.io/0xa0b86a33e6441b8c18d94ec8e42a99f0ba44683a.png',
          price: 1.00,
          change24h: 0.1
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
          decimals: 6,
          logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
          price: 1.00,
          change24h: -0.05
        },
        {
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin',
          address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
          decimals: 8,
          logoURI: 'https://tokens.1inch.io/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png',
          price: 45000.00,
          change24h: 1.8
        }
      ];
      
      res.json({ tokens: mockTokens });
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

  app.use(router);
}
