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

  // ===== SESSION CHECK HANDLER =====
  const handleCheckSession = async () => {
    const status = await checkSessionStatus();
    setSessionStatus(status);
    console.log('📊 Manual session check result:', status);
  };

  // ===== REAL-TIME TOKEN DATA FETCHING =====
  // Fetch cryptocurrency token data from our API (1inch or CoinGecko)
  const { data: tokenData, isLoading: tokensLoading, error: tokensError, refetch: refetchTokens } = useQuery({
    queryKey: ["/api/tokens"],              // Unique cache key for this query
    queryFn: () => apiRequest("/api/tokens"), // Function that makes the API call
    refetchInterval: 30000,                 // Refresh data every 30 seconds
    retry: 3,                               // Retry 3 times on failure
    onSuccess: (data) => {                  // Callback when data is successfully fetched
      console.log('🎯 Token data received:', data);
      console.log('🎯 Data source:', data?.source);
      console.log('🎯 Number of tokens:', data?.tokens?.length);
      console.log('🎯 All token prices:', data?.tokens?.map(t => `${t.symbol}: $${t.price}`));
    },
    onError: (error) => {                   // Callback when API call fails
      console.error('❌ Token data fetch error:', error);
    }
  });

  // ===== MANUAL REFRESH FUNCTION =====
  // Function to manually refresh token prices
  const handleRefreshPrices = () => {
    console.log('🔄 Manually refreshing token prices...');
    refetchTokens();
  };

  // ===== DATA SELECTION LOGIC =====
  // Use real API data when available, fallback to mock data during loading/error
  const portfolioTokens = tokenData?.tokens || mockTokens;

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

  // Mock token data for wallet overview
  const mockTokensOverview = [
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
  // Calculate total portfolio value by summing all token values
  const totalPortfolioValue = portfolioTokens.reduce((sum, token) => sum + token.balanceUSD, 0);

  // Mock initial investment amount for profit/loss calculation
  const initialInvestment = 8500; // Mock initial investment

  // Calculate portfolio performance percentage
  const portfolioChange = ((totalPortfolioValue - initialInvestment) / initialInvestment) * 100;

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-400px)] min-h-[600px] bg-white">
          {/* Top Left: Wallet Overview */}
          <Card className="bg-white shadow-sm border border-gray-200 !bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-amber-700">
                <WalletIcon className="h-5 w-5" />
                Wallet Overview
              </CardTitle>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  {user?.provider === 'metamask' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-700 font-medium">MetaMask Connected</span>
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
                  <p className="text-sm text-gray-500">Total Portfolio Value</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ScrollArea className="h-full">
                <div className="space-y-4">
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
                  {portfolioTokens.map((token) => (
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
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Top Right: Recent Transactions */}
          <Card className="bg-white shadow-sm border border-gray-200 !bg-white">
            <CardHeader className="pb-3 bg-white">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-amber-700">
                <Clock className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 bg-white">
              <ScrollArea className="h-full bg-white">
                <div className="space-y-3 bg-white">
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
          <Card className="bg-white shadow-sm border border-gray-200 !bg-white">
            <CardHeader className="pb-3 bg-white">
              <CardTitle className="flex items-center justify-between text-lg font-semibold text-amber-700">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Token List
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshPrices}
                    disabled={tokensLoading}
                    className="h-6 px-2 text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 ${tokensLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  {tokenData?.source && (
                    <span className={`text-xs font-normal px-2 py-1 rounded ${
                      tokenData.source === '1inch'
                        ? 'text-orange-700 bg-orange-100 border border-orange-200'
                        : tokenData.source === 'coingecko'
                        ? 'text-blue-700 bg-blue-100 border border-blue-200'
                        : 'text-gray-500 bg-gray-100 border border-gray-200'
                    }`}>
                      {tokenData.source === '1inch' ? '1inch DEX' : tokenData.source === 'coingecko' ? 'CoinGecko' : 'Mock Data'}
                    </span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {tokensLoading ? (
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
                  ) : portfolioTokens.map((token) => (
                    <div key={token.symbol} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <img src={token.logoURI} alt={token.name} className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="text-sm font-semibold">{token.symbol}</p>
                          <p className="text-xs text-gray-500">{token.name}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold">${(token.price || 0).toFixed(2)}</p>
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
          <Card className="bg-white shadow-sm border border-gray-200 !bg-white">
            <CardHeader className="pb-3 bg-white">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-amber-700">
                <BarChart3 className="h-5 w-5" />
                Portfolio Holdings
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 bg-white">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {/* Portfolio Distribution */}
                  {portfolioTokens.map((token) => {
                    const percentage = ((token.balanceUSD || 0) / totalPortfolioValue) * 100;
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
                  })}

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
                      <span className="font-medium">{portfolioTokens.length}</span>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>


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