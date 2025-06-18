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
import { PriceTicker } from "@/components/price-ticker";

export default function Dashboard() {
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();

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
    <div className="container max-w-4xl mx-auto px-3 sm:px-4 space-y-8 sm:space-y-12 md:space-y-16 py-6 sm:py-8 md:py-12">
      {/* Wallet Section */}
      {wallet ? (
        <div className="space-y-6">
          {/* Two column layout for AI assistant and price ticker - Equal half-half spacing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* AI Assistant Section - Left Side */}
            <div className="flex flex-col h-full">
              <AiChat />
            </div>

            {/* Price Ticker Section - Right Side */}
            <div className="flex flex-col h-full">
              <PriceTicker />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-6">
          <Card>
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

      {/* Decorative element */}
      <div className="relative">
        <div className="absolute -z-10 top-0 inset-x-0 h-64 bg-gradient-to-b from-[#F2FFF5] to-transparent opacity-70 blur-2xl"></div>
      </div>
    </div>
  );
}