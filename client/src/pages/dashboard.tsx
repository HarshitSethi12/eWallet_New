
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressCard } from "@/components/address-card";
import { Send, ArrowDownLeft, Wallet as WalletIcon, ShieldCheck } from "lucide-react";
import { generateMockAddress, generateMockPrivateKey } from "@/lib/mock-blockchain";
import { apiRequest } from "@/lib/queryClient";
import type { Wallet } from "@shared/schema";
import { RiExchangeFundsFill } from "react-icons/ri";
import { useAuth } from "@/hooks/use-auth";
import { useMetaMask } from "@/hooks/use-metamask";
import { WalletOverview } from "@/components/wallet-overview";
import { DexSwap } from "@/components/dex-swap";

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

  return (
    <div className="container max-w-6xl mx-auto px-3 sm:px-4 space-y-6 sm:space-y-8 py-6 sm:py-8">
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
            onClick={() => window.location.href = "/send"}
          >
            <Send className="h-4 w-4" />
            Send
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => window.location.href = "/receive"}
          >
            <ArrowDownLeft className="h-4 w-4" />
            Receive
          </Button>
        </div>
      </div>

      {/* Wallet Section */}
      {wallet ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* MetaMask Wallet Overview */}
          <WalletOverview />
          
          {/* DEX Swap Component */}
          <DexSwap />
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
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
  );
}
