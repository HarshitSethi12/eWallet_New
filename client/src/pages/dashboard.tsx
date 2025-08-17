// ===== IMPORT SECTION =====
// This section imports all the external libraries and components needed for the dashboard

// React core library for component state management
import React, { useState } from 'react';
// React Query for data fetching and caching
import { useQuery } from "@tanstack/react-query";
// UI components from our custom component library
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
// Icons from Lucide React icon library
import { 
  Send, 
  ArrowDownLeft, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Eye,
  EyeOff,
  BarChart3,
  Coins,
  Clock,
  Copy,
  ExternalLink,
  Plus,
  Settings,
  RefreshCw,
  Bell,
  Star,
  Filter,
  Download,
  Upload,
  Search,
  ChevronRight
} from "lucide-react";
// Authentication hook for user data
import { useAuth } from "@/hooks/use-auth";
// API request helper function
import { apiRequest } from "@/lib/queryClient";
// Custom components for dashboard functionality
import { AiChat } from "@/components/ai-chat";
import { HorizontalPriceTicker } from "@/components/horizontal-price-ticker";
import { DexSwap } from "@/components/dex-swap";
import { NotesPanel } from "@/components/notes-panel";

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

// ===== IMPORT SECTION =====
// React Query for server state management and data fetching
import { useQuery } from "@tanstack/react-query";
// Wouter for client-side routing
import { Link } from "wouter";
// UI components from our component library
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
// Custom components for wallet functionality
import { AddressCard } from "@/components/address-card";
import { TransactionList } from "@/components/transaction-list";
import { AiChat } from "@/components/ai-chat";
// Icons from Lucide React
import { Send, ArrowDownLeft, Wallet as WalletIcon, ShieldCheck, LogOut, TrendingUp, TrendingDown, Eye, Coins, Clock, BarChart3 } from "lucide-react";
// Mock blockchain utilities for development
import { generateMockAddress, generateMockPrivateKey } from "@/lib/mock-blockchain";
// API request helper
import { apiRequest } from "@/lib/queryClient";
// TypeScript types for data structures
import type { Wallet, Transaction } from "@shared/schema";
// React Icons for additional icons
import { RiExchangeFundsFill } from "react-icons/ri";
// Custom hooks for authentication and MetaMask
import { useAuth } from "@/hooks/use-auth";
import { useMetaMask } from "@/hooks/use-metamask";
// Price ticker component
import { HorizontalPriceTicker } from "@/components/horizontal-price-ticker";
// React core library
import React from "react";

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

