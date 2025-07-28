import { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, 
  Send, 
  ArrowDownLeft, 
  Copy, 
  ExternalLink, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Plus,
  Activity,
  Settings,
  Globe,
  Fuel
} from "lucide-react";
import { useMetaMask } from "@/hooks/use-metamask";
import { useAuth } from "@/hooks/use-auth";

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  contractAddress?: string;
  usdValue?: number;
  logo?: string;
  priceChange24h?: number;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
  type: 'send' | 'receive' | 'contract';
  gasUsed?: string;
  gasPrice?: string;
}

interface NetworkInfo {
  chainId: string;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

const NETWORKS: { [key: string]: NetworkInfo } = {
  '0x1': {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  '0x89': {
    chainId: '0x89',
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
  },
  '0xa': {
    chainId: '0xa',
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorer: 'https://optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  }
};

const POPULAR_TOKENS = [
  { symbol: 'USDC', name: 'USD Coin', contractAddress: '0xA0b86a33E6411bB63B3F3b95d7fEf3C6b9E6e2ff' },
  { symbol: 'USDT', name: 'Tether USD', contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', contractAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
  { symbol: 'LINK', name: 'Chainlink', contractAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA' }
];

export function WalletOverview() {
  const { user } = useAuth();
  const { isConnected, account, chainId } = useMetaMask();
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [sendAmount, setSendAmount] = useState('');
  const [sendAddress, setSendAddress] = useState('');

  const currentNetwork = NETWORKS[chainId || '0x1'] || NETWORKS['0x1'];

  // Check if user is authenticated with MetaMask
  const isMetaMaskUser = user?.provider === 'metamask';
  const walletAddress = user?.walletAddress;

  // Use authenticated wallet address if available, otherwise use connected account
  const displayAccount = walletAddress || account;

  // Fetch ETH balance
  const fetchEthBalance = async () => {
    if (!window.ethereum || !displayAccount) return;

    try {
      console.log('🔵 Fetching ETH balance for:', displayAccount);
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [displayAccount, 'latest']
      });

      console.log('🔵 Raw balance (hex):', balance);
      // Convert from wei to ETH
      const ethValue = parseInt(balance, 16) / Math.pow(10, 18);
      console.log('🔵 ETH balance:', ethValue);
      setEthBalance(ethValue.toFixed(6));
    } catch (error) {
      console.error('Error fetching ETH balance:', error);
    }
  };

  // Fetch real ETH price from your existing API
  const fetchEthPrice = async (): Promise<number> => {
    try {
      const response = await fetch('/api/crypto-prices');
      const data = await response.json();
      // Find ETH price from the response
      const ethData = data.find((crypto: any) => crypto.symbol === 'ETH');
      return ethData ? ethData.current_price : 3200; // fallback to 3200 if not found
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      return 3200; // fallback price
    }
  };

  // Fetch token balances with real ETH data
  const fetchTokenBalances = async () => {
    if (!displayAccount) return;

    // Get real ETH price
    const ethPrice = await fetchEthPrice();
    const ethBalanceNum = parseFloat(ethBalance) || 0;
    const ethUsdValue = ethBalanceNum * ethPrice;

    // Only show real ETH balance for now - no mock tokens
    const realBalances: TokenBalance[] = [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        balance: ethBalance,
        decimals: 18,
        usdValue: ethUsdValue,
        priceChange24h: 2.5 // You can fetch this from the API as well
      }
    ];

    setTokenBalances(realBalances);
  };

  // Fetch recent transactions (mock data)
  const fetchTransactions = async () => {
    if (!displayAccount) return;

    // Mock transaction data
    const mockTransactions: Transaction[] = [
      {
        hash: '0x1234...5678',
        from: displayAccount,
        to: '0x742d35Cc6134C1532A31b0C3Fd2F8AC4b9B0e53a',
        value: '0.5',
        timestamp: Date.now() - 3600000,
        status: 'confirmed',
        type: 'send',
        gasUsed: '21000',
        gasPrice: '20'
      },
      {
        hash: '0xabcd...efgh',
        from: '0x742d35Cc6134C1532A31b0C3Fd2F8AC4b9B0e53a',
        to: displayAccount,
        value: '1.2',
        timestamp: Date.now() - 7200000,
        status: 'confirmed',
        type: 'receive'
      }
    ];

    setTransactions(mockTransactions);
  };


  const refreshWalletData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchEthBalance(),
        fetchTokenBalances(),
        fetchTransactions()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if ((isConnected && account) || (isMetaMaskUser && walletAddress)) {
      refreshWalletData();
    }
  }, [isConnected, account, chainId, isMetaMaskUser, walletAddress, ethBalance]);

