
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownUp, Wallet } from "lucide-react";
import { useMetaMask } from "@/hooks/use-metamask";
import { useAuth } from "@/hooks/use-auth";

interface SwapQuote {
  inputAmount: string;
  outputAmount: string;
  price: number;
  priceImpact: number;
  fee: number;
  aggregator: string;
  gas: string;
  route: string[];
}

interface AggregatorQuote {
  name: string;
  logo: string;
  quote: SwapQuote;
  isLoading: boolean;
}

const SUPPORTED_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000' },
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86a33E6411bB63B3F3b95d7fEf3C6b9E6e2ff' },
  { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' }
];

export function DexSwap() {
  const { isConnected, account, connectWallet } = useMetaMask();
  const { user, isAuthenticated } = useAuth();
  
  // Use wallet address from authentication if available
  const walletAddress = account || user?.walletAddress || user?.address;
  const isWalletConnected = isConnected || (isAuthenticated && user?.provider === 'metamask');
  const [fromToken, setFromToken] = useState(SUPPORTED_TOKENS[0]);
  const [toToken, setToToken] = useState(SUPPORTED_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [quotes, setQuotes] = useState<AggregatorQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const AGGREGATORS = [
    { name: '1inch', logo: '🔄', enabled: true },
    { name: 'Paraswap', logo: '🌊', enabled: true },
    { name: '0x', logo: '⚡', enabled: true },
    { name: 'Uniswap', logo: '🦄', enabled: true }
  ];

  const getSwapQuotes = async (inputAmount: string) => {
    if (!inputAmount || !fromToken || !toToken) return;

    setIsLoading(true);
    setQuotes([]);
    
    try {
      // Fetch quotes from multiple aggregators simultaneously
      const aggregatorPromises = AGGREGATORS.filter(agg => agg.enabled).map(async (aggregator) => {
        try {
          const response = await fetch('/api/swap-quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromToken: fromToken.address,
              toToken: toToken.address,
              amount: inputAmount,
              userAddress: walletAddress,
              aggregator: aggregator.name.toLowerCase()
            })
          });

          const quoteData = await response.json();
          return {
            name: aggregator.name,
            logo: aggregator.logo,
            quote: { ...quoteData, aggregator: aggregator.name },
            isLoading: false
          };
        } catch (error) {
          console.error(`Failed to get quote from ${aggregator.name}:`, error);
          return {
            name: aggregator.name,
            logo: aggregator.logo,
            quote: null,
            isLoading: false
          };
        }
      });

      const results = await Promise.all(aggregatorPromises);
      const validQuotes = results.filter(result => result.quote !== null);
      
      setQuotes(validQuotes);
      
      // Auto-select the best quote (highest output amount)
      if (validQuotes.length > 0) {
        const bestQuote = validQuotes.reduce((best, current) => 
          parseFloat(current.quote.outputAmount) > parseFloat(best.quote.outputAmount) ? current : best
        );
        setSelectedQuote(bestQuote.quote);
        setToAmount(bestQuote.quote.outputAmount);
      }
    } catch (error) {
      console.error('Failed to get quotes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeSwap = async () => {
    if (!selectedQuote || !isWalletConnected) return;

    setIsLoading(true);
    try {
      // Execute the swap through MetaMask
      const response = await fetch('/api/execute-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote,
          userAddress: account
        })
      });

      const { transactionData } = await response.json();

      // Send transaction through MetaMask
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionData]
      });

      console.log('Transaction sent:', txHash);
      alert(`Swap executed! Transaction: ${txHash}`);
    } catch (error) {
      console.error('Swap failed:', error);
      alert('Swap failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const swapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  useEffect(() => {
    if (fromAmount) {
      const debounceTimer = setTimeout(() => {
        getSwapQuotes(fromAmount);
      }, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [fromAmount, fromToken, toToken, walletAddress]);

  if (!isWalletConnected) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <Wallet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 mb-4">Connect MetaMask to start trading</p>
            <Button onClick={connectWallet} className="w-full">
              Connect MetaMask
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Swap Tokens</CardTitle>
        <p className="text-sm text-gray-600">
          Connected: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* From Token */}
        <div className="space-y-2">
          <label className="text-sm font-medium">From</label>
          <div className="flex space-x-2">
            <select 
              value={fromToken.symbol}
              onChange={(e) => setFromToken(SUPPORTED_TOKENS.find(t => t.symbol === e.target.value)!)}
              className="px-3 py-2 border rounded-md"
            >
              {SUPPORTED_TOKENS.map(token => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={swapTokens}>
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <label className="text-sm font-medium">To</label>
          <div className="flex space-x-2">
            <select 
              value={toToken.symbol}
              onChange={(e) => setToToken(SUPPORTED_TOKENS.find(t => t.symbol === e.target.value)!)}
              className="px-3 py-2 border rounded-md"
            >
              {SUPPORTED_TOKENS.map(token => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="0.0"
              value={toAmount}
              readOnly
              className="flex-1 bg-gray-50"
            />
          </div>
        </div>

        {/* Best Quote Display */}
        {selectedQuote && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Best Rate</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg">{quotes.find(q => q.quote === selectedQuote)?.logo}</span>
                <span className="text-sm font-semibold text-green-600">
                  {selectedQuote.aggregator}
                </span>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Rate:</span>
                <span className="font-medium">1 {fromToken.symbol} = {selectedQuote.price.toFixed(6)} {toToken.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span>Gas Fee:</span>
                <span>{selectedQuote.gas} ETH</span>
              </div>
              <div className="flex justify-between">
                <span>Price Impact:</span>
                <span className={selectedQuote.priceImpact > 5 ? 'text-red-600' : 'text-green-600'}>
                  {selectedQuote.priceImpact.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Compare All Quotes Button */}
        {quotes.length > 1 && (
          <Button 
            variant="outline" 
            onClick={() => setShowComparison(!showComparison)}
            className="w-full"
          >
            {showComparison ? 'Hide' : 'Compare'} All Quotes ({quotes.length})
          </Button>
        )}

        {/* Aggregator Comparison */}
        {showComparison && quotes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Compare Quotes:</h4>
            {quotes.map((quote, index) => (
              <div 
                key={quote.name}
                className={`p-3 rounded-md border cursor-pointer transition-colors ${
                  selectedQuote === quote.quote 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedQuote(quote.quote);
                  setToAmount(quote.quote.outputAmount);
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{quote.logo}</span>
                    <span className="text-sm font-medium">{quote.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {parseFloat(quote.quote.outputAmount).toFixed(4)} {toToken.symbol}
                    </div>
                    <div className="text-xs text-gray-500">
                      Gas: {quote.quote.gas} ETH
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Swap Button */}
        <Button 
          onClick={executeSwap}
          disabled={!selectedQuote || isLoading || !fromAmount}
          className="w-full"
        >
          {isLoading ? 'Getting Best Rates...' : 
           selectedQuote ? `Swap via ${selectedQuote.aggregator}` : 'Enter Amount'}
        </Button>
      </CardContent>
    </Card>
  );
}
