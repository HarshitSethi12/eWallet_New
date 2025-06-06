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
import { HorizontalPriceTicker } from "@/components/horizontal-price-ticker";

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
        <div className="flex flex-col items-center gap-4 mt-6 sm:mt-8 md:mt-10">
          <Button 
            size="lg" 
            className="btn-primary px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transition-all"
            onClick={login}
          >
            Sign In with Google
          </Button>
        </div>
      </div>

      {/* Live Market Prices Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center" style={{ color: '#0A3665' }}>
          Live Market Prices
        </h2>
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

function AuthenticatedWelcome() {
  const { user, logout, isLoggingOut } = useAuth();

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
          <span className="relative z-10 italic" style={{ 
            color: '#0A3665',
            textShadow: '1px 1px 2px rgba(48, 209, 88, 0.1)'
          }}>
            Welcome {user?.name?.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}..
          </span>
        </h1>
        <div className="flex flex-col items-center gap-4 mt-6 sm:mt-8 md:mt-10">
          <img 
            src={user?.picture} 
            alt={user?.name} 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white shadow-lg"
          />
          <div className="flex flex-col gap-3">
            <Button 
              size="lg" 
              className="btn-primary px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              onClick={() => window.location.href = '/dashboard'}
            >
              <WalletIcon className="h-5 w-5" />
              Dashboard
            </Button>
            <Button 
              size="lg" 
              className="btn-primary px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              onClick={logout}
              disabled={isLoggingOut}
            >
              <LogOut className="h-5 w-5" />
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
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

  // Show the authenticated welcome page instead of the wallet interface
  return <AuthenticatedWelcome />;

}