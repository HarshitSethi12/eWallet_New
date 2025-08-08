
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AddressCard } from "@/components/address-card";
import { TransactionList } from "@/components/transaction-list";
import { AiChat } from "@/components/ai-chat";
import { Send, ArrowDownLeft, Wallet as WalletIcon, ShieldCheck, LogOut, TrendingUp, TrendingDown, Eye, Coins, Clock, BarChart3 } from "lucide-react";
import { generateMockAddress, generateMockPrivateKey } from "@/lib/mock-blockchain";
import { apiRequest } from "@/lib/queryClient";
import type { Wallet, Transaction } from "@shared/schema";
import { RiExchangeFundsFill } from "react-icons/ri";
import { useAuth } from "@/hooks/use-auth";
import { useMetaMask } from "@/hooks/use-metamask";
import { HorizontalPriceTicker } from "@/components/horizontal-price-ticker";
import React from "react";

// Mock data for demonstration
const mockTokens = [
  { symbol: 'ETH', name: 'Ethereum', balance: '2.5', price: 2340.50, change24h: 5.2, balanceUSD: 5851.25, logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { symbol: 'USDC', name: 'USD Coin', balance: '1000', price: 1.00, change24h: -0.1, balanceUSD: 1000.00, logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png' },
  { symbol: 'LINK', name: 'Chainlink', balance: '150', price: 14.25, change24h: 8.7, balanceUSD: 2137.50, logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
  { symbol: 'UNI', name: 'Uniswap', balance: '75', price: 6.80, change24h: -3.2, balanceUSD: 510.00, logoURI: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png' }
];

const mockTransactions = [
  { id: '1', type: 'receive', token: 'ETH', amount: '0.5', value: '$1170.25', from: '0x742d...5A8f', timestamp: '2 hours ago', status: 'completed' },
  { id: '2', type: 'send', token: 'USDC', amount: '200', value: '$200.00', to: '0x91A2...3B7c', timestamp: '1 day ago', status: 'completed' },
  { id: '3', type: 'swap', token: 'LINK', amount: '25', value: '$356.25', timestamp: '3 days ago', status: 'completed' },
  { id: '4', type: 'receive', token: 'UNI', amount: '10', value: '$68.00', from: '0x4f5e...2D1a', timestamp: '1 week ago', status: 'completed' }
];

function WalletTabs() {
  const totalPortfolioValue = mockTokens.reduce((sum, token) => sum + token.balanceUSD, 0);
  const initialInvestment = 8500; // Mock initial investment
  const portfolioChange = ((totalPortfolioValue - initialInvestment) / initialInvestment) * 100;

  return (
    <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
      <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="portfolio" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Portfolio
        </TabsTrigger>
        <TabsTrigger value="tokens" className="flex items-center gap-2">
          <Coins className="h-4 w-4" />
          Tokens
        </TabsTrigger>
        <TabsTrigger value="transactions" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Transactions
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 min-h-0 p-4 pt-2">
        <TabsContent value="overview" className="h-full m-0 space-y-4">
          <div className="grid gap-4">
            {/* Portfolio Summary */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-500">Total Portfolio Value</p>
                  <p className="text-3xl font-bold">${totalPortfolioValue.toFixed(2)}</p>
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
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Initial Investment</p>
                    <p className="text-xl font-semibold">${initialInvestment.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Total Tokens</p>
                    <p className="text-xl font-semibold">{mockTokens.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Holdings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Top Holdings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockTokens.slice(0, 3).map((token, index) => (
                  <div key={token.symbol} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={token.logoURI} alt={token.name} className="w-8 h-8 rounded-full" />
                      <div>
                        <p className="font-medium">{token.symbol}</p>
                        <p className="text-sm text-gray-500">{token.balance} {token.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${token.balanceUSD.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{((token.balanceUSD / totalPortfolioValue) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="portfolio" className="h-full m-0">
          <div className="space-y-4 h-full">
            <Card>
              <CardHeader>
                <CardTitle>Your Token Portfolio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockTokens.map((token) => (
                  <div key={token.symbol} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <img src={token.logoURI} alt={token.name} className="w-12 h-12 rounded-full" />
                      <div>
                        <p className="font-semibold">{token.symbol}</p>
                        <p className="text-sm text-gray-500">{token.name}</p>
                        <p className="text-xs text-gray-400">{token.balance} {token.symbol}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">${token.balanceUSD.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">${token.price.toFixed(2)} per {token.symbol}</p>
                      <div className="flex items-center gap-1 justify-end">
                        {token.change24h >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <span className={`text-xs ${token.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tokens" className="h-full m-0">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Token Prices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockTokens.map((token) => (
                  <div key={token.symbol} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <img src={token.logoURI} alt={token.name} className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-semibold">{token.symbol}</p>
                        <p className="text-sm text-gray-500">{token.name}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">${token.price.toFixed(2)}</p>
                      <Badge variant={token.change24h >= 0 ? "default" : "destructive"} className="text-xs">
                        {token.change24h >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(token.change24h).toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="h-full m-0">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        tx.type === 'receive' ? 'bg-green-100' : 
                        tx.type === 'send' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        {tx.type === 'receive' ? (
                          <ArrowDownLeft className="h-4 w-4 text-green-600" />
                        ) : tx.type === 'send' ? (
                          <Send className="h-4 w-4 text-red-600" />
                        ) : (
                          <RiExchangeFundsFill className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold capitalize">{tx.type} {tx.token}</p>
                        <p className="text-sm text-gray-500">
                          {tx.from && `From: ${tx.from}`}
                          {tx.to && `To: ${tx.to}`}
                          {tx.type === 'swap' && 'Token swap'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-semibold ${
                        tx.type === 'receive' ? 'text-green-600' : 
                        tx.type === 'send' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {tx.type === 'send' ? '-' : tx.type === 'receive' ? '+' : ''}{tx.amount} {tx.token}
                      </p>
                      <p className="text-sm text-gray-500">{tx.value}</p>
                      <p className="text-xs text-gray-400">{tx.timestamp}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}

export default function Dashboard() {
  const { user, logout, isLoggingOut, checkSessionStatus } = useAuth();
  const { disconnectWallet } = useMetaMask();
  const [sessionStatus, setSessionStatus] = React.useState(null);

  // Manual session check function
  const handleCheckSession = async () => {
    const status = await checkSessionStatus();
    setSessionStatus(status);
    console.log('📊 Manual session check result:', status);
  };

  const { data: wallets } = useQuery({
    queryKey: ["/api/wallets"],
    queryFn: () => apiRequest("/api/wallets"),
  });

  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: () => apiRequest("/api/transactions"),
  });

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
