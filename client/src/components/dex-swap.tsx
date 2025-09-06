
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, RefreshCw, Info, AlertTriangle, Wallet, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMetaMask } from "@/hooks/use-metamask";
import { useAuth } from "@/hooks/use-auth";

// Enhanced token interface for AMM
interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
  price?: number;
}

// AMM-specific quote interface
interface AMMQuote {
  fromToken: string;
  toToken: string;
  inputAmount: string;
  outputAmount: string;
  price: number;
  currentPoolPrice: number;
  priceImpact: string;
  fee: string;
  minReceived: string;
  route: string[];
  provider: string;
  poolId: string;
  poolInfo: {
    reserveIn: string;
    reserveOut: string;
    totalLiquidity: string;
  };
}

// Popular tokens for AMM trading
const AMM_TOKENS: Token[] = [
  { symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c951449b402c7C27D170c54E0F13A8BfD', decimals: 6 },
  { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
  { symbol: 'BTC', name: 'Bitcoin', address: 'bitcoin', decimals: 8 },
  { symbol: 'INR', name: 'Indian Rupee', address: 'inr', decimals: 2 },
];

export function DexSwap() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const metamask = useMetaMask();
  
  // State management
  const [fromToken, setFromToken] = useState<Token>(AMM_TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(AMM_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<AMMQuote | null>(null);
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [pools, setPools] = useState([]);

  // Fetch user token balances from MetaMask
  const fetchTokenBalances = async () => {
    if (!metamask.account) return;

    try {
      console.log('🔍 Fetching token balances for:', metamask.account);
      
      // For demo purposes, simulate balance fetching
      // In production, you'd call actual blockchain APIs
      const mockBalances = {
        'ETH': '2.5',
        'USDC': '1000.0',
        'USDT': '500.0',
        'WBTC': '0.1',
        'BTC': '0.05',
        'INR': '50000.0'
      };

      setTokenBalances(mockBalances);
      
      // Update token objects with balances
      AMM_TOKENS.forEach(token => {
        token.balance = mockBalances[token.symbol] || '0';
      });

    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  // Fetch available liquidity pools
  const fetchPools = async () => {
    try {
      const response = await fetch('/api/exchange/pools');
      if (response.ok) {
        const data = await response.json();
        setPools(data.pools || []);
      }
    } catch (error) {
      console.error('Error fetching pools:', error);
    }
  };

  // Get AMM quote from your backend
  const getAMMQuote = async (from: Token, to: Token, amount: string): Promise<AMMQuote | null> => {
    if (!amount || !from || !to || parseFloat(amount) <= 0) return null;
    
    try {
      setIsLoading(true);
      
      console.log(`🔄 Getting AMM quote: ${amount} ${from.symbol} → ${to.symbol}`);
      
      const response = await fetch('/api/exchange/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: from.symbol,
          toToken: to.symbol,
          amount,
          type: 'buy'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ AMM quote received:', data.quote);
        return data.quote;
      } else {
        throw new Error('Failed to get quote');
      }
      
    } catch (error) {
      console.error('Error getting AMM quote:', error);
      toast({
        variant: "destructive",
        title: "Quote Error",
        description: "Failed to get swap quote. Please try again."
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle amount input changes with real-time quotes
  const handleFromAmountChange = async (value: string) => {
    setFromAmount(value);
    
    if (value && fromToken && toToken) {
      const newQuote = await getAMMQuote(fromToken, toToken, value);
      if (newQuote) {
        setQuote(newQuote);
        setToAmount(newQuote.outputAmount);
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

  // Execute AMM swap with MetaMask
  const executeSwap = async () => {
    if (!quote || !fromToken || !toToken) {
      toast({
        variant: "destructive",
        title: "Invalid swap",
        description: "Please get a quote first"
      });
      return;
    }

    if (!metamask.account) {
      toast({
        variant: "destructive",
        title: "Wallet not connected",
        description: "Please connect your MetaMask wallet"
      });
      return;
    }

    // Check if user has sufficient balance
    const userBalance = parseFloat(tokenBalances[fromToken.symbol] || '0');
    const swapAmount = parseFloat(fromAmount);
    
    if (userBalance < swapAmount) {
      toast({
        variant: "destructive",
        title: "Insufficient balance",
        description: `You need ${swapAmount} ${fromToken.symbol} but only have ${userBalance}`
      });
      return;
    }

    try {
      setIsLoading(true);
      
      console.log('🚀 Executing AMM swap...');
      
      // In a real implementation, this would:
      // 1. Request approval for token spending (if not native ETH)
      // 2. Execute the swap transaction through MetaMask
      // 3. Wait for transaction confirmation
      // 4. Update balances
      
      // For demo, we'll simulate the swap
      const response = await fetch('/api/trade/buy-inr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: toToken.address,
          amountINR: fromToken.symbol === 'INR' ? fromAmount : parseFloat(fromAmount) * parseFloat(quote.price),
          userAddress: metamask.account
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "Swap Successful! 🎉",
          description: `Swapped ${fromAmount} ${fromToken.symbol} for ${quote.outputAmount} ${toToken.symbol}`
        });
        
        // Update balances
        setTokenBalances(prev => ({
          ...prev,
          [fromToken.symbol]: (parseFloat(prev[fromToken.symbol] || '0') - parseFloat(fromAmount)).toString(),
          [toToken.symbol]: (parseFloat(prev[toToken.symbol] || '0') + parseFloat(quote.outputAmount)).toString()
        }));
        
        // Reset form
        setFromAmount('');
        setToAmount('');
        setQuote(null);
        
        // Refresh pools data
        fetchPools();
        
      } else {
        throw new Error('Swap transaction failed');
      }
      
    } catch (error) {
      console.error('Swap execution error:', error);
      toast({
        variant: "destructive",
        title: "Swap Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchPools();
    
    if (metamask.account) {
      fetchTokenBalances();
    }
  }, [metamask.account]);

  // Calculate price impact warning level
  const getPriceImpactColor = (impact: string) => {
    const impactNum = parseFloat(impact);
    if (impactNum > 5) return 'text-red-600';
    if (impactNum > 2) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">AMM Swap</h2>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 cursor-pointer hover:text-blue-600" />
            <RefreshCw 
              className="h-4 w-4 cursor-pointer hover:text-blue-600" 
              onClick={() => {
                fetchPools();
                fetchTokenBalances();
              }}
            />
          </div>
        </div>

        {/* Wallet Connection Status */}
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <Wallet className="h-4 w-4" />
          {metamask.account ? (
            <span className="text-sm text-green-600">
              Connected: {metamask.account.slice(0, 6)}...{metamask.account.slice(-4)}
            </span>
          ) : (
            <span className="text-sm text-orange-600">
              Wallet not connected
            </span>
          )}
        </div>

        {/* From Token */}
        <div className="space-y-2">
          <label className="text-sm font-medium">From</label>
          <div className="flex gap-2">
            <Select value={fromToken.symbol} onValueChange={(value) => {
              const token = AMM_TOKENS.find(t => t.symbol === value);
              if (token) setFromToken(token);
            }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AMM_TOKENS.map((token) => (
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
          <div className="flex justify-between text-xs text-gray-500">
            <span>Balance: {tokenBalances[fromToken.symbol] || '0'}</span>
            <button 
              className="text-blue-600 hover:text-blue-800"
              onClick={() => handleFromAmountChange(tokenBalances[fromToken.symbol] || '0')}
            >
              MAX
            </button>
          </div>
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
            <Select value={toToken.symbol} onValueChange={(value) => {
              const token = AMM_TOKENS.find(t => t.symbol === value);
              if (token) setToToken(token);
            }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AMM_TOKENS.map((token) => (
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
          <div className="text-xs text-gray-500">
            Balance: {tokenBalances[toToken.symbol] || '0'}
          </div>
        </div>

        {/* AMM Quote Information */}
        {quote && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4" />
              <span>AMM Pool Information</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-600">Price Impact:</span>
                <span className={`ml-1 font-medium ${getPriceImpactColor(quote.priceImpact)}`}>
                  {quote.priceImpact}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Fee:</span>
                <span className="ml-1 font-medium">{quote.fee}</span>
              </div>
              <div>
                <span className="text-gray-600">Min Received:</span>
                <span className="ml-1 font-medium">{quote.minReceived}</span>
              </div>
              <div>
                <span className="text-gray-600">Pool TVL:</span>
                <span className="ml-1 font-medium">${quote.poolInfo.totalLiquidity}</span>
              </div>
            </div>
            
            <div className="text-xs text-gray-600 border-t pt-2">
              <div>Pool: {quote.poolInfo.reserveIn} {fromToken.symbol} / {quote.poolInfo.reserveOut} {toToken.symbol}</div>
              <div>Rate: 1 {fromToken.symbol} = {quote.price.toFixed(6)} {toToken.symbol}</div>
            </div>
          </div>
        )}

        {/* Price Impact Warning */}
        {quote && parseFloat(quote.priceImpact) > 5 && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
            <div className="text-xs text-red-700">
              <p className="font-medium">High Price Impact Warning</p>
              <p>This swap has a price impact of {quote.priceImpact}%. Consider reducing the amount.</p>
            </div>
          </div>
        )}

        {/* Connect Wallet / Swap Button */}
        {!metamask.account ? (
          <Button
            onClick={metamask.connectWallet}
            disabled={metamask.isLoading}
            className="w-full"
          >
            {metamask.isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect MetaMask
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={executeSwap}
            disabled={!quote || isLoading || !fromAmount || parseFloat(fromAmount) <= 0}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Executing Swap...
              </>
            ) : (
              `Swap ${fromToken.symbol} for ${toToken.symbol}`
            )}
          </Button>
        )}

        {/* Footer Info */}
        <div className="text-xs text-gray-500 text-center">
          <p>Powered by BitWallet AMM • Slippage: {slippageTolerance}%</p>
        </div>
      </div>
    </Card>
  );
}

export default DexSwap;
