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
  const { login, loginWithApple } = useAuth();

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
            className="btn-primary px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
            onClick={login}
          >
            <span className="text-base sm:text-lg font-semibold">Google</span>
            <svg className="h-6 w-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </Button>
        </div>
      </div>

      {/* Live Market Prices Section */}
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 mb-12 sm:mb-16">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-6 sm:mb-8 text-gray-800">
          Live Market Prices
        </h2>
        <HorizontalPriceTicker />
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