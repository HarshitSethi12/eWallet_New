
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ShoppingCart, 
  DollarSign, 
  ArrowUpDown,
  Wallet,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface TokenData {
  symbol: string;
  name: string;
  address: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  userBalance?: number;
  userBalanceUSD?: number;
  logoURI?: string;
  chainId: number;
}

interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  priceImpact: number;
  fee: string;
  provider: string;
}

export function EnhancedTokenList() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // State management
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [userTokens, setUserTokens] = useState<TokenData[]>([]);
  
  // Trading state
  const [tradeAmount, setTradeAmount] = useState('');
  const [swapToToken, setSwapToToken] = useState<string>('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isTrading, setIsTrading] = useState(false);

  // Supported chains
  const chains = [
    { id: 'ethereum', name: 'Ethereum', chainId: 1 },
    { id: 'bsc', name: 'BSC', chainId: 56 },
    { id: 'polygon', name: 'Polygon', chainId: 137 },
  ];

  // Fetch token data with Moralis/CoinGecko
  const fetchTokenData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Fetching token data...');
      
      // Try Moralis first
      let tokenData = await fetchMoralisTokens();
      
      // Fallback to current API
      if (!tokenData || tokenData.length === 0) {
        const response = await fetch('/api/tokens');
        if (response.ok) {
          const data = await response.json();
          tokenData = data.tokens || [];
        }
      }
      
      setTokens(tokenData);
      
      // If user is authenticated, fetch their balances
      if (isAuthenticated && user?.walletAddress) {
        await fetchUserBalances(user.walletAddress);
      }
      
    } catch (error) {
      console.error('Error fetching token data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch token data"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch tokens using Moralis API
  const fetchMoralisTokens = async (): Promise<TokenData[]> => {
    try {
      const response = await fetch('/api/moralis/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chain: selectedChain,
          limit: 50 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.tokens || [];
      }
    } catch (error) {
      console.warn('Moralis API failed, using fallback');
    }
    return [];
  };

  // Fetch user's token balances
  const fetchUserBalances = async (walletAddress: string) => {
    try {
      const response = await fetch('/api/moralis/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address: walletAddress,
          chain: selectedChain 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserTokens(data.tokens || []);
        
        // Update tokens with user balances
        setTokens(prevTokens => 
          prevTokens.map(token => {
            const userToken = data.tokens.find(ut => 
              ut.address.toLowerCase() === token.address.toLowerCase()
            );
            return userToken ? { ...token, ...userToken } : token;
          })
        );
      }
    } catch (error) {
      console.error('Error fetching user balances:', error);
    }
  };

  // Get swap quote
  const getSwapQuote = async (fromToken: string, toToken: string, amount: string) => {
    try {
      const response = await fetch('/api/swap/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken,
          toToken,
          amount,
          network: selectedChain
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuote(data.quote);
      }
    } catch (error) {
      console.error('Error getting swap quote:', error);
    }
  };

  // Handle buy with INR
  const handleBuyWithINR = async () => {
    if (!selectedToken || !tradeAmount) return;
    
    setIsTrading(true);
    try {
      const response = await fetch('/api/trade/buy-inr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: selectedToken.address,
          amountINR: tradeAmount,
          userAddress: user?.walletAddress
        })
      });
      
      if (response.ok) {
        toast({
          title: "Purchase Successful!",
          description: `Bought ${selectedToken.symbol} worth ₹${tradeAmount}`
        });
        setSelectedToken(null);
        setTradeAmount('');
        fetchTokenData();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Purchase Failed",
        description: error.message
      });
    } finally {
      setIsTrading(false);
    }
  };

  // Handle sell to INR
  const handleSellToINR = async () => {
    if (!selectedToken || !tradeAmount) return;
    
    setIsTrading(true);
    try {
      const response = await fetch('/api/trade/sell-inr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: selectedToken.address,
          amount: tradeAmount,
          userAddress: user?.walletAddress
        })
      });
      
      if (response.ok) {
        toast({
          title: "Sale Successful!",
          description: `Sold ${tradeAmount} ${selectedToken.symbol}`
        });
        setSelectedToken(null);
        setTradeAmount('');
        fetchTokenData();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sale Failed",
        description: error.message
      });
    } finally {
      setIsTrading(false);
    }
  };

  // Handle token swap
  const handleSwap = async () => {
    if (!selectedToken || !swapToToken || !tradeAmount || !quote) return;
    
    setIsTrading(true);
    try {
      const response = await fetch('/api/swap/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: selectedToken.address,
          toToken: swapToToken,
          amount: tradeAmount,
          quote: quote,
          userAddress: user?.walletAddress,
          network: selectedChain
        })
      });
      
      if (response.ok) {
        toast({
          title: "Swap Successful!",
          description: `Swapped ${tradeAmount} ${selectedToken.symbol}`
        });
        setSelectedToken(null);
        setTradeAmount('');
        setSwapToToken('');
        setQuote(null);
        fetchTokenData();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Swap Failed",
        description: error.message
      });
    } finally {
      setIsTrading(false);
    }
  };

  // Filter tokens based on search
  const filteredTokens = tokens.filter(token =>
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Load data on component mount and chain change
  useEffect(() => {
    fetchTokenData();
  }, [selectedChain, isAuthenticated]);

  // Get quote when swap parameters change
  useEffect(() => {
    if (selectedToken && swapToToken && tradeAmount) {
      getSwapQuote(selectedToken.address, swapToToken, tradeAmount);
    }
  }, [selectedToken, swapToToken, tradeAmount]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Token Trading
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchTokenData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search and Chain Selection */}
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select value={selectedChain} onValueChange={setSelectedChain}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {chains.map((chain) => (
                <SelectItem key={chain.id} value={chain.id}>
                  {chain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Token List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTokens.map((token) => (
            <div
              key={token.address}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {token.logoURI ? (
                  <img 
                    src={token.logoURI} 
                    alt={token.name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-semibold">
                      {token.symbol.slice(0, 2)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold">{token.symbol}</p>
                  <p className="text-sm text-gray-500">{token.name}</p>
                  {token.userBalance && (
                    <p className="text-xs text-blue-600">
                      Balance: {token.userBalance.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-semibold">${token.price.toFixed(6)}</p>
                <Badge variant={token.change24h >= 0 ? "default" : "destructive"}>
                  {token.change24h >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(token.change24h).toFixed(2)}%
                </Badge>
                
                {/* Trade Button */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setSelectedToken(token)}
                      disabled={!isAuthenticated}
                    >
                      Trade
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        Trade {selectedToken?.symbol}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <Tabs defaultValue="buy" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="buy">Buy</TabsTrigger>
                        <TabsTrigger value="sell">Sell</TabsTrigger>
                        <TabsTrigger value="swap">Swap</TabsTrigger>
                      </TabsList>
                      
                      {/* Buy Tab */}
                      <TabsContent value="buy" className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Amount (INR)</label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={tradeAmount}
                            onChange={(e) => setTradeAmount(e.target.value)}
                          />
                          {tradeAmount && selectedToken && (
                            <p className="text-xs text-gray-500 mt-1">
                              ≈ {(parseFloat(tradeAmount) / selectedToken.price).toFixed(6)} {selectedToken.symbol}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={handleBuyWithINR}
                          disabled={isTrading || !tradeAmount}
                          className="w-full"
                        >
                          {isTrading ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              Buy with INR
                            </>
                          )}
                        </Button>
                      </TabsContent>
                      
                      {/* Sell Tab */}
                      <TabsContent value="sell" className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">
                            Amount ({selectedToken?.symbol})
                          </label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={tradeAmount}
                            onChange={(e) => setTradeAmount(e.target.value)}
                            max={selectedToken?.userBalance || 0}
                          />
                          {tradeAmount && selectedToken && (
                            <p className="text-xs text-gray-500 mt-1">
                              ≈ ₹{(parseFloat(tradeAmount) * selectedToken.price * 83).toFixed(2)} INR
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={handleSellToINR}
                          disabled={isTrading || !tradeAmount || !selectedToken?.userBalance}
                          className="w-full"
                        >
                          {isTrading ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <DollarSign className="mr-2 h-4 w-4" />
                              Sell for INR
                            </>
                          )}
                        </Button>
                      </TabsContent>
                      
                      {/* Swap Tab */}
                      <TabsContent value="swap" className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">
                            Amount ({selectedToken?.symbol})
                          </label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={tradeAmount}
                            onChange={(e) => setTradeAmount(e.target.value)}
                            max={selectedToken?.userBalance || 0}
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Swap To</label>
                          <Select value={swapToToken} onValueChange={setSwapToToken}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select token" />
                            </SelectTrigger>
                            <SelectContent>
                              {userTokens
                                .filter(t => t.address !== selectedToken?.address)
                                .map((token) => (
                                  <SelectItem key={token.address} value={token.address}>
                                    {token.symbol} - {token.userBalance?.toFixed(4)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {quote && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 text-sm mb-2">
                              <Info className="h-4 w-4" />
                              <span className="font-medium">Quote</span>
                            </div>
                            <div className="text-sm space-y-1">
                              <div>You get: {quote.toAmount}</div>
                              <div>Price impact: {quote.priceImpact.toFixed(2)}%</div>
                              <div>Fee: {quote.fee}</div>
                              <div>Provider: {quote.provider}</div>
                            </div>
                          </div>
                        )}
                        
                        <Button
                          onClick={handleSwap}
                          disabled={isTrading || !tradeAmount || !swapToToken || !quote}
                          className="w-full"
                        >
                          {isTrading ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <ArrowUpDown className="mr-2 h-4 w-4" />
                              Swap Tokens
                            </>
                          )}
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
        
        {!isAuthenticated && (
          <div className="text-center py-8 text-gray-500">
            <p>Connect your wallet to view balances and trade</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EnhancedTokenList;
