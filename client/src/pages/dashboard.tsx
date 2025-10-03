// ===== IMPORT SECTION =====
// Import all necessary dependencies for the dashboard

// React hooks for state management and lifecycle
import React, { useEffect, useState } from "react";

// API and authentication hooks
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

// UI components from our component library
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

// Custom components for different sections
import { PriceTicker } from "@/components/price-ticker";
import { WalletOverview } from "@/components/wallet-overview";
import { TransactionList } from "@/components/transaction-list";
import { DexSwap } from "@/components/dex-swap";
import { FloatingChatWidget } from "@/components/floating-chat-widget";
import { EnhancedTokenList } from "@/components/enhanced-token-list";

// Icons from Lucide React
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownLeft,
  Coins,
  BarChart3,
  Activity,
  Users,
  Settings,
  Bell,
  Menu,
  X,
  Clock,
  Send,
  LogOut,
  WalletIcon
} from "lucide-react";
// ===== TYPE DEFINITIONS =====
// Define TypeScript interfaces for cryptocurrency asset data
interface CryptoAsset {
  id: string;           // Unique identifier for the asset
  symbol: string;       // Asset symbol (e.g., BTC, ETH)
  name: string;         // Full name of the asset
  balance: number;      // User's balance of this asset
  value: number;        // USD value of user's balance
  price: number;        // Current price per unit
  change24h: number;    // 24-hour price change percentage
  icon: string;         // URL or path to asset icon
}

// Define TypeScript interface for token prices from APIs
interface TokenPrice {
  symbol: string;       // Asset symbol
  name: string;         // Asset name
  price: number;        // Current price in USD
  change24h: number;    // 24-hour price change percentage
  address: string;      // Contract address of the token
}

// Define TypeScript interface for the data returned by the token price query
interface TokenPriceData {
  tokens: TokenPrice[];  // Array of token price information
  source: string;        // Source of the data ('1inch' or 'coingecko')
}

// ===== ADDITIONAL IMPORTS FOR DASHBOARD =====
// Wouter for client-side routing
import { Link, useLocation } from "wouter";
// Additional UI components for dashboard functionality
import { AddressCard } from "@/components/address-card";
// Mock blockchain utilities for development
import { generateMockAddress, generateMockPrivateKey } from "@/lib/mock-blockchain";
// TypeScript types for data structures
import type { Wallet as WalletType, Transaction } from "@shared/schema";
// React Icons for additional icons
import { RiExchangeFundsFill } from "react-icons/ri";
// Custom hooks for MetaMask wallet connection
import { useMetaMask } from "@/hooks/use-metamask";

