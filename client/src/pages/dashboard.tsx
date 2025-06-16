import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressCard } from "@/components/address-card";
import { TransactionList } from "@/components/transaction-list";
import { Send, ArrowDownLeft, Wallet as WalletIcon, ShieldCheck, LogOut } from "lucide-react";
import { generateMockAddress, generateMockPrivateKey } from "@/lib/mock-blockchain";
import { apiRequest } from "@/lib/queryClient";
import type { Wallet, Transaction } from "@shared/schema";
import { RiExchangeFundsFill } from "react-icons/ri";
import { useAuth } from "@/hooks/use-auth";
import { PriceTicker } from "@/components/price-ticker";
import { AIChat } from "@/components/ai-chat";

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

  const { data: transactions = [], isLoading: isLoadingTx } = useQuery<Transaction[]>({
    queryKey: [`/api/transactions/${wallet?.address}`],
    enabled: !!wallet?.address && isAuthenticated,
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
      {/* Header Section */}
      <div className="text-center space-y-4 sm:space-y-6">
        <div className="relative inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 mb-2 sm:mb-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#30D158] via-teal-400 to-[#0A3665] opacity-20 blur-xl animate-pulse"></div>
          <div className="absolute inset-2 bg-gradient-to-br from-[#F2FFF5] to-white rounded-full opacity-90"></div>
          <div className="relative z-10 flex items-center justify-center icon-group icon-float">
            <WalletIcon className="w-8 h-8 sm:w-10 sm:h-10 text-[#30D158] transform -translate-x-2 sm:-translate-x-4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }} />
            <RiExchangeFundsFill className="w-12 h-12 sm:w-14 sm:h-14 text-teal-500" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }} />
            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-[#0A3665] transform translate-x-2 sm:translate-x-4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }} />
          </div>
        </div>
      </div>

      

      {/* Wallet Section */}
      {wallet ? (
        <div className="space-y-6">
          <AddressCard address={wallet.address} />

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/send">
              <Button size="lg" className="btn-primary flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send
              </Button>
            </Link>
            <Link href="/receive">
              <Button size="lg" className="btn-primary flex items-center gap-2">
                <ArrowDownLeft className="h-5 w-5" />
                Receive
              </Button>
            </Link>
          </div>

          {/* Price Ticker Section */}
          <div className="space-y-4">
            <PriceTicker />
          </div>

          {/* Two column layout for transactions and AI chat */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Transactions */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center">Recent Transactions</h2>
              {isLoadingTx ? (
                <p className="text-center">Loading transactions...</p>
              ) : (
                <TransactionList transactions={transactions} />
              )}
            </div>

            {/* AI Chat Assistant */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center">AI Assistant</h2>
              <AIChat wallet={wallet} transactions={transactions} />
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