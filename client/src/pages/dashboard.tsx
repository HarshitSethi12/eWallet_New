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
    <div className="flex flex-col h-screen">
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

                {/* Price Ticker Section - Right Side */}
                <div className="flex flex-col h-full">
                  <div className="h-full">
                    <PriceTicker />
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