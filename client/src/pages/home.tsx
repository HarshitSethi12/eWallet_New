import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AddressCard } from "@/components/address-card";
import { TransactionList } from "@/components/transaction-list";
import { Send, ArrowDownLeft, Wallet as WalletIcon, ShieldCheck, LogOut } from "lucide-react";
import { generateMockAddress, generateMockPrivateKey } from "@/lib/mock-blockchain";
import { apiRequest } from "@/lib/queryClient";
import type { Wallet, Transaction } from "@shared/schema";
import { RiExchangeFundsFill } from "react-icons/ri";
import { useAuth } from "@/hooks/use-auth";

function WelcomePage() {
  const { login } = useAuth();

  return (
    <div className="container max-w-4xl mx-auto px-3 sm:px-4 space-y-8 sm:space-y-12 md:space-y-16 py-6 sm:py-8 md:py-12">
      {/* Hero Section */}
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
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight px-2 leading-tight relative">
          <span className="relative z-10" style={{ 
            color: '#0A3665',
            textShadow: '1px 1px 2px rgba(48, 209, 88, 0.1)'
          }}>
            <span className="block sm:inline">Your Go-to</span>{" "}
            <span className="block sm:inline" style={{ color: '#1E7B43' }}>Cryptocurrency</span>{" "}
            <span className="block sm:inline">Wallet</span>
          </span>
        </h1>
        <p className="text-lg md:text-xl font-medium max-w-2xl mx-auto px-4 animated-gradient-text">
          Secure Cryptocurrency Management
        </p>
        <div className="flex gap-4 justify-center mt-6 sm:mt-8 md:mt-10">
          <Button 
            size="lg" 
            className="btn-primary px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transition-all"
            onClick={login}
          >
            Sign In with Google
          </Button>
        </div>
      </div>
      
      {/* Decorative element */}
      <div className="relative">
        <div className="absolute -z-10 top-0 inset-x-0 h-64 bg-gradient-to-b from-[#F2FFF5] to-transparent opacity-70 blur-2xl"></div>
      </div>
    </div>
  );
}

export default function Home() {
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
    return <WelcomePage />;
  }

  if (isLoadingWallet || isLoadingTx) {
    return (
      <div className="container max-w-3xl mx-auto p-4 space-y-8 animate-pulse">
        <div className="h-80 bg-muted rounded-lg" />
        <div className="h-60 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-3 sm:px-4 space-y-6 sm:space-y-8 md:space-y-10 py-4">
      {/* User Profile Section */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <img 
              src={user?.picture} 
              alt={user?.name} 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
            />
            <div>
              <h2 className="font-semibold text-lg" style={{ color: 'var(--color-heading)' }}>
                Welcome, {user?.given_name}!
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-body)' }}>
                {user?.email}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={logout}
            disabled={isLoggingOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>

      <div className="flex justify-center gap-2 sm:gap-4 mt-4 sm:mt-6">
        <Link href="/send">
          <Button className="btn-primary px-4 sm:px-6 py-4 sm:py-5 text-base sm:text-lg rounded-lg shadow-md hover:shadow-lg transition-all">
            <Send className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Send
          </Button>
        </Link>
        <Link href="/receive">
          <Button className="btn-secondary px-4 sm:px-6 py-4 sm:py-5 text-base sm:text-lg rounded-lg shadow-md hover:shadow-lg transition-all">
            <ArrowDownLeft className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Receive
          </Button>
        </Link>
      </div>

      {wallet && (
        <>
          <AddressCard 
            address={wallet.address}
            balance={wallet.lastBalance ? parseInt(wallet.lastBalance) : 0}
          />

          <TransactionList 
            transactions={transactions}
            walletAddress={wallet.address}
          />
        </>
      )}
    </div>
  );
}