// ===== WALLET TABS COMPONENT =====
// This component creates the tabbed interface for the wallet dashboard
function WalletTabs() {
  // ===== REAL-TIME TOKEN DATA FETCHING =====
  // Fetch cryptocurrency token data from our API (1inch or CoinGecko)
  const { data: tokenData, isLoading: tokensLoading, error: tokensError } = useQuery({
    queryKey: ["/api/tokens"],              // Unique cache key for this query
    queryFn: () => apiRequest("/api/tokens"), // Function that makes the API call
    refetchInterval: 30000,                 // Refresh data every 30 seconds
    onSuccess: (data) => {                  // Callback when data is successfully fetched
      console.log('🎯 Token data received:', data);
      console.log('🎯 Data source:', data?.source);
      console.log('🎯 Number of tokens:', data?.tokens?.length);
      console.log('🎯 All token prices:', data?.tokens?.map(t => `${t.symbol}: $${t.price}`));
    }
  });

  // ===== DATA SELECTION LOGIC =====
  // Use real API data when available, fallback to mock data during loading
  const portfolioTokens = tokenData?.tokens || mockTokens; 

  // ===== PORTFOLIO CALCULATIONS =====
  // Calculate total portfolio value by summing all token values
  const totalPortfolioValue = portfolioTokens.reduce((sum, token) => sum + token.balanceUSD, 0);

  // Mock initial investment amount for profit/loss calculation
  const initialInvestment = 8500; // Mock initial investment

  // Calculate portfolio performance percentage
  const portfolioChange = ((totalPortfolioValue - initialInvestment) / initialInvestment) * 100;

  return (
    <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0 h-full">
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-1 text-xs px-2 py-1.5">
            <Eye className="h-3 w-3" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="flex items-center gap-1 text-xs px-2 py-1.5">
            <BarChart3 className="h-3 w-3" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="tokens" className="flex items-center gap-1 text-xs px-2 py-1.5">
            <Coins className="h-3 w-3" />
            Tokens
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-1 text-xs px-2 py-1.5">
            <Clock className="h-3 w-3" />
            Transactions
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 min-h-0 px-3 pb-3 overflow-hidden">
        <TabsContent value="overview" className="h-full m-0 overflow-y-auto">
          <div className="space-y-3">
            {/* Portfolio Summary */}
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4">
                <div className="text-center space-y-2">
                  <p className="text-xs text-gray-500">Total Portfolio Value</p>
                  <p className="text-2xl font-bold">${totalPortfolioValue.toFixed(2)}</p>
                  <div className="flex items-center justify-center gap-2">
                    {portfolioChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={`text-xs font-medium ${portfolioChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {portfolioChange >= 0 ? '+' : ''}{portfolioChange.toFixed(2)}%
                    </span>
                    <span className="text-xs text-gray-500">
                      (${(totalPortfolioValue - initialInvestment).toFixed(2)})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-gray-200">
                <CardContent className="p-3">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Initial Investment</p>
                    <p className="text-lg font-semibold">${initialInvestment.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardContent className="p-3">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Total Tokens</p>
                    <p className="text-lg font-semibold">{portfolioTokens.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Holdings */}
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-amber-700">Top Holdings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {portfolioTokens.slice(0, 3).map((token, index) => (
                  <div key={token.symbol} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <img src={token.logoURI} alt={token.name} className="w-6 h-6 rounded-full" />
                      <div>
                        <p className="text-sm font-medium">{token.symbol}</p>
                        <p className="text-xs text-gray-500">{token.balance} {token.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${(token.balanceUSD || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{(((token.balanceUSD || 0) / totalPortfolioValue) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="portfolio" className="h-full m-0 overflow-y-auto">
          <Card className="border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-amber-700">Your Token Portfolio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tokensLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="space-y-1">
                          <div className="w-12 h-3 bg-gray-200 rounded"></div>
                          <div className="w-20 h-3 bg-gray-200 rounded"></div>
                          <div className="w-16 h-2 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="w-20 h-3 bg-gray-200 rounded"></div>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens" className="h-full m-0 overflow-y-auto">
          <Card className="border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-amber-700 flex items-center justify-between">
                Token Prices
                {tokenData?.source && (
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {tokenData.source === '1inch' ? '1inch API' : 'CoinGecko'}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="h-full m-0 overflow-y-auto">
          <Card className="border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-amber-700">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </Tabs>
  );
}

// ===== MAIN DASHBOARD COMPONENT =====
// This is the main dashboard component that displays user's cryptocurrency portfolio
export default function Dashboard() {
  // ===== AUTHENTICATION STATE =====
  // Get current user data from authentication context
  const { user } = useAuth();
  // State to control whether portfolio balance is visible or hidden
  const [balanceVisible, setBalanceVisible] = useState(true);
  // State to track selected timeframe for portfolio data (7 days, 30 days, etc.)
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');

  // ===== MOCK DATA SECTION =====
  // Mock portfolio data for demonstration purposes
  // In a real app, this would come from API calls
  const portfolioData = {
    totalValue: 24567.89,        // Total USD value of user's portfolio
    totalChange24h: 5.67,        // 24-hour percentage change
    assets: [                    // Array of user's cryptocurrency assets
      {
        id: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        balance: 0.75,           // Amount of Bitcoin user owns
        value: 19250.00,         // USD value of Bitcoin holdings
        price: 25666.67,         // Current Bitcoin price
        change24h: 2.3,          // 24-hour price change
        icon: '/api/placeholder/32/32'
      },
      {
        id: 'ethereum',
        symbol: 'ETH',
        name: 'Ethereum',
        balance: 2.5,            // Amount of Ethereum user owns
        value: 4125.50,          // USD value of Ethereum holdings
        price: 1650.20,          // Current Ethereum price
        change24h: -1.2,         // 24-hour price change (negative = decrease)
        icon: '/api/placeholder/32/32'
      },
      {
        id: 'cardano',
        symbol: 'ADA',
        name: 'Cardano',
        balance: 1000,           // Amount of Cardano user owns
        value: 1192.40,          // USD value of Cardano holdings
        price: 1.19,             // Current Cardano price
        change24h: 8.9,          // 24-hour price change (positive = increase)
        icon: '/api/placeholder/32/32'
      }
    ] as CryptoAsset[]
  };

  // ===== MOCK TRANSACTION DATA =====
  // Sample transaction history for the user
  const recentTransactions = [
    {
      id: '1',
      type: 'received',              // Transaction type: received cryptocurrency
      asset: 'BTC',                  // Asset involved in transaction
      amount: 0.025,                 // Amount of cryptocurrency
      value: 642.50,                 // USD value at time of transaction
      timestamp: '2 hours ago',      // When transaction occurred
      status: 'completed',           // Transaction status
      hash: '0x123...abc'            // Blockchain transaction hash
    },
    {
      id: '2',
      type: 'sent',                  // Transaction type: sent cryptocurrency
      asset: 'ETH',
      amount: 0.5,
      value: 825.10,
      timestamp: '1 day ago',
      status: 'completed',
      hash: '0x456...def'
    },
    {
      id: '3',
      type: 'swap',                  // Transaction type: swapped one crypto for another
      asset: 'ADA',
      amount: 500,
      value: 595.00,
      timestamp: '3 days ago',
      status: 'completed',
      hash: '0x789...ghi'
    }
  ];

  // ===== CALCULATED VALUES =====
  // Calculate styling and display values based on portfolio performance
  const totalChangeColor = portfolioData.totalChange24h >= 0 ? 'text-green-600' : 'text-red-600';
  const totalChangeIcon = portfolioData.totalChange24h >= 0 ? TrendingUp : TrendingDown;
  const portfolioValue = portfolioData.totalValue;
  const changePercentage = Math.abs(portfolioData.totalChange24h);

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

  // ===== RENDER LOGIC =====
  // Render the main dashboard structure
  return (
    <div className="h-full flex flex-col">
      {/* Main content container that takes full available space */}
      <div className="flex-1 w-full px-3 py-3 max-w-none overflow-hidden">
        <div className="h-full max-w-none mx-auto">
          <div className="h-full flex flex-col">
            {/* Two column layout for AI assistant and wallet - Full height */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-2 h-full">
              {/* AI Assistant Section - Left Side */}
              <div className="flex flex-col h-full min-h-0">
                <AiChat />
              </div>

              {/* MetaMask Wallet Section - Right Side */}
              <div className="flex flex-col h-full min-h-0 space-y-2">
                <Card className="flex-1 flex flex-col min-h-0">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {user?.picture ? (
                          <img 
                            src={user.picture} 
                            alt={user.name} 
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white shadow-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white shadow-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                            <WalletIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                          </div>
                        )}
                        <div>
                          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">MetaMask Wallet</h1>
                          <p className="text-sm sm:text-base text-gray-600">
                            {user?.provider === 'metamask' ? 
                              `${user.walletAddress?.slice(0, 6)}...${user.walletAddress?.slice(-4)}` : 
                              user?.name
                            }
                          </p>
                          {user?.provider === 'metamask' && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <p className="text-xs text-gray-500">MetaMask Connected</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                    <WalletTabs />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}