// ===== MOCK DATA FOR DEVELOPMENT =====
// Mock token portfolio data to show while developing/testing
const mockTokens = [
  { symbol: 'ETH', name: 'Ethereum', balance: '2.5', price: 2340.50, change24h: 5.2, balanceUSD: 5851.25, logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { symbol: 'USDC', name: 'USD Coin', balance: '1000', price: 1.00, change24h: -0.1, balanceUSD: 1000.00, logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png' },
  { symbol: 'LINK', name: 'Chainlink', balance: '150', price: 14.25, change24h: 8.7, balanceUSD: 2137.50, logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
  { symbol: 'UNI', name: 'Uniswap', balance: '75', price: 6.80, change24h: -3.2, balanceUSD: 510.00, logoURI: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png' }
];

// Mock transaction history data for demonstration
const mockTransactions = [
  { id: '1', type: 'receive', token: 'ETH', amount: '0.5', value: '$1170.25', from: '0x742d...5A8f', timestamp: '2 hours ago', status: 'completed' },
  { id: '2', type: 'send', token: 'USDC', amount: '200', value: '$200.00', to: '0x91A2...3B7c', timestamp: '1 day ago', status: 'completed' },
  { id: '3', type: 'swap', token: 'LINK', amount: '25', value: '$356.25', timestamp: '3 days ago', status: 'completed' },
  { id: '4', type: 'receive', token: 'UNI', amount: '10', value: '$68.00', from: '0x4f5e...2D1a', timestamp: '1 week ago', status: 'completed' }
];

// ===== MAIN DASHBOARD COMPONENT =====
// This is the main dashboard component that displays user's cryptocurrency portfolio
export default function Dashboard() {
  // ===== AUTHENTICATION STATE =====
  // Get current user data from authentication context
  const { user, logout, isLoggingOut, checkSessionStatus } = useAuth();
  // Hook to disconnect MetaMask wallet
  const { disconnectWallet } = useMetaMask();
  // Hook to manage navigation
  const [, setLocation] = useLocation();

  // ===== SESSION STATUS STATE =====
  const [sessionStatus, setSessionStatus] = React.useState(null);

  // ===== TOKEN LIST SEARCH STATE =====
  const [tokenSearchTerm, setTokenSearchTerm] = useState('');

  // ===== SESSION CHECK HANDLER =====
  const handleCheckSession = async () => {
    const status = await checkSessionStatus();
    setSessionStatus(status);
    console.log('📊 Manual session check result:', status);
  };

  // ===== REAL-TIME TOKEN DATA FETCHING =====
  // Fetch cryptocurrency token data from CoinGecko for Live Market Prices (horizontal ticker)
  const { data: marketPricesData, isLoading: marketPricesLoading, error: marketPricesError, refetch: refetchMarketPrices } = useQuery({
    queryKey: ["/api/tokens"],              // CoinGecko endpoint for market overview
    queryFn: () => apiRequest("/api/tokens"), // Function that makes the API call
    refetchInterval: 30000,                 // Refresh data every 30 seconds
    retry: 3,                               // Retry 3 times on failure
    staleTime: 10000,                      // Data fresh for 10 seconds
    refetchOnMount: false,                 // Don't always refetch when component mounts
  });

  // Fetch token data from 1inch DEX for Token List (swappable tokens)
  const { data: tokenListData, isLoading: tokenListLoading, error: tokenListError, refetch: refetchTokenList } = useQuery({
    queryKey: ["/api/tokens/oneinch"],       // 1inch endpoint for Token List
    queryFn: () => apiRequest("/api/tokens/oneinch"), // Function that makes the API call
    refetchInterval: 30000,                 // Refresh data every 30 seconds
    retry: 3,                               // Retry 3 times on failure
    staleTime: 10000,                      // Data fresh for 10 seconds
    refetchOnMount: false,                 // Don't always refetch when component mounts
  });


  // ===== MANUAL REFRESH FUNCTIONS =====
  // Function to manually refresh market prices (horizontal ticker)
  const handleRefreshMarketPrices = () => {
    console.log('🔄 Manually refreshing market prices...');
    refetchMarketPrices();
  };

  // Function to manually refresh token list (1inch DEX prices)
  const handleRefreshTokenList = () => {
    console.log('🔄 Manually refreshing token list...');
    refetchTokenList();
  };

  // Function to refresh both data sources
  const handleRefreshAllPrices = () => {
    console.log('🔄 Manually refreshing all price data...');
    refetchMarketPrices();
    refetchTokenList();
  };

  // ===== DATA SELECTION LOGIC =====
  // Use real API data when available, fallback to mock data during loading/error
  const marketTokens = marketPricesData?.tokens || mockTokens; // For horizontal ticker (CoinGecko)
  const portfolioTokens = tokenListData?.tokens || [];  // For Token List (1inch DEX) - NO FALLBACK

  // Filter tokens based on search term
  const filteredPortfolioTokens = portfolioTokens.filter((token: any) =>
    token.name.toLowerCase().includes(tokenSearchTerm.toLowerCase()) ||
    token.symbol.toLowerCase().includes(tokenSearchTerm.toLowerCase())
  );

  // ===== API DATA FETCHING =====
  // Fetch wallet data using React Query
  const { data: wallets } = useQuery({
    queryKey: ["/api/wallets"], // Unique key for caching wallet data
    queryFn: () => apiRequest("/api/wallets"), // Function to fetch wallet data
  });

  // Fetch transaction data using React Query
  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"], // Unique key for caching transaction data
    queryFn: () => apiRequest("/api/transactions"), // Function to fetch transaction data
  });

  // ===== REAL WALLET BALANCE STATE =====
  const [realBalances, setRealBalances] = useState<any[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const { account } = useMetaMask();

  // ERC-20 Token ABI for balanceOf function
  const ERC20_ABI = [
    {
      constant: true,
      inputs: [{ name: '_owner', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: 'balance', type: 'uint256' }],
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'decimals',
      outputs: [{ name: '', type: 'uint8' }],
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'symbol',
      outputs: [{ name: '', type: 'string' }],
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'name',
      outputs: [{ name: '', type: 'string' }],
      type: 'function'
    }
  ];

  // Popular ERC-20 token addresses on Ethereum mainnet
  const POPULAR_TOKENS = [
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8 },
    { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', decimals: 18 },
    { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', decimals: 18 },
    { address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2', symbol: 'SUSHI', decimals: 18 },
    { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE', decimals: 18 },
    { address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', symbol: 'MKR', decimals: 18 },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18 },
    { address: '0xD533a949740bb3306d119CC777fa900bA034cd52', symbol: 'CRV', decimals: 18 }
  ];

  // Fetch real wallet balances when user connects MetaMask
  useEffect(() => {
    const fetchRealBalances = async () => {
      if (!account || !window.ethereum) return;

      setIsLoadingBalances(true);
      try {
        const balances: any[] = [];

        // 1. Get ETH balance
        const ethBalance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [account, 'latest']
        });

        const ethBalanceInEth = parseInt(ethBalance, 16) / Math.pow(10, 18);
        const ethPrice = marketTokens.find((t: any) => t.symbol === 'ETH')?.price || 0;

        if (ethBalanceInEth > 0) {
          balances.push({
            symbol: 'ETH',
            name: 'Ethereum',
            address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
            balance: ethBalanceInEth.toFixed(4),
            balanceUSD: ethBalanceInEth * ethPrice,
            price: ethPrice,
            change24h: marketTokens.find((t: any) => t.symbol === 'ETH')?.change24h || 0,
            logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png'
          });
        }

        // 2. Fetch ERC-20 token balances
        for (const token of POPULAR_TOKENS) {
          try {
            // Call balanceOf function
            const data = window.ethereum.request({
              method: 'eth_call',
              params: [{
                to: token.address,
                data: '0x70a08231000000000000000000000000' + account.slice(2) // balanceOf function signature + address
              }, 'latest']
            });

            const balance = await data;
            const balanceNum = parseInt(balance, 16) / Math.pow(10, token.decimals);

            // Only add tokens with non-zero balance
            if (balanceNum > 0) {
              // Find price from market data
              const tokenPrice = marketTokens.find((t: any) => 
                t.symbol.toUpperCase() === token.symbol.toUpperCase()
              )?.price || 0;

              const change24h = marketTokens.find((t: any) => 
                t.symbol.toUpperCase() === token.symbol.toUpperCase()
              )?.change24h || 0;

              balances.push({
                symbol: token.symbol,
                name: token.symbol,
                address: token.address,
                balance: balanceNum.toFixed(token.decimals === 18 ? 4 : token.decimals === 8 ? 6 : 2),
                balanceUSD: balanceNum * tokenPrice,
                price: tokenPrice,
                change24h: change24h,
                logoURI: `https://tokens.1inch.io/${token.address.toLowerCase()}.png`
              });
            }
          } catch (tokenError) {
            console.warn(`Failed to fetch balance for ${token.symbol}:`, tokenError);
          }
        }

        // Sort by USD value (highest first)
        balances.sort((a, b) => b.balanceUSD - a.balanceUSD);

        setRealBalances(balances);
        console.log('✅ Real balances fetched:', balances.length, 'tokens with balance');
      } catch (error) {
        console.error('❌ Error fetching real balances:', error);
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchRealBalances();
  }, [account, marketTokens]);

  // Use real balances if available, otherwise use mock data
  const mockTokensOverview = realBalances.length > 0 ? realBalances : [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0x0000000000000000000000000000000000000000',
      balance: '2.5',
      balanceUSD: 8750.25,
      price: 3500.10,
      change24h: 2.45,
      logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xa0b86a33e6c48e46f4d8d2c6a24e8f3a8f8f6f6f',
      balance: '1250.50',
      balanceUSD: 1250.50,
      price: 1.00,
      change24h: 0.02,
      logoURI: 'https://tokens.1inch.io/0xa0b86a33e6c48e46f4d8d2c6a24e8f3a8f8f6f6f.png'
    }
  ];

  // ===== PORTFOLIO CALCULATIONS =====
  // Calculate total portfolio value from real MetaMask balances
  const totalPortfolioValue = realBalances.length > 0 
    ? realBalances.reduce((sum, token) => sum + (token.balanceUSD || 0), 0)
    : 0;

  // Mock initial investment amount for profit/loss calculation (only if we have real balances)
  const initialInvestment = realBalances.length > 0 ? totalPortfolioValue * 0.85 : 0;

  // Calculate portfolio performance percentage
  const portfolioChange = initialInvestment > 0 
    ? ((totalPortfolioValue - initialInvestment) / initialInvestment) * 100 
    : 0;

  // ===== RENDER LOGIC =====
  // Redirect to home if user is not logged in
  if (!user) {
    return <div className="container max-w-4xl mx-auto px-4 py-8 text-center">
      <p className="text-lg">Please log in to access your dashboard.</p>
      <Button className="mt-4" onClick={() => setLocation('/')}>
        Go Home
      </Button>
    </div>;
  }

  // Render the main dashboard structure
  return (
    <div className="min-h-screen bg-white relative">
      {/* Auto-hiding Header */}
      <div 
        className="fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out transform -translate-y-full"
        style={{
          background: 'linear-gradient(135deg, #4a7c59 0%, #6b8e5a 100%)',
        }}
        id="auto-header"
      >
        <div className="container max-w-5xl mx-auto px-3 py-3 sm:p-4 flex items-center justify-between text-white">
          <div className="flex-1"></div>
          <h1 className="text-xl font-bold text-white">
            <span
              className="font-bold"
              style={{
                fontFamily: "'Poppins', sans-serif",
                letterSpacing: "-0.01em",
                paddingRight: "2px",
                color: "#F7F3E9"
              }}
            >
              Bit
            </span>
            <span
              className="font-bold"
              style={{
                fontFamily: "'Poppins', sans-serif",
                letterSpacing: "-0.01em",
                color: "#A0826D"
              }}
            >
              Wallet
            </span>
          </h1>
          <div className="flex-1 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={logout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-4 py-2 text-white border-white hover:bg-white hover:text-gray-800"
            >
              <LogOut className="h-4 w-4" />
              <span 
                className="font-semibold text-sm"
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  letterSpacing: "-0.01em",
                  color: "inherit"
                }}
              >
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Hover trigger area for header */}
      <div 
        className="fixed top-0 left-0 right-0 h-24 z-40"
        onMouseEnter={() => {
          const header = document.getElementById('auto-header');
          if (header) header.style.transform = 'translateY(0)';
        }}
        onMouseLeave={() => {
          setTimeout(() => {
            const header = document.getElementById('auto-header');
            if (header && !header.matches(':hover')) {
              header.style.transform = 'translateY(-100%)';
            }
          }, 200);
        }}
      ></div>

      {/* Additional hover area for header element itself */}
      <div 
        className="fixed top-0 left-0 right-0 h-16 z-51"
        onMouseEnter={() => {
          const header = document.getElementById('auto-header');
          if (header) header.style.transform = 'translateY(0)';
        }}
        onMouseLeave={() => {
          setTimeout(() => {
            const header = document.getElementById('auto-header');
            if (header) header.style.transform = 'translateY(-100%)';
          }, 300);
        }}
        style={{ pointerEvents: 'none' }}
      ></div>

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-white">


        {/* Session Status Display */}
        {sessionStatus && (
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Session Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${sessionStatus.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-lg font-medium">{sessionStatus.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                {sessionStatus.provider && (
                  <p className="text-gray-700"><strong>Provider:</strong> {sessionStatus.provider}</p>
                )}
                {sessionStatus.user?.address && (
                  <p className="text-gray-700"><strong>Address:</strong> {sessionStatus.user.address}</p>
                )}
                {sessionStatus.error && (
                  <p className="text-red-600"><strong>Error:</strong> {sessionStatus.error}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Four Section Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white">
          {/* Top Left: Wallet Overview */}
          <Card className="bg-white shadow-sm border border-gray-200 !bg-white flex flex-col h-[400px]">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-amber-700">
                <WalletIcon className="h-5 w-5" />
                Wallet Overview
              </CardTitle>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  {user?.provider === 'metamask' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-700 font-medium">
                        {realBalances.length > 0 ? 'Real Balance' : 'MetaMask Connected'}
                      </span>
                    </div>
                  )}
                  {user?.provider === 'metamask' && user.walletAddress && (
                    <span className="text-sm text-gray-600 font-mono">
                      {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">${totalPortfolioValue.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">
                    {realBalances.length > 0 ? 'Real' : 'Mock'} Portfolio Value
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-6 pb-6">
                <div className="space-y-4 pr-4">
                  {/* Portfolio Summary */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        {portfolioChange >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${portfolioChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {portfolioChange >= 0 ? '+' : ''}{portfolioChange.toFixed(2)}%
                        </span>
                        <span className="text-sm text-gray-500">
                          (${(totalPortfolioValue - initialInvestment).toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Token Holdings */}
                  {isLoadingBalances ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                      <p className="text-xs text-gray-500 mt-2">Loading real balances...</p>
                    </div>
                  ) : realBalances.length > 0 ? realBalances.map((token) => (
                    <div key={token.symbol} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <img src={token.logoURI} alt={token.name} className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="text-sm font-semibold">{token.symbol}</p>
                          <p className="text-xs text-gray-500">{token.name}</p>
                          <p className="text-xs text-gray-400">{token.balance} {token.symbol}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold">${(token.balanceUSD || 0).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">${(token.price || 0).toFixed(2)} per {token.symbol}</p>
                        <div className="flex items-center gap-1 justify-end">
                          {(token.change24h || 0) >= 0 ? (
                            <TrendingUp className="h-2 w-2 text-green-600" />
                          ) : (
                            <TrendingDown className="h-2 w-2 text-red-600" />
                          )}
                          <span className={`text-xs ${(token.change24h || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(token.change24h || 0) >= 0 ? '+' : ''}{(token.change24h || 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">No tokens found in wallet</p>
                      <p className="text-xs text-gray-400 mt-1">Connect MetaMask to view your holdings</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Top Right: Recent Transactions */}
          <Card className="bg-white shadow-sm border border-gray-200 !bg-white flex flex-col h-[400px]">
            <CardHeader className="pb-3 bg-white flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-amber-700">
                <Clock className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 bg-white overflow-hidden p-0">
              <ScrollArea className="h-full bg-white px-6 pb-6">
                <div className="space-y-3 bg-white pr-4">
                  {mockTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${
                          tx.type === 'receive' ? 'bg-green-100' :
                          tx.type === 'send' ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                          {tx.type === 'receive' ? (
                            <ArrowDownLeft className="h-3 w-3 text-green-600" />
                          ) : tx.type === 'send' ? (
                            <Send className="h-3 w-3 text-red-600" />
                          ) : (
                            <RiExchangeFundsFill className="h-3 w-3 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold capitalize">{tx.type} {tx.token}</p>
                          <p className="text-xs text-gray-500">
                            {tx.from && `From: ${tx.from}`}
                            {tx.to && `To: ${tx.to}`}
                            {tx.type === 'swap' && 'Token swap'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`text-sm font-semibold ${
                          tx.type === 'receive' ? 'text-green-600' :
                          tx.type === 'send' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {tx.type === 'send' ? '-' : tx.type === 'receive' ? '+' : ''}{tx.amount} {tx.token}
                        </p>
                        <p className="text-xs text-gray-500">{tx.value}</p>
                        <p className="text-xs text-gray-400">{tx.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Bottom Left: Token List with Live Prices */}
          <Card className="bg-white shadow-sm border border-gray-200 !bg-white flex flex-col h-[400px]">
            <CardHeader className="pb-3 bg-white flex-shrink-0">
              <CardTitle className="flex items-center justify-between text-lg font-semibold text-amber-700">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Token List
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshTokenList}
                    disabled={tokenListLoading}
                    className="h-6 px-2 text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 ${tokenListLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  {tokenListData && (
                    <span className={`text-xs font-normal px-2 py-1 rounded ${
                      tokenListData.tokens?.length > 0 && tokenListData.success !== false
                        ? 'text-blue-700 bg-blue-100 border border-blue-200'
                        : 'text-gray-500 bg-gray-100 border border-gray-200'
                    }`}>
                      {tokenListData.tokens?.length > 0 && tokenListData.success !== false ? '🔵 1inch DEX' : 'Mock Data'}
                    </span>
                  )}
                </div>
              </CardTitle>
              <div className="mt-3">
                <Input
                  type="text"
                  placeholder="Search tokens..."
                  value={tokenSearchTerm}
                  onChange={(e) => setTokenSearchTerm(e.target.value)}
                  className="h-8 text-sm"
                  data-testid="input-token-search"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-6 pb-6">
                <div className="space-y-2 pr-4">
                  {tokenListLoading ? (
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                            <div className="space-y-1">
                              <div className="w-12 h-3 bg-gray-200 rounded"></div>
                              <div className="w-20 h-2 bg-gray-200 rounded"></div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="w-16 h-3 bg-gray-200 rounded"></div>
                            <div className="w-12 h-2 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredPortfolioTokens.map((token) => (
                    <div key={token.symbol} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors" data-testid={`token-item-${token.symbol}`}>
                      <div className="flex items-center gap-3">
                        <img src={token.logoURI} alt={token.name} className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="text-sm font-semibold">{token.symbol}</p>
                          <p className="text-xs text-gray-500">{token.name}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold" data-testid={`price-${token.symbol}`}>${(token.price || 0).toFixed(2)}</p>
                        <Badge variant={(token.change24h || 0) >= 0 ? "default" : "destructive"} className="text-xs">
                          {(token.change24h || 0) >= 0 ? (
                            <TrendingUp className="h-2 w-2 mr-1" />
                          ) : (
                            <TrendingDown className="h-2 w-2 mr-1" />
                          )}
                          {Math.abs(token.change24h || 0).toFixed(2)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Bottom Right: Portfolio Holdings */}
          <Card className="bg-white shadow-sm border border-gray-200 !bg-white flex flex-col h-[400px]">
            <CardHeader className="pb-3 bg-white flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-amber-700">
                <BarChart3 className="h-5 w-5" />
                Portfolio Holdings
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 bg-white overflow-hidden p-0">
              <ScrollArea className="h-full px-6 pb-6">
                <div className="space-y-4 pr-4">
                  {/* Portfolio Distribution */}
                  {realBalances.length > 0 ? realBalances.map((token) => {
                    const percentage = totalPortfolioValue > 0 ? ((token.balanceUSD || 0) / totalPortfolioValue) * 100 : 0;
                    return (
                      <div key={token.symbol} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src={token.logoURI} alt={token.name} className="w-6 h-6 rounded-full" />
                            <span className="text-sm font-medium">{token.symbol}</span>
                          </div>
                          <span className="text-sm text-gray-600">{percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{token.balance} {token.symbol}</span>
                          <span>${(token.balanceUSD || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  }) : (
                    // This is the section that had the syntax error. 
                    // The closing brace for the map function was missing, causing the error.
                    // The fix is to ensure the map function is properly closed.
                    <></>
                  )}

                  <Separator className="my-4" />

                  {/* Summary Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Initial Investment:</span>
                      <span className="font-medium">${initialInvestment.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Current Value:</span>
                      <span className="font-medium">${totalPortfolioValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">P&L:</span>
                      <span className={`font-medium ${portfolioChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {portfolioChange >= 0 ? '+' : ''}${(totalPortfolioValue - initialInvestment).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Assets:</span>
                      <span className="font-medium">{realBalances.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Data Source:</span>
                      <span className="font-medium text-blue-600">{realBalances.length > 0 ? 'Real MetaMask' : 'No Wallet Connected'}</span>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Empty state for portfolio holdings when no wallet */}
        {realBalances.length === 0 && !isLoadingBalances && (
          <div className="col-span-2 text-center py-12">
            <p className="text-lg text-gray-600 mb-2">Connect your MetaMask wallet to view portfolio</p>
            <p className="text-sm text-gray-400 mt-1">Real-time balance tracking for all your tokens</p>
          </div>
        )}


      </div>

      {/* Auto-hiding Footer */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out transform translate-y-full"
        style={{
          background: 'linear-gradient(135deg, #4a7c59 0%, #6b8e5a 100%)',
        }}
        id="auto-footer"
      >
        <div className="container max-w-5xl mx-auto px-3 py-3 sm:p-4 text-center text-white">
          <p className="text-sm">
            © 2025{" "}
            <span
              className="font-medium"
              style={{
                fontFamily: "'Poppins', sans-serif",
                letterSpacing: "-0.01em",
                paddingRight: "1px",
                color: "#F7F3E9"
              }}
            >
              Bit
            </span>
            <span
              className="font-medium"
              style={{
                fontFamily: "'Poppins', sans-serif",
                letterSpacing: "-0.01em",
                color: "#A0826D"
              }}
            >
              Wallet
            </span>
          </p>
        </div>
      </div>

      {/* Hover trigger area for footer */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-24 z-40"
        onMouseEnter={() => {
          const footer = document.getElementById('auto-footer');
          if (footer) footer.style.transform = 'translateY(0)';
        }}
        onMouseLeave={() => {
          setTimeout(() => {
            const footer = document.getElementById('auto-footer');
            if (footer && !footer.matches(':hover')) {
              footer.style.transform = 'translateY(100%)';
            }
          }, 200);
        }}
      ></div>

      {/* Additional hover area for footer element itself */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-16 z-51"
        onMouseEnter={() => {
          const footer = document.getElementById('auto-footer');
          if (footer) footer.style.transform = 'translateY(0)';
        }}
        onMouseLeave={() => {
          setTimeout(() => {
            const footer = document.getElementById('auto-footer');
            if (footer) footer.style.transform = 'translateY(100%)';
          }, 300);
        }}
        style={{ pointerEvents: 'none' }}
      ></div>
    </div>
  );
}