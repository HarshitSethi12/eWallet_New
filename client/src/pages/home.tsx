
// ===== IMPORT SECTION =====
// This section imports all the external libraries and components needed for this page

// React Query for data fetching and caching
import { useQuery } from "@tanstack/react-query";
// Wouter for client-side routing (navigation between pages)
import { Link, useLocation } from "wouter";
// UI components from our custom component library
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddressCard } from "@/components/address-card";
import { TransactionList } from "@/components/transaction-list";
// Icons from Lucide React icon library
import { Send, ArrowDownLeft, Wallet as WalletIcon, ShieldCheck, LogOut } from "lucide-react";
// Mock blockchain utilities for development/testing
import { generateMockAddress, generateMockPrivateKey } from "@/lib/mock-blockchain";
// API request helper function
import { apiRequest } from "@/lib/queryClient";
// TypeScript type definitions for our data structures
import type { Wallet, Transaction } from "@shared/schema";
// React Icons for additional icons
import { RiExchangeFundsFill } from "react-icons/ri";
// Custom hooks for authentication and wallet connections
import { useAuth } from "@/hooks/use-auth";
import { useMetaMask } from "@/hooks/use-metamask";
import { useWalletConnect } from "@/hooks/use-walletconnect";
// Component for displaying cryptocurrency prices
import { HorizontalPriceTicker } from "@/components/horizontal-price-ticker";
// React core library
import React from "react";

