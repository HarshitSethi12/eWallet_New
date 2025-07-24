
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressCard } from "@/components/address-card";
import { AiChat } from "@/components/ai-chat";
import { Send, ArrowDownLeft, Wallet as WalletIcon, ShieldCheck, LogOut } from "lucide-react";
import { generateMockAddress, generateMockPrivateKey } from "@/lib/mock-blockchain";
import { apiRequest } from "@/lib/queryClient";
import type { Wallet } from "@shared/schema";
import { RiExchangeFundsFill } from "react-icons/ri";
import { useAuth } from "@/hooks/use-auth";
import { useMetaMask } from "@/hooks/use-metamask";
import { WalletOverview } from "@/components/wallet-overview";

export default function Dashboard() {
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();
  const { disconnectWallet } = useMetaMask();

  const { data: wallet, isLoading: isLoadingWallet } = useQuery<Wallet | null>({
    queryKey: ["/api/wallet/primary"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/wallet/primary");
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="container max-w-md mx-auto mt-20 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>Please sign in to access your dashboard.</p>
            <Link href="/">
              <Button className="btn-primary">
                Go to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDisconnect = async () => {
    try {
      // Disconnect MetaMask first
      disconnectWallet();
      
      // Clear MetaMask connection state
      window.localStorage.removeItem('metamask-connected');
      window.sessionStorage.clear();
      
      // Call logout to clear session
      logout();
      
      // Force navigation to homepage as backup
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    } catch (error) {
      console.error('Error during disconnect:', error);
      // Force navigation even if there's an error
      window.location.href = '/';
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
            <WalletIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">
              {user?.provider === 'metamask' ? 
                `${user.walletAddress?.slice(0, 6)}...${user.walletAddress?.slice(-4)}` : 
                user?.name
              }
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleDisconnect}
            disabled={isLoggingOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Disconnecting..." : "Disconnect Wallet"}
          </Button>
        </div>
      </div>
      
      {/* Main content container that takes remaining space between header and footer */}
      <div className="flex-1 w-full px-8 py-8 max-w-none">
        <div className="h-full max-w-none mx-auto">
          {/* Wallet Section */}
          {wallet ? (
            <div className="h-full flex items-center justify-center">
              {/* Two column layout for AI assistant and price ticker - Enhanced size with equal spacing */}
              <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                {/* AI Assistant Section - Left Side */}
                <div className="flex flex-col h-full">
                  <AiChat />
                </div>

                {/* MetaMask Wallet Section - Right Side */}
                <div className="flex flex-col h-full">
                  <div className="h-full">
                    <WalletOverview />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Create Your Wallet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>No wallet found. Create one to get started with cryptocurrency management.</p>
                  <Button 
                    className="btn-primary w-full" 
                    onClick={() => {
                      // Mock wallet creation for now
                      console.log("Creating wallet...");
                    }}
                  >
                    Create Wallet
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
