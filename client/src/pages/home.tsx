import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AddressCard } from "@/components/address-card";
import { TransactionList } from "@/components/transaction-list";
import { Send, Bitcoin } from "lucide-react";
import { generateMockAddress, generateMockPrivateKey } from "@/lib/mock-blockchain";
import { apiRequest } from "@/lib/queryClient";
import type { Wallet, Transaction } from "@shared/schema";

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
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <Bitcoin className="w-20 h-20 text-primary animate-pulse rotate-12" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Your Go-to Cryptocurrency Wallet
        </h1>
        <p className="text-xl font-medium text-muted-foreground max-w-2xl mx-auto">
          Secure Cryptocurrency Management
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={createWallet} className="mt-8">
            Sign In
          </Button>
          <Button size="lg" href="/signup" className="mt-8">
            Sign Up
          </Button>
        </div>
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
    <div className="container max-w-3xl mx-auto p-4 space-y-8">
      <div className="flex justify-end">
        <Link href="/send">
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Send Bitcoin
          </Button>
        </Link>
      </div>

      <AddressCard 
        address={wallet.address}
        balance={wallet.balance}
      />

      <TransactionList 
        transactions={transactions}
        walletAddress={wallet.address}
      />
    </div>
  );
}