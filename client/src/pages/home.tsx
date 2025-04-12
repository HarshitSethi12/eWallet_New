import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AddressCard } from "@/components/address-card";
import { TransactionList } from "@/components/transaction-list";
import { Send, ArrowDownLeft, Wallet as WalletIcon, ShieldCheck } from "lucide-react";
import { generateMockAddress, generateMockPrivateKey } from "@/lib/mock-blockchain";
import { apiRequest } from "@/lib/queryClient";
import type { Wallet, Transaction } from "@shared/schema";
import { RiExchangeFundsFill } from "react-icons/ri";

function WelcomePage() {
  const createWallet = async () => {
    const newWallet = {
      address: generateMockAddress(),
      privateKey: generateMockPrivateKey(),
      balance: 100000000, // 1 BTC initial balance for demo
    };
    const response = await apiRequest("POST", "/api/wallet", newWallet);
    return response.json();
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-16 py-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="relative inline-flex items-center justify-center w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#30D158] via-teal-400 to-[#0A3665] opacity-20 blur-xl animate-pulse"></div>
          <div className="absolute inset-2 bg-gradient-to-br from-[#F2FFF5] to-white rounded-full opacity-90"></div>
          <div className="relative z-10 flex items-center justify-center icon-group icon-float">
            <WalletIcon className="w-10 h-10 text-[#30D158] transform -translate-x-4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }} />
            <RiExchangeFundsFill className="w-14 h-14 text-teal-500" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }} />
            <ShieldCheck className="w-10 h-10 text-[#0A3665] transform translate-x-4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }} />
          </div>
        </div>
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-[#30D158] to-[#0A3665] bg-clip-text text-transparent">
          Your Go-to Cryptocurrency Wallet
        </h1>
        <p className="text-xl font-medium max-w-2xl mx-auto" style={{ color: 'var(--color-heading)' }}>
          Secure Cryptocurrency Management
        </p>
        <div className="flex gap-4 justify-center mt-10">
          <Button 
            size="lg" 
            className="btn-primary px-8 py-6 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all"
            onClick={createWallet}
          >
            Sign In
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
  });

  const { data: transactions = [], isLoading: isLoadingTx } = useQuery<Transaction[]>({
    queryKey: [`/api/transactions/${wallet?.address}`],
    enabled: !!wallet?.address,
  });

  if (isLoadingWallet || isLoadingTx) {
    return (
      <div className="container max-w-3xl mx-auto p-4 space-y-8 animate-pulse">
        <div className="h-80 bg-muted rounded-lg" />
        <div className="h-60 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!wallet) {
    return <WelcomePage />;
  }

  return (
    <div className="container max-w-3xl mx-auto p-4 space-y-10">
      <div className="flex justify-center gap-4 mt-6">
        <Link href="/send">
          <Button className="btn-primary px-6 py-5 text-lg rounded-lg shadow-md hover:shadow-lg transition-all">
            <Send className="mr-2 h-5 w-5" />
            Send
          </Button>
        </Link>
        <Link href="/receive">
          <Button className="btn-secondary px-6 py-5 text-lg rounded-lg shadow-md hover:shadow-lg transition-all">
            <ArrowDownLeft className="mr-2 h-5 w-5" />
            Receive
          </Button>
        </Link>
      </div>

      <AddressCard 
        address={wallet.address}
        balance={wallet.lastBalance ? parseInt(wallet.lastBalance) : 0}
      />

      <TransactionList 
        transactions={transactions}
        walletAddress={wallet.address}
      />
    </div>
  );
}