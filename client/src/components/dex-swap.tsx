
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, RefreshCw, Info, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types for the swap component
interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
  price?: number;
  balance?: string;
}

interface SwapQuote {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  price: number;
  priceImpact: number;
  fee: string;
  route: string[];
  estimatedGas: string;
  provider: string;
}

// Popular tokens across multiple chains
const POPULAR_TOKENS: Token[] = [
  // Ethereum Mainnet
  { symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c951449b402c7C27D170c54E0F13A8BfD', decimals: 6 },
  { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
  { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
  { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
  { symbol: 'AAVE', name: 'Aave', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18 },
  { symbol: 'MKR', name: 'Maker', address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', decimals: 18 },
  
  // BSC Tokens
  { symbol: 'BNB', name: 'BNB', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  { symbol: 'BUSD', name: 'Binance USD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 },
  { symbol: 'CAKE', name: 'PancakeSwap', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18 },
  
  // Polygon Tokens
  { symbol: 'MATIC', name: 'Polygon', address: '0x0000000000000000000000000000000000001010', decimals: 18 },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
  
  // Solana Tokens
  { symbol: 'SOL', name: 'Solana', address: 'So11111111111111111111111111111111111111112', decimals: 9 },
  { symbol: 'USDC-SOL', name: 'USD Coin (Solana)', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
  { symbol: 'RAY', name: 'Raydium', address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', decimals: 6 },
];

// Supported networks
const NETWORKS = [
  { id: 'ethereum', name: 'Ethereum', chainId: 1 },
  { id: 'bsc', name: 'Binance Smart Chain', chainId: 56 },
  { id: 'polygon', name: 'Polygon', chainId: 137 },
  { id: 'solana', name: 'Solana', chainId: 0 },
  { id: 'avalanche', name: 'Avalanche', chainId: 43114 },
];

export function DexSwap() {
  const { toast } = useToast();
  
  // State management
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);
  const [fromToken, setFromToken] = useState<Token | null>(POPULAR_TOKENS[0]);
  const [toToken, setToToken] = useState<Token | null>(POPULAR_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});

  // Filter tokens by network
  const getTokensForNetwork = (networkId: string): Token[] => {
    // In a real app, you'd filter by network
    return POPULAR_TOKENS;
  };

  // Fetch token prices from CoinGecko
  const fetchTokenPrices = async () => {
    try {
      const response = await fetch('/api/crypto-prices');
      if (response.ok) {
        const data = await response.json();
        setTokenPrices(data);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  // Get swap quote using multiple providers
  const getSwapQuote = async (from: Token, to: Token, amount: string): Promise<SwapQuote | null> => {
    if (!amount || !from || !to) return null;
    
    try {
      setIsLoading(true);
      
      // Try multiple quote providers
      const providers = [
        { name: 'CoinGecko', getQuote: getCoinGeckoQuote },
        { name: 'Moralis', getQuote: getMoralisQuote },
        { name: 'Jupiter', getQuote: getJupiterQuote },
      ];

      for (const provider of providers) {
        try {
          const quote = await provider.getQuote(from, to, amount);
          if (quote) {
            console.log(`✅ Got quote from ${provider.name}`);
            return quote;
          }
        } catch (error) {
          console.warn(`❌ ${provider.name} failed:`, error);
          continue;
        }
      }

      // Fallback to mock quote
      return getMockQuote(from, to, amount);
      
    } catch (error) {
      console.error('Error getting swap quote:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // CoinGecko-based quote (using price data)
  const getCoinGeckoQuote = async (from: Token, to: Token, amount: string): Promise<SwapQuote | null> => {
    const fromPrice = tokenPrices[from.symbol.toLowerCase()] || 0;
    const toPrice = tokenPrices[to.symbol.toLowerCase()] || 0;
    
    if (!fromPrice || !toPrice) return null;
    
    const fromAmountNum = parseFloat(amount);
    const toAmountNum = (fromAmountNum * fromPrice) / toPrice;
    
    return {
      fromToken: from,
      toToken: to,
      fromAmount: amount,
      toAmount: toAmountNum.toFixed(6),
      price: fromPrice / toPrice,
      priceImpact: 0.5, // Mock 0.5% impact
      fee: '0.3%',
      route: [from.symbol, to.symbol],
      estimatedGas: '21000',
      provider: 'CoinGecko'
    };
  };

  // Moralis API quote (placeholder)
  const getMoralisQuote = async (from: Token, to: Token, amount: string): Promise<SwapQuote | null> => {
    // In production, you'd call Moralis API here
    const response = await fetch('/api/moralis/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: from.address, to: to.address, amount })
    });
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  };

  // Jupiter API quote for Solana
  const getJupiterQuote = async (from: Token, to: Token, amount: string): Promise<SwapQuote | null> => {
    if (selectedNetwork.id !== 'solana') return null;
    
    try {
      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${from.address}&outputMint=${to.address}&amount=${amount}&slippageBps=50`
      );
      
      if (response.ok) {
        const data = await response.json();
        return {
          fromToken: from,
          toToken: to,
          fromAmount: amount,
          toAmount: data.outAmount,
          price: parseFloat(data.outAmount) / parseFloat(amount),
          priceImpact: data.priceImpactPct || 0,
          fee: '0.25%',
          route: data.routePlan?.map(r => r.swapInfo.outputMint) || [from.symbol, to.symbol],
          estimatedGas: 'N/A',
          provider: 'Jupiter'
        };
      }
    } catch (error) {
      console.error('Jupiter API error:', error);
    }
    return null;
  };

  // Mock quote for demo purposes
  const getMockQuote = async (from: Token, to: Token, amount: string): Promise<SwapQuote> => {
    const fromAmountNum = parseFloat(amount);
    const mockRate = Math.random() * 100 + 1; // Random exchange rate
    const toAmountNum = fromAmountNum * mockRate;
    
    return {
      fromToken: from,
      toToken: to,
      fromAmount: amount,
      toAmount: toAmountNum.toFixed(6),
      price: mockRate,
      priceImpact: Math.random() * 2, // 0-2% price impact
      fee: '0.3%',
      route: [from.symbol, to.symbol],
      estimatedGas: '150000',
      provider: 'Mock'
    };
  };

  // Handle amount input changes
  const handleFromAmountChange = async (value: string) => {
    setFromAmount(value);
    if (value && fromToken && toToken) {
      const newQuote = await getSwapQuote(fromToken, toToken, value);
      if (newQuote) {
        setQuote(newQuote);
        setToAmount(newQuote.toAmount);
      }
    } else {
      setToAmount('');
      setQuote(null);
    }
  };

  // Swap token positions
  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount('');
    setToAmount('');
    setQuote(null);
  };

  // Execute the swap
  const handleSwap = async () => {
    if (!quote || !fromToken || !toToken) {
      toast({
        variant: "destructive",
        title: "Invalid swap",
        description: "Please get a quote first"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // In production, this would execute the actual swap
      const response = await fetch('/api/swap/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: fromToken.address,
          toToken: toToken.address,
          amount: fromAmount,
          quote: quote,
          network: selectedNetwork.id
        })
      });

      if (response.ok) {
        toast({
          title: "Swap successful!",
          description: `Swapped ${fromAmount} ${fromToken.symbol} for ${quote.toAmount} ${toToken.symbol}`
        });
        
        // Reset form
        setFromAmount('');
        setToAmount('');
        setQuote(null);
      } else {
        throw new Error('Swap failed');
      }
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Swap failed",
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load token prices on component mount
  useEffect(() => {
    fetchTokenPrices();
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Swap Tokens</h2>
          <RefreshCw 
            className="h-4 w-4 cursor-pointer hover:text-blue-600" 
            onClick={fetchTokenPrices}
          />
        </div>

        {/* Network Selection */}
        <div>
          <label className="text-sm font-medium mb-1 block">Network</label>
          <Select value={selectedNetwork.id} onValueChange={(value) => {
            const network = NETWORKS.find(n => n.id === value);
            if (network) setSelectedNetwork(network);
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NETWORKS.map((network) => (
                <SelectItem key={network.id} value={network.id}>
                  {network.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* From Token */}
        <div className="space-y-2">
          <label className="text-sm font-medium">From</label>
          <div className="flex gap-2">
            <Select value={fromToken?.symbol || ''} onValueChange={(value) => {
              const token = getTokensForNetwork(selectedNetwork.id).find(t => t.symbol === value);
              setFromToken(token || null);
            }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getTokensForNetwork(selectedNetwork.id).map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => handleFromAmountChange(e.target.value)}
              className="flex-1"
            />
          </div>
          {fromToken && tokenPrices[fromToken.symbol.toLowerCase()] && (
            <p className="text-xs text-gray-500">
              1 {fromToken.symbol} = ${tokenPrices[fromToken.symbol.toLowerCase()]?.toFixed(2)}
            </p>
          )}
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwapTokens}
            className="h-8 w-8 p-0"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <label className="text-sm font-medium">To</label>
          <div className="flex gap-2">
            <Select value={toToken?.symbol || ''} onValueChange={(value) => {
              const token = getTokensForNetwork(selectedNetwork.id).find(t => t.symbol === value);
              setToToken(token || null);
            }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getTokensForNetwork(selectedNetwork.id).map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="0.0"
              value={toAmount}
              readOnly
              className="flex-1 bg-gray-50"
            />
          </div>
          {toToken && tokenPrices[toToken.symbol.toLowerCase()] && (
            <p className="text-xs text-gray-500">
              1 {toToken.symbol} = ${tokenPrices[toToken.symbol.toLowerCase()]?.toFixed(2)}
            </p>
          )}
        </div>

        {/* Quote Information */}
        {quote && (
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4" />
              <span className="font-medium">Quote Details</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Price: {quote.price.toFixed(6)}</div>
              <div>Impact: {quote.priceImpact.toFixed(2)}%</div>
              <div>Fee: {quote.fee}</div>
              <div>Provider: {quote.provider}</div>
            </div>
            <div className="text-xs text-gray-600">
              Route: {quote.route.join(' → ')}
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="text-xs text-amber-700">
            <p className="font-medium">Demo Mode</p>
            <p>This is a demo swap interface. Real swaps require wallet connection and sufficient funds.</p>
          </div>
        </div>

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={!quote || isLoading || !fromAmount}
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Swap ${fromToken?.symbol || ''} for ${toToken?.symbol || ''}`
          )}
        </Button>
      </div>
    </Card>
  );
}

export default DexSwap;
