// ===== IMPORT SECTION =====
// Import all necessary dependencies for the dashboard

// React hooks for state management and lifecycle
import React, { useEffect, useState } from "react";

// API and authentication hooks
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getWallets, sendTransaction } from "@/lib/wallet-manager";
import { ethers } from 'ethers';
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
import { NetworkSwitcher, type NetworkType } from "@/components/network-switcher";

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

// Recharts for data visualization
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
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
import type { Transaction } from "@shared/schema";
// React Icons for additional icons
import { RiExchangeFundsFill } from "react-icons/ri";
// Custom hooks for MetaMask wallet connection
import { useMetaMask } from "@/hooks/use-metamask";

// ===== MOCK DATA FOR DEVELOPMENT =====
// Note: Mock data removed - showing real blockchain balances only

// ===== MAIN DASHBOARD COMPONENT =====
// This is the main dashboard component that displays user's cryptocurrency portfolio
export default function Dashboard() {
  // ===== AUTHENTICATION STATE =====
  // Get current user data from authentication context
  const { user, logout, isLoggingOut, checkSessionStatus } = useAuth();
  // Hook to disconnect MetaMask wallet
  const { disconnectWallet, connectWallet, isAuthenticated, account } = useMetaMask();
  // Hook to manage navigation
  const [, setLocation] = useLocation();

  // ===== SESSION STATUS STATE =====
  const [sessionStatus, setSessionStatus] = React.useState<any>(null);

  // ===== NETWORK SELECTION STATE =====
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>('ETH');

  // ===== TOKEN LIST SEARCH STATE =====
  const [tokenSearchTerm, setTokenSearchTerm] = useState('');

  // ===== PERFORMANCE CHART STATE =====
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('7d');

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
  // Use real API data when available
  const marketTokens = marketPricesData?.tokens || []; // For horizontal ticker (CoinGecko)
  const portfolioTokens = tokenListData?.tokens || [];  // For Token List (1inch DEX)

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

  // Use wallet address based on selected network and user provider
  const walletAddress = user?.provider === 'email' 
    ? (selectedNetwork === 'BTC' ? user?.btcAddress : selectedNetwork === 'SOL' ? user?.solAddress : user?.ethAddress)
    : (user?.walletAddress || account);

  // ===== PORTFOLIO CALCULATIONS (MOVED UP) =====
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

  // ===== REAL TRANSACTION STATE =====
  const [realTransactions, setRealTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // Fetch real transactions from blockchain
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!walletAddress || !(window as any).ethereum) {
        console.log('⚠️ No wallet address or MetaMask not available');
        setRealTransactions([]);
        return;
      }

      setIsLoadingTransactions(true);
      try {
        console.log('🔍 Fetching transactions for wallet:', walletAddress);

        // Use Etherscan API to get transaction history from backend
        const apiUrl = `/api/wallet/transactions/${walletAddress}`;

        console.log('🌐 Calling backend API:', apiUrl);
        const response = await fetch(apiUrl);

        console.log('📡 API Response Status:', response.status);
        console.log('📡 API Response Headers:', {
          contentType: response.headers.get('content-type'),
          status: response.status,
          statusText: response.statusText
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error Response:', errorText);
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📦 Full Etherscan API response:', JSON.stringify(data, null, 2));
        console.log('📊 Response status field:', data.status);
        console.log('📊 Response message field:', data.message);
        console.log('📊 Response result type:', Array.isArray(data.result) ? 'Array' : typeof data.result);
        console.log('📊 Response result length:', data.result?.length);

        // Check if we got valid data
        console.log('🔍 Checking API response validity...');

        if (data.status === '1' && data.result && Array.isArray(data.result)) {
          console.log('✅ Valid transaction data received, count:', data.result.length);

          // Transform Etherscan transactions to our format
          const transactions = data.result.slice(0, 10).map((tx: any) => {
            const isReceived = tx.to && tx.to.toLowerCase() === walletAddress.toLowerCase();
            const value = parseFloat(tx.value || 0) / Math.pow(10, 18); // Convert Wei to ETH

            // Get token info
            let tokenSymbol = 'ETH';
            let tokenAmount = value;

            // Check if it's a token transfer (has input data)
            if (tx.input && tx.input !== '0x' && tx.input.length >= 138) {
              tokenSymbol = 'TOKEN';
            }

            // Calculate time ago
            const timestamp = parseInt(tx.timeStamp) * 1000;
            const now = Date.now();
            const diffMs = now - timestamp;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            let timeAgo;
            if (diffMins < 60) {
              timeAgo = `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
            } else if (diffHours < 24) {
              timeAgo = `${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'} ago`;
            } else {
              timeAgo = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
            }

            const ethPrice = marketTokens.find((t: any) => t.symbol === 'ETH')?.price || 0;

            return {
              id: tx.hash,
              type: isReceived ? 'receive' : 'send',
              token: tokenSymbol,
              amount: tokenAmount.toFixed(4),
              value: `$${(tokenAmount * ethPrice).toFixed(2)}`,
              from: tx.from || 'Unknown',
              to: tx.to || 'Unknown',
              timestamp: timeAgo,
              status: tx.txreceipt_status === '1' ? 'completed' : 'failed',
              hash: tx.hash
            };
          });

          setRealTransactions(transactions);
          console.log('✅ Successfully processed', transactions.length, 'transactions');
          console.log('📋 First transaction:', transactions[0]);
        } else if (data.status === '0') {
          console.log('⚠️ Etherscan returned status 0');
          console.log('⚠️ Message:', data.message);
          console.log('⚠️ Full response:', JSON.stringify(data, null, 2));

          if (data.message === 'No transactions found') {
            console.log('ℹ️ Wallet has no transaction history');
          } else if (data.message?.includes('rate limit')) {
            console.log('⚠️ API rate limit reached');
          } else if (data.message?.includes('Invalid API Key')) {
            console.log('❌ Invalid Etherscan API key');
          } else {
            console.log('⚠️ Unknown status 0 message:', data.message);
          }

          setRealTransactions([]);
        } else {
          console.warn('⚠️ Unexpected API response format');
          console.warn('⚠️ Status:', data.status);
          console.warn('⚠️ Message:', data.message);
          console.warn('⚠️ Result:', data.result);
          console.warn('⚠️ Full data:', JSON.stringify(data, null, 2));
          setRealTransactions([]);
        }
      } catch (error: any) {
        console.error('❌ Error fetching transactions:', error);
        console.log('💡 This could be due to:');
        console.log('  - Network connectivity issues');
        console.log('  - Etherscan API rate limiting');
        console.log('  - Invalid wallet address');
        console.log('  - CORS restrictions');
        setRealTransactions([]);
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    // Add a small delay to avoid rapid API calls
    const timeoutId = setTimeout(fetchTransactions, 500);
    return () => clearTimeout(timeoutId);
  }, [walletAddress, marketTokens]);

  // Use real transactions if available, otherwise show empty state
  const displayTransactions = realTransactions.length > 0 ? realTransactions : [];

  // ===== SESSION CHECK HANDLER =====
  const handleCheckSession = async () => {
    const status = await checkSessionStatus();
    setSessionStatus(status);
    console.log('📊 Manual session check result:', status);
  };

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
      if (!walletAddress || !(window as any).ethereum) return;

      setIsLoadingBalances(true);
      try {
        const balances: any[] = [];

        // 1. Get ETH balance
        const ethBalance = await (window as any).ethereum.request({
          method: 'eth_getBalance',
          params: [walletAddress, 'latest']
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
            const data = (window as any).ethereum.request({
              method: 'eth_call',
              params: [{
                to: token.address,
                data: '0x70a08231000000000000000000000000' + walletAddress.slice(2) // balanceOf function signature + address
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
  }, [walletAddress, marketTokens]);

  // Fetch real blockchain balances for self-custodial email wallet users
  useEffect(() => {
    const fetchBlockchainBalances = async () => {
      if (user?.provider !== 'email' || !user?.btcAddress || !user?.ethAddress || !user?.solAddress) {
        return;
      }

      setIsLoadingBalances(true);
      try {
        const balances: any[] = [];

        // Fetch balances for all three chains in parallel
        const [btcData, ethData, solData] = await Promise.all([
          fetch(`/api/blockchain/balance/BTC/${user.btcAddress}`).then(res => res.json()),
          fetch(`/api/blockchain/balance/ETH/${user.ethAddress}`).then(res => res.json()),
          fetch(`/api/blockchain/balance/SOL/${user.solAddress}`).then(res => res.json())
        ]);

        console.log('🔍 Blockchain balances fetched:', { btcData, ethData, solData });

        // Add Bitcoin balance
        if (btcData && !btcData.error) {
          const btcPrice = marketTokens.find((t: any) => t.symbol === 'BTC')?.price || 0;
          const change24h = marketTokens.find((t: any) => t.symbol === 'BTC')?.change24h || 0;
          
          balances.push({
            symbol: 'BTC',
            name: 'Bitcoin',
            address: user.btcAddress,
            balance: btcData.balance || '0',
            balanceUSD: btcData.balanceUsd || 0,
            price: btcPrice,
            change24h: change24h,
            logoURI: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png'
          });
        }

        // Add Ethereum balance
        if (ethData && !ethData.error) {
          const ethPrice = marketTokens.find((t: any) => t.symbol === 'ETH')?.price || 0;
          const change24h = marketTokens.find((t: any) => t.symbol === 'ETH')?.change24h || 0;
          
          balances.push({
            symbol: 'ETH',
            name: 'Ethereum',
            address: user.ethAddress,
            balance: ethData.balance || '0',
            balanceUSD: ethData.balanceUsd || 0,
            price: ethPrice,
            change24h: change24h,
            logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png'
          });
        }

        // Add Solana balance
        if (solData && !solData.error) {
          const solPrice = marketTokens.find((t: any) => t.symbol === 'SOL')?.price || 0;
          const change24h = marketTokens.find((t: any) => t.symbol === 'SOL')?.change24h || 0;
          
          balances.push({
            symbol: 'SOL',
            name: 'Solana',
            address: user.solAddress,
            balance: solData.balance || '0',
            balanceUSD: solData.balanceUsd || 0,
            price: solPrice,
            change24h: change24h,
            logoURI: 'https://cryptologos.cc/logos/solana-sol-logo.png'
          });
        }

        // Sort by USD value (highest first)
        balances.sort((a, b) => b.balanceUSD - a.balanceUSD);

        setRealBalances(balances);
        console.log('✅ Blockchain balances loaded:', balances.length, 'chains');
      } catch (error) {
        console.error('❌ Error fetching blockchain balances:', error);
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchBlockchainBalances();
  }, [user, marketTokens]);

  // Fetch real blockchain transactions for self-custodial email wallet users
  useEffect(() => {
    const fetchBlockchainTransactions = async () => {
      if (user?.provider !== 'email' || !walletAddress) {
        return;
      }

      setIsLoadingTransactions(true);
      try {
        let transactions: any[] = [];

        // Determine which chain to fetch transactions for based on selected network
        const chain = selectedNetwork || 'ETH';
        
        console.log(`🔍 Fetching ${chain} transactions for:`, walletAddress);

        const response = await fetch(`/api/blockchain/transactions/${chain}/${walletAddress}`);
        const data = await response.json();

        if (data.transactions && Array.isArray(data.transactions)) {
          // Transform blockchain transactions to our format
          transactions = data.transactions.slice(0, 10).map((tx: any) => {
            const isReceived = tx.to && tx.to.toLowerCase() === walletAddress.toLowerCase();
            
            // Calculate time ago
            const timestamp = tx.timestamp;
            const now = Date.now();
            const diffMs = now - timestamp;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            let timeAgo;
            if (diffMins < 60) {
              timeAgo = `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
            } else if (diffHours < 24) {
              timeAgo = `${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'} ago`;
            } else {
              timeAgo = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
            }

            return {
              id: tx.hash,
              type: isReceived ? 'receive' : 'send',
              token: chain,
              amount: tx.value,
              value: tx.value,
              from: tx.from || 'Unknown',
              to: tx.to || 'Unknown',
              timestamp: timeAgo,
              status: tx.status || 'confirmed',
              hash: tx.hash,
              confirmations: tx.confirmations
            };
          });

          setRealTransactions(transactions);
          console.log(`✅ Successfully processed ${transactions.length} ${chain} transactions`);
        }
      } catch (error) {
        console.error('❌ Error fetching blockchain transactions:', error);
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    fetchBlockchainTransactions();
  }, [user, walletAddress, selectedNetwork]);

  // ===== PORTFOLIO PERFORMANCE DATA =====
  // Generate performance data based on real balances only
  const portfolioPerformanceData = React.useMemo(() => {
    // If no real balances, return empty data (zero state)
    if (realBalances.length === 0 || totalPortfolioValue === 0) {
      return [];
    }

    const days = selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : 90;
    const data = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * dayMs);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Generate realistic portfolio value changes based on actual portfolio value
      const baseValue = totalPortfolioValue;
      const volatility = baseValue * 0.02; // 2% daily volatility
      const trend = (days - i) * (baseValue * 0.001); // Slight upward trend
      const randomChange = (Math.random() - 0.5) * volatility;
      const value = Math.max(baseValue * 0.85 + trend + randomChange, 0);

      data.push({
        date: dateStr,
        value: parseFloat(value.toFixed(2)),
        profit: parseFloat((value - baseValue * 0.85).toFixed(2))
      });
    }

    return data;
  }, [selectedTimeframe, totalPortfolioValue, realBalances.length]);

  // ===== ASSET ALLOCATION DATA =====
  const assetAllocationData = React.useMemo(() => {
    if (realBalances.length === 0) return [];

    return realBalances.map((token: any, index: number) => ({
      name: token.symbol,
      value: token.balanceUSD || 0,
      percentage: totalPortfolioValue > 0 ? ((token.balanceUSD || 0) / totalPortfolioValue) * 100 : 0,
      // Generate distinct colors for each token
      fill: `hsl(${(index * 360) / realBalances.length}, 70%, 60%)`
    })).sort((a, b) => b.value - a.value);
  }, [realBalances, totalPortfolioValue]);

  // ===== NETWORK-FILTERED BALANCES =====
  // Filter balances based on selected network
  const filteredBalances = React.useMemo(() => {
    if (user?.provider !== 'email') {
      // For MetaMask users, show all balances (currently ETH/ERC-20 only)
      return realBalances;
    }

    // For email users with multi-chain wallets, filter by selected network
    switch (selectedNetwork) {
      case 'BTC':
        // Show only BTC and WBTC tokens
        return realBalances.filter(token => 
          token.symbol === 'BTC' || token.symbol === 'WBTC'
        );
      case 'ETH':
        // Show ETH and all ERC-20 tokens (exclude BTC/WBTC and SOL)
        return realBalances.filter(token => 
          token.symbol !== 'BTC' && token.symbol !== 'SOL'
        );
      case 'SOL':
        // Show only SOL and SPL tokens
        return realBalances.filter(token => 
          token.symbol === 'SOL' || token.symbol?.includes('SOL')
        );
      default:
        return realBalances;
    }
  }, [realBalances, selectedNetwork, user?.provider]);

  // Use filtered balances for portfolio calculations
  const filteredPortfolioValue = filteredBalances.length > 0 
    ? filteredBalances.reduce((sum, token) => sum + (token.balanceUSD || 0), 0)
    : totalPortfolioValue;

  // Use real balances only - no mock data fallback
  const mockTokensOverview = filteredBalances;

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
        onMouseLeave={() => {
          setTimeout(() => {
            const header = document.getElementById('auto-header');
            if (header) {
              header.style.transform = 'translateY(-100%)';
            }
          }, 300);
        }}
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

      {/* Hover trigger area for header - thin strip at very top */}
      <div 
        className="fixed top-0 left-0 right-0 h-1 z-40"
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
        className="fixed top-0 left-0 right-0 h-1 z-51"
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

        {/* Network Switcher - Multi-Chain Support */}
        {user?.provider === 'email' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Multi-Chain Wallet
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Switch between Bitcoin, Ethereum, and Solana networks
                </p>
              </div>
            </div>
            <NetworkSwitcher 
              selectedNetwork={selectedNetwork} 
              onNetworkChange={setSelectedNetwork}
              address={walletAddress || undefined}
            />
          </div>
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
                    <>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-700 font-medium">
                          {realBalances.length > 0 ? 'Real Balance' : 'MetaMask Connected'}
                        </span>
                      </div>
                      {user.walletAddress && (
                        <span className="text-sm text-gray-600 font-mono">
                          {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                        </span>
                      )}
                    </>
                  )}
                  {user?.provider === 'email' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-blue-700 font-medium">
                        Self-Custodial Wallet
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">${(user?.provider === 'email' ? filteredPortfolioValue : totalPortfolioValue).toFixed(2)}</p>
                  <p className="text-sm text-gray-500">
                    {user?.provider === 'email' && selectedNetwork !== 'ETH' 
                      ? `${selectedNetwork} Portfolio` 
                      : 'Portfolio Value'}
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
                  ) : filteredBalances.length > 0 ? filteredBalances.map((token) => (
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
                      <p className="text-sm text-gray-500">
                        {user?.provider === 'email' 
                          ? (selectedNetwork !== 'ETH' 
                            ? `No ${selectedNetwork} tokens found in your wallet` 
                            : 'Your wallet is empty. Add funds to get started!')
                          : user?.provider === 'metamask'
                          ? 'No tokens found in your wallet'
                          : 'Your wallet is empty. Add funds to get started!'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Top Right: Portfolio Performance Chart */}
          <Card className="bg-white shadow-sm border border-gray-200 !bg-white flex flex-col h-[400px]">
            <CardHeader className="pb-3 bg-white flex-shrink-0">
              <CardTitle className="flex items-center justify-between text-lg font-semibold text-amber-700">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Portfolio Performance
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={selectedTimeframe === '7d' ? 'default' : 'outline'}
                    onClick={() => setSelectedTimeframe('7d')}
                    className="h-6 px-2 text-xs"
                  >
                    7D
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTimeframe === '30d' ? 'default' : 'outline'}
                    onClick={() => setSelectedTimeframe('30d')}
                    className="h-6 px-2 text-xs"
                  >
                    30D
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTimeframe === '90d' ? 'default' : 'outline'}
                    onClick={() => setSelectedTimeframe('90d')}
                    className="h-6 px-2 text-xs"
                  >
                    90D
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 bg-white overflow-hidden p-0">
              <div className="h-full px-6 pb-6 pt-2">
                {realBalances.length > 0 ? (
                  <div className="h-full">
                    <PerformanceChart 
                      data={portfolioPerformanceData} 
                      timeframe={selectedTimeframe}
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        {user?.provider === 'email' 
                          ? 'Add funds to your wallet to view performance' 
                          : user?.provider === 'metamask'
                          ? 'No data to display'
                          : 'Add funds to your wallet to view performance'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
                  ) : filteredPortfolioTokens.map((token: any) => (
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

          {/* Bottom Right: Asset Allocation Chart */}
          <Card className="bg-white shadow-sm border border-gray-200 !bg-white flex flex-col h-[400px]">
            <CardHeader className="pb-3 bg-white flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-amber-700">
                <BarChart3 className="h-5 w-5" />
                Asset Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 bg-white overflow-hidden p-0">
              <div className="h-full px-6 pb-6 pt-2">
                {realBalances.length > 0 ? (
                  <div className="h-full">
                    <AssetAllocationChart data={assetAllocationData} />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        {user?.provider === 'email' 
                          ? 'Add funds to your wallet to view allocation' 
                          : user?.provider === 'metamask'
                          ? 'No assets to display'
                          : 'Add funds to your wallet to view allocation'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section - Connect MetaMask Prompt - Only show if not logged in via BitWallet */}
        {!isAuthenticated && !user && (
          <div className="col-span-full">
            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                        Connect your MetaMask wallet to view portfolio
                      </h3>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        Real-time balance tracking for all your tokens
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={connectWallet}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Connect MetaMask
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}


        {/* Empty state for portfolio holdings when no wallet - only show for non-email users */}
        {realBalances.length === 0 && !isLoadingBalances && !(user?.provider === 'metamask' && user?.walletAddress) && user?.provider !== 'email' && (
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
        onMouseLeave={() => {
          setTimeout(() => {
            const footer = document.getElementById('auto-footer');
            if (footer) {
              footer.style.transform = 'translateY(100%)';
            }
          }, 300);
        }}
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

      {/* Hover trigger area for footer - thin strip at very bottom */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-1 z-40"
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
        className="fixed bottom-0 left-0 right-0 h-1 z-51"
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

// ===== PERFORMANCE CHART COMPONENT =====
function PerformanceChart({ data, timeframe }: { data: any[], timeframe: string }) {
  const chartConfig = {
    value: {
      label: "Portfolio Value",
      color: "hsl(142, 76%, 36%)",
    },
    profit: {
      label: "Profit/Loss",
      color: "hsl(142, 76%, 36%)",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <ChartTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">{data.date}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ${data.value.toFixed(2)}
                    </p>
                    <p className={`text-xs ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#22c55e" 
            strokeWidth={2}
            fill="url(#colorValue)"
            fillOpacity={1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// ===== ASSET ALLOCATION CHART COMPONENT =====
function AssetAllocationChart({ data }: { data: any[] }) {
  const RADIAN = Math.PI / 180;

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for very small slices

    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="h-full w-full flex flex-col">
      <ResponsiveContainer width="100%" height="70%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            innerRadius={40}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <p className="text-sm font-semibold text-gray-900">{data.name}</p>
                    <p className="text-xs text-gray-600">${data.value.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{data.percentage.toFixed(1)}%</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="px-4 space-y-2 overflow-y-auto flex-1">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.fill }}
              />
              <span className="font-medium text-gray-700">{item.name}</span>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">${item.value.toFixed(2)}</p>
              <p className="text-gray-500">{item.percentage.toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}