// ===== WELCOME PAGE COMPONENT =====
// This is the main landing page that users see when they first visit the app
function WelcomePage() {
  // ===== AUTHENTICATION HOOKS =====
  // Get authentication functions and state from our custom auth hook
  const { login, loginWithMetaMask, isMetaMaskLoading, user, isAuthenticated, logout, isLoggingOut } = useAuth();
  
  // ===== METAMASK WALLET HOOKS =====
  // Get MetaMask wallet connection functions and state
  const { connectWallet, signMessage, account, isConnecting, disconnectWallet, forceReconnect } = useMetaMask();
  
  // ===== ROUTING HOOK =====
  // Get current page location for navigation
  const [location] = useLocation();
  
  // ===== ERROR HANDLING EFFECT =====
  // Check URL parameters for authentication errors when the page loads
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
      console.error('Authentication error:', error);
      // You can add a toast notification here if needed
    }
  }, [location]); // Run this effect when the location changes

  // ===== METAMASK LOGIN HANDLER FUNCTION =====
  // This function handles the complete MetaMask authentication process
  const handleMetaMaskLogin = async () => {
    console.log('🔵 MetaMask button clicked');
    
    // ===== METAMASK INSTALLATION CHECK =====
    // Check if MetaMask browser extension is installed
    if (!window.ethereum) {
      alert('MetaMask is not installed! Please install MetaMask extension.');
      return;
    }

    try {
      console.log('🔵 Attempting to connect to MetaMask...');
      
      // ===== WALLET CONNECTION STEP =====
      // Connect to MetaMask and get the user's wallet address
      const address = await connectWallet();
      console.log('🔵 Connection result:', address);
      
      if (!address) {
        throw new Error('Failed to connect to MetaMask');
      }

      console.log('✅ MetaMask connected successfully:', address);
      
      // ===== STATE SYNCHRONIZATION =====
      // Small delay to ensure state is updated properly
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // ===== MESSAGE SIGNING STEP =====
      // Create a unique message for the user to sign (proves wallet ownership)
      const message = `Sign this message to authenticate with your wallet: ${Date.now()}`;
      console.log('🔵 Requesting signature for message:', message);
      
      // ===== DIGITAL SIGNATURE REQUEST =====
      // Request user to sign the message with their private key
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });
      
      console.log('🔵 Signature received:', signature ? 'Yes' : 'No');
      
      // ===== AUTHENTICATION COMPLETION =====
      if (signature) {
        console.log('🔵 Calling loginWithMetaMask...');
        // Send the signed message to our backend for verification
        // This will automatically route to dashboard on success
        loginWithMetaMask({ message, signature, address });
      } else {
        console.warn('❌ No signature received');
        alert('Signature required to authenticate. Please try again.');
      }
    } catch (error) {
      console.error('❌ MetaMask authentication error:', error);
      
      // ===== ERROR HANDLING =====
      // Handle specific MetaMask error codes with user-friendly messages
      if (error.code === 4001) {
        alert('Please approve the connection request in MetaMask.');
      } else if (error.code === -32002) {
        alert('MetaMask has a pending request. Please open MetaMask and complete or cancel the pending request.');
      } else {
        alert(`Connection failed: ${error.message || 'Please try again.'}`);
      }
      
      // ===== CLEANUP ON ERROR =====
      // Reset connection state if authentication fails
      disconnectWallet();
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-3 sm:px-4 space-y-8 sm:space-y-12 md:space-y-16 py-6 sm:py-8 md:py-12">
      {/* Show authentication status if user is logged in */}
      {isAuthenticated && user && (
        <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200/60 rounded-xl p-4 sm:p-6 mb-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {user.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name} 
                  className="w-12 h-12 rounded-full border-2 border-green-300 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-green-300 bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm font-bold">
                    {user.provider === 'metamask' ? 'MM' : user.name?.[0] || 'U'}
                  </span>
                </div>
              )}
              <div>
                <p className="font-bold text-green-800 text-lg">
                  Welcome back!
                </p>
                <p className="text-sm text-green-600 font-medium">
                  {user.provider === 'metamask' ? 
                    `${user.walletAddress?.slice(0, 8)}...${user.walletAddress?.slice(-6)}` : 
                    user.name
                  }
                </p>
                {user.provider === 'metamask' && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600 font-medium">MetaMask Connected</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm"
                onClick={() => window.location.href = '/dashboard'}
              >
                <WalletIcon className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={logout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="text-center space-y-6 sm:space-y-8 mb-8">
        <div className="relative inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 mb-4">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#30D158] via-teal-400 to-[#0A3665] opacity-20 blur-xl animate-pulse"></div>
          <div className="absolute inset-2 bg-gradient-to-br from-[#F2FFF5] to-white rounded-full opacity-90"></div>
          <div className="relative z-10 flex items-center justify-center icon-group icon-float">
            <WalletIcon className="w-8 h-8 sm:w-10 sm:h-10 text-[#30D158] transform -translate-x-2 sm:-translate-x-4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }} />
            <RiExchangeFundsFill className="w-12 h-12 sm:w-14 sm:h-14 text-teal-500" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }} />
            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-[#0A3665] transform translate-x-2 sm:translate-x-4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }} />
          </div>
        </div>
        
        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold natural-gradient-text tracking-tight leading-tight">
              Your Go-to Cryptocurrency Exchange
            </h1>
            <p className="text-lg sm:text-xl font-semibold animated-gradient-text">
              Secure Cryptocurrency Management
            </p>
          </div>
        </div>
        {/* Only show login buttons if not authenticated */}
        {!isAuthenticated && (
          <div className="flex flex-col items-center gap-6 mt-8 sm:mt-10">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <Button
                size="lg"
                className="btn-primary px-6 sm:px-8 py-4 text-base sm:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 min-w-[200px] justify-center"
                onClick={login}
              >
                <span className="font-semibold">Sign in with Gmail</span>
                <svg className="h-6 w-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              </Button>
              
              <div className="flex items-center">
                <div className="h-px bg-gray-300 w-8"></div>
                <span className="mx-3 text-gray-500 text-sm font-medium">OR</span>
                <div className="h-px bg-gray-300 w-8"></div>
              </div>
              
              <Button
                size="lg"
                className="btn-primary px-6 sm:px-8 py-4 text-base sm:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 min-w-[200px] justify-center"
                onClick={handleMetaMaskLogin}
                disabled={isConnecting || isMetaMaskLoading}
              >
                <span className="font-semibold">
                  {isConnecting || isMetaMaskLoading ? "Connecting..." : "Sign in with MetaMask"}
                </span>
                {!isConnecting && !isMetaMaskLoading && (
                  <svg className="h-6 w-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.46 5.64L13.04.96c-.28-.14-.6-.14-.88 0L2.54 5.64c-.28.14-.46.42-.46.72v10.28c0 .3.18.58.46.72l9.5 4.68c.14.07.3.1.46.1s.32-.03.46-.1l9.5-4.68c.28-.14.46-.42-.46.72V6.36c0-.3-.18-.58-.46-.72zM12 3.12l7.56 3.72L12 10.56 4.44 6.84 12 3.12zm0 9.44l-7.5-3.69v7.5l7.5 3.69v-7.5zm1 7.5l7.5-3.69v-7.5L13 12.56v7.5z" fill="#F6851B"/>
                    <path d="M12 10.56l7.56-3.72L12 3.12 4.44 6.84 12 10.56z" fill="#E2761B"/>
                    <path d="M4.5 8.87v7.5l7.5 3.69v-7.5l-7.5-3.69z" fill="#E4761B"/>
                    <path d="M13 12.56v7.5l7.5-3.69v-7.5L13 12.56z" fill="#763D16"/>
                  </svg>
                )}
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 text-center max-w-md">
              Choose your preferred sign-in method. If MetaMask is not responding, check for pending requests in the extension.
            </p>
          </div>
        )}
      </div>

      {/* Live Market Prices Section */}
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 mb-8 sm:mb-12">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold natural-gradient-text leading-relaxed">
            Live Market Prices
          </h2>
        </div>
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-200/50">
          <HorizontalPriceTicker />
        </div>
      </div>

      {/* Decorative element */}
      <div className="relative">
        <div className="absolute -z-10 top-0 inset-x-0 h-64 bg-gradient-to-b from-[#F2FFF5] to-transparent opacity-70 blur-2xl"></div>
      </div>
    </div>
  );
}

