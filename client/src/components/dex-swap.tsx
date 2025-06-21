
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownUp, Wallet } from "lucide-react";
import { useMetaMask } from "@/hooks/use-metamask";

interface SwapQuote {
  inputAmount: string;
  outputAmount: string;
  price: number;
  priceImpact: number;
  fee: number;
}

const SUPPORTED_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000' },
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86a33E6411bB63B3F3b95d7fEf3C6b9E6e2ff' },
  { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' }
];

export function DexSwap() {
  const { isConnected, account, connectWallet } = useMetaMask();
  const [fromToken, setFromToken] = useState(SUPPORTED_TOKENS[0]);
  const [toToken, setToToken] = useState(SUPPORTED_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getSwapQuote = async (inputAmount: string) => {
    if (!inputAmount || !fromToken || !toToken) return;

    setIsLoading(true);
    try {
      // In a real implementation, you'd call DEX aggregator APIs like:
      // - 1inch API
      // - 0x API
      // - Paraswap API
      // - Or directly integrate with Uniswap contracts

      const response = await fetch('/api/swap-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: fromToken.address,
          toToken: toToken.address,
          amount: inputAmount,
          userAddress: account
        })
      });

      const quoteData = await response.json();
      setQuote(quoteData);
      setToAmount(quoteData.outputAmount);
    } catch (error) {
      console.error('Failed to get quote:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeSwap = async () => {
    if (!quote || !isConnected) return;

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
        getSwapQuote(fromAmount);
      }, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [fromAmount, fromToken, toToken, account]);

  if (!isConnected) {
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
          Connected: {account?.slice(0, 6)}...{account?.slice(-4)}
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

        {/* Quote Information */}
        {quote && (
          <div className="bg-gray-50 p-3 rounded-md space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Price:</span>
              <span>1 {fromToken.symbol} = {quote.price.toFixed(4)} {toToken.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span>Fee:</span>
              <span>{quote.fee}%</span>
            </div>
            <div className="flex justify-between">
              <span>Price Impact:</span>
              <span className={quote.priceImpact > 5 ? 'text-red-600' : 'text-green-600'}>
                {quote.priceImpact.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <Button 
          onClick={executeSwap}
          disabled={!quote || isLoading || !fromAmount}
          className="w-full"
        >
          {isLoading ? 'Processing...' : 'Swap Tokens'}
        </Button>
      </CardContent>
    </Card>
  );
}
