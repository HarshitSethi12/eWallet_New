
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddressCard } from "@/components/address-card";
import { TransactionList } from "@/components/transaction-list";
import { Send, ArrowDownLeft, Wallet as WalletIcon, ShieldCheck, LogOut } from "lucide-react";
import { generateMockAddress, generateMockPrivateKey } from "@/lib/mock-blockchain";
import { apiRequest } from "@/lib/queryClient";
import type { Wallet, Transaction } from "@shared/schema";
import { RiExchangeFundsFill } from "react-icons/ri";
import { useAuth } from "@/hooks/use-auth";
import { useMetaMask } from "@/hooks/use-metamask";
import { HorizontalPriceTicker } from "@/components/horizontal-price-ticker";
import React from "react";

function WelcomePage() {
  const { login, loginWithMetaMask, isMetaMaskLoading, user, isAuthenticated, logout, isLoggingOut } = useAuth();
  const { connectWallet, signMessage, account, isConnecting, disconnectWallet } = useMetaMask();
  const [location] = useLocation();
  
  // Check for authentication errors in URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
      console.error('Authentication error:', error);
      // You can add a toast notification here if needed
    }
  }, [location]);

  const handleMetaMaskLogin = async () => {
    try {
      const address = await connectWallet();
      if (address) {
        const message = `Sign this message to authenticate with your wallet: ${Date.now()}`;
        const signature = await signMessage(message);
        if (signature) {
          loginWithMetaMask({ message, signature, address });
        }
      }
    } catch (error) {
      console.error('MetaMask authentication error:', error);
    }
  };

  // Force logout function for MetaMask users on welcome page
  const handleForceLogout = async () => {
    try {
      if (user?.provider === 'metamask') {
        // Clear MetaMask connection
        disconnectWallet();
        // Clear all local storage
        window.localStorage.clear();
        window.sessionStorage.clear();
        
        // Make logout request to server
        await fetch('/auth/logout', { 
          method: 'POST',
          credentials: 'include' 
        });
        
        // Force reload to clear all state
        window.location.href = '/';
      } else {
        logout();
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Force reload as fallback
      window.location.href = '/';
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-3 sm:px-4 space-y-8 sm:space-y-12 md:space-y-16 py-6 sm:py-8 md:py-12">
      {/* Show authentication status if user is logged in */}
      {isAuthenticated && user && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name} 
                  className="w-10 h-10 rounded-full border-2 border-green-300"
                />
              ) : (
                <div className="w-10 h-10 rounded-full border-2 border-green-300 bg-green-500 flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user.provider === 'metamask' ? 'MM' : user.name?.[0] || 'U'}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold text-green-800">
                  You're signed in!
                </p>
                <p className="text-sm text-green-600">
                  {user.provider === 'metamask' ? 
                    `${user.walletAddress?.slice(0, 6)}...${user.walletAddress?.slice(-4)}` : 
                    user.name
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => window.location.href = '/'}
              >
                Go to Dashboard
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleForceLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="text-center space-y-4 sm:space-y-6"></div>
        <div className="relative inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 mb-2 sm:mb-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#30D158] via-teal-400 to-[#0A3665] opacity-20 blur-xl animate-pulse"></div>
          <div className="absolute inset-2 bg-gradient-to-br from-[#F2FFF5] to-white rounded-full opacity-90"></div>
          <div className="relative z-10 flex items-center justify-center icon-group icon-float">
            <WalletIcon className="w-8 h-8 sm:w-10 sm:h-10 text-[#30D158] transform -translate-x-2 sm:-translate-x-4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }} />
            <RiExchangeFundsFill className="w-12 h-12 sm:w-14 sm:h-14 text-teal-500" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }} />
            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-[#0A3665] transform translate-x-2 sm:translate-x-4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }} />
          </div>
        </div>
        <div className="text-center space-y-6 sm:space-y-8">
          <div className="space-y-3 sm:space-y-4 py-4 px-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold natural-gradient-text tracking-tight leading-relaxed pb-2">
              Your Go-to Cryptocurrency Exchange
            </h1>
            <p className="text-lg sm:text-xl font-semibold animated-gradient-text pb-1">
              Secure Cryptocurrency Management
            </p>
          </div>
        </div>
        {/* Only show login buttons if not authenticated */}
        {!isAuthenticated && (
          <div className="flex flex-col items-center gap-4 mt-6 sm:mt-8 md:mt-10">
            <Button
              size="lg"
              className="btn-primary px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
              onClick={login}
            >
              <span className="text-base sm:text-lg font-semibold">Gmail</span>
              <svg className="h-6 w-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </Button>
            
            <Button
              size="lg"
              className="btn-primary px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
              onClick={handleMetaMaskLogin}
              disabled={isConnecting || isMetaMaskLoading}
            >
              <span className="text-base sm:text-lg font-semibold">
                {isConnecting || isMetaMaskLoading ? "Connecting..." : "MetaMask"}
              </span>
              <svg className="h-6 w-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.46 5.64L13.04.96c-.28-.14-.6-.14-.88 0L2.54 5.64c-.28.14-.46.42-.46.72v10.28c0 .3.18.58.46.72l9.5 4.68c.14.07.3.1.46.1s.32-.03.46-.1l9.5-4.68c.28-.14.46-.42-.46.72V6.36c0-.3-.18-.58-.46-.72zM12 3.12l7.56 3.72L12 10.56 4.44 6.84 12 3.12zm0 9.44l-7.5-3.69v7.5l7.5 3.69v-7.5zm1 7.5l7.5-3.69v-7.5L13 12.56v7.5z" fill="#F6851B"/>
                <path d="M12 10.56l7.56-3.72L12 3.12 4.44 6.84 12 10.56z" fill="#E2761B"/>
                <path d="M4.5 8.87v7.5l7.5 3.69v-7.5l-7.5-3.69z" fill="#E4761B"/>
                <path d="M13 12.56v7.5l7.5-3.69v-7.5L13 12.56z" fill="#763D16"/>
              </svg>
            </Button>
          </div>
        )}
      </div>

      {/* Live Market Prices Section */}
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 mb-12 sm:mb-16">
        <div className="flex justify-center items-center w-full">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-6 sm:mb-8 natural-gradient-text leading-relaxed pb-1">
            Live Market Prices
          </h2>
        </div>
        <HorizontalPriceTicker />
      </div>

      {/* Decorative element */}
      <div className="relative">
        <div className="absolute -z-10 top-0 inset-x-0 h-64 bg-gradient-to-b from-[#F2FFF5] to-transparent opacity-70 blur-2xl"></div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user, logout, isLoggingOut, checkSessionStatus } = useAuth();
  const { disconnectWallet } = useMetaMask();
  const [, setLocation] = useLocation();
  const [sessionStatus, setSessionStatus] = React.useState(null);

  // Manual session check function
  const handleCheckSession = async () => {
    const status = await checkSessionStatus();
    setSessionStatus(status);
    console.log('📊 Manual session check result:', status);
  };

  // Force logout function for MetaMask users
  const handleForceLogout = async () => {
    try {
      if (user?.provider === 'metamask') {
        // Clear MetaMask connection
        disconnectWallet();
        // Clear all local storage
        window.localStorage.clear();
        window.sessionStorage.clear();
        
        // Make logout request to server
        await fetch('/auth/logout', { 
          method: 'POST',
          credentials: 'include' 
        });
        
        // Force reload to clear all state
        window.location.href = '/';
      } else {
        logout();
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Force reload as fallback
      window.location.href = '/';
    }
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
    <div className="container max-w-5xl mx-auto px-3 sm:px-4 space-y-6 sm:space-y-8 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back!</h1>
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
        <div className="flex gap-2 sm:gap-3">
          <Button 
            size="sm" 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setLocation("/send")}
          >
            <Send className="h-4 w-4" />
            Send
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setLocation("/receive")}
          >
            <ArrowDownLeft className="h-4 w-4" />
            Receive
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleCheckSession}
          >
            <ShieldCheck className="h-4 w-4" />
            Check Session
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleForceLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>

      {/* Session Status Display */}
      {sessionStatus && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Session Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sessionStatus.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{sessionStatus.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            {sessionStatus.provider && (
              <p><strong>Provider:</strong> {sessionStatus.provider}</p>
            )}
            {sessionStatus.user?.address && (
              <p><strong>Address:</strong> {sessionStatus.user.address}</p>
            )}
            {sessionStatus.error && (
              <p className="text-red-600"><strong>Error:</strong> {sessionStatus.error}</p>
            )}
          </div>
        </Card>
      )}

      {/* Live Market Prices */}
      <div className="w-full">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">Live Market Prices</h2>
        <HorizontalPriceTicker />
      </div>

      {/* Wallets */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">Your Wallets</h2>
        <div className="grid gap-4 sm:gap-6">
          {wallets?.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <WalletIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">No wallets found. Create your first wallet to get started!</p>
            </div>
          ) : (
            wallets?.map((wallet: Wallet) => (
              <AddressCard key={wallet.id} wallet={wallet} />
            ))
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">Recent Transactions</h2>
        <TransactionList transactions={transactions || []} />
      </div>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    return <DashboardPage />;
  }

  return <WelcomePage />;
}