// ===== DASHBOARD PAGE COMPONENT =====
// This component shows the user's wallet dashboard after they're authenticated
function DashboardPage() {
  // ===== AUTHENTICATION HOOKS =====
  // Get user data and authentication functions
  const { user, logout, isLoggingOut, checkSessionStatus } = useAuth();
  
  // ===== METAMASK HOOKS =====
  // Get MetaMask disconnect function
  const { disconnectWallet } = useMetaMask();
  
  // ===== NAVIGATION HOOKS =====
  // Get navigation function to change pages programmatically
  const [, setLocation] = useLocation();
  
  // ===== SESSION STATUS STATE =====
  // Local state to store session check results
  const [sessionStatus, setSessionStatus] = React.useState(null);

  // ===== SESSION CHECK HANDLER =====
  // Function to manually check if user session is still valid
  const handleCheckSession = async () => {
    const status = await checkSessionStatus();
    setSessionStatus(status);
    console.log('📊 Manual session check result:', status);
  };

  // ===== DATA FETCHING WITH REACT QUERY =====
  // Fetch user's wallet data from the API
  const { data: wallets } = useQuery({
    queryKey: ["/api/wallets"],           // Unique key for this query
    queryFn: () => apiRequest("/api/wallets"),  // Function to fetch the data
  });

  // Fetch user's transaction history from the API
  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],      // Unique key for this query
    queryFn: () => apiRequest("/api/transactions"), // Function to fetch the data
  });

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12 py-8 sm:py-12">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-gradient-to-r from-blue-200 to-teal-200 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-gradient-to-r from-blue-200 to-teal-200 shadow-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                <WalletIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome back!</h1>
              <p className="text-base sm:text-lg text-gray-600 font-medium">
                {user?.provider === 'metamask' ? 
                  `${user.walletAddress?.slice(0, 8)}...${user.walletAddress?.slice(-6)}` : 
                  user?.name
                }
              </p>
              {user?.provider === 'metamask' && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-green-600 font-semibold">MetaMask Connected</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              size="default" 
              variant="outline"
              className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 hover:border-blue-300"
              onClick={() => setLocation("/send")}
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
            <Button 
              size="default" 
              variant="outline"
              className="flex items-center gap-2 px-4 py-2 hover:bg-teal-50 hover:border-teal-300"
              onClick={() => setLocation("/receive")}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Receive
            </Button>
            <Button 
              size="default" 
              variant="outline"
              className="flex items-center gap-2 px-4 py-2 hover:bg-green-50 hover:border-green-300"
              onClick={handleCheckSession}
            >
              <ShieldCheck className="h-4 w-4" />
              Check Session
            </Button>
            <Button 
              size="default" 
              variant="outline"
              onClick={logout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 hover:border-red-300"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        </div>
      </div>

      {/* Session Status Display */}
      {sessionStatus && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-900">Session Status</h3>
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
        </div>
      )}

      {/* Live Market Prices */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">₿</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Live Market Prices</h2>
          <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            MetaMask Wallet
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <HorizontalPriceTicker />
        </div>
      </div>

      {/* Swap Tokens Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Swap Tokens</h2>
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Swap Tokens</h3>
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
                <div className="bg-green-200 rounded-lg px-4 py-3 text-gray-800 font-medium">
                  Ethereum ▼
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <div className="flex gap-2">
                  <div className="bg-green-200 rounded-lg px-4 py-3 text-gray-800 font-medium flex-shrink-0">
                    ETH ▼
                  </div>
                  <input type="text" placeholder="0.0" className="flex-1 bg-green-100 border border-green-300 rounded-lg px-4 py-3" />
                </div>
              </div>
              
              <div className="flex justify-center">
                <div className="w-8 h-8 bg-white border-2 border-green-300 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <div className="flex gap-2">
                  <div className="bg-green-200 rounded-lg px-4 py-3 text-gray-800 font-medium flex-shrink-0">
                    USDC ▼
                  </div>
                  <input type="text" placeholder="0.0" className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallets */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Wallets</h2>
        <div className="grid gap-6">
          {wallets?.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <WalletIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No wallets found</h3>
              <p className="text-gray-500">Create your first wallet to get started!</p>
            </div>
          ) : (
            wallets?.map((wallet: Wallet) => (
              <AddressCard key={wallet.id} wallet={wallet} />
            ))
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Transactions</h2>
        <TransactionList transactions={transactions || []} />
      </div>
    </div>
  );
}

// ===== MAIN HOME PAGE COMPONENT =====
// This is the default export component that decides what to show on the home page
export default function Home() {
  // ===== AUTHENTICATION STATE =====
  // Get authentication status and user data
  const { isAuthenticated, user } = useAuth();

  // ===== PAGE ROUTING LOGIC =====
  // Show dashboard for authenticated users, welcome page for others
  if (isAuthenticated && user) {
    return <DashboardPage />;
  }
  
  return <WelcomePage />;
}