  const copyAddress = () => {
    if (displayAccount) {
      navigator.clipboard.writeText(displayAccount);
    }
  };

  const getTotalPortfolioValue = () => {
    return tokenBalances.reduce((total, token) => total + (token.usdValue || 0), 0);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Show wallet if user is authenticated with MetaMask OR if MetaMask is connected
  if (!isMetaMaskUser && (!isConnected || !account)) {
    return (
      <Card className="border-none shadow-lg h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-heading)' }}>
            <Wallet className="h-5 w-5" />
            MetaMask Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <Wallet className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-center">
            Connect your MetaMask wallet to view your portfolio
          </p>
        </CardContent>
      </Card>
    );
  }

  console.log('WalletOverview Debug:', {
    isMetaMaskUser,
    walletAddress,
    isConnected,
    account,
    displayAccount,
    user: user?.provider,
    ethBalance,
    tokenBalances
  });

  return (
    <Card className="border-2 border-green-500 shadow-lg h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-heading)' }}>
            <Wallet className="h-5 w-5" />
            MetaMask Wallet
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              {currentNetwork.name}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={refreshWalletData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Account Info */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Account</span>
                <Button size="sm" variant="ghost" onClick={copyAddress}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="font-mono text-sm">{formatAddress(displayAccount)}</p>
            </div>

            {/* Portfolio Value */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Portfolio Value</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowBalance(!showBalance)}
                >
                  {showBalance ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-2xl font-bold">
                {showBalance ? `$${getTotalPortfolioValue().toLocaleString()}` : '••••••'}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button className="flex items-center gap-2" size="sm">
                <Send className="h-4 w-4" />
                Send
              </Button>
              <Button className="flex items-center gap-2" variant="outline" size="sm">
                <ArrowDownLeft className="h-4 w-4" />
                Receive
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="tokens" className="space-y-3">
            {tokenBalances.map((token, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {token.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{token.symbol}</p>
                    <p className="text-sm text-gray-500">{token.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {showBalance ? token.balance : '••••'}
                  </p>
                  <div className="flex items-center gap-1 text-sm">
                    {token.priceChange24h && token.priceChange24h > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={token.priceChange24h && token.priceChange24h > 0 ? 'text-green-500' : 'text-red-500'}>
                      {token.priceChange24h?.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="activity" className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No transactions found</p>
              </div>
            ) : (
              transactions.map((tx, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.type === 'send' ? 'bg-red-100' : 'bg-green-100'
                    }`}>
                      {tx.type === 'send' ? (
                        <Send className="h-4 w-4 text-red-600" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold capitalize">{tx.type}</p>
                      <p className="text-sm text-gray-500">
                        {tx.type === 'send' ? 'To' : 'From'}: {formatAddress(tx.type === 'send' ? tx.to : tx.from)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.type === 'send' ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.type === 'send' ? '-' : '+'}{tx.value} ETH
                    </p>
                    <div className="flex items-center gap-1">
                      <Badge variant={tx.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                        {tx.status}
                      </Badge>
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Gas Tracker */}
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Gas Tracker</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-yellow-800">~25 gwei</p>
              <p className="text-xs text-yellow-600">Standard</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}