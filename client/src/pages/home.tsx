import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AddressCard } from "@/components/address-card";
import { TransactionList } from "@/components/transaction-list";
import { Send, Shield, Wallet2, Bitcoin } from "lucide-react";
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
        <Bitcoin className="w-16 h-16 mx-auto text-primary animate-bounce" />
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Welcome to Your Bitcoin Wallet
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A secure and user-friendly way to manage your Bitcoin transactions
        </p>
        <Button size="lg" onClick={createWallet} className="mt-8">
          <Wallet2 className="mr-2 h-5 w-5" />
          Create Your Wallet
        </Button>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="space-y-3 text-center">
          <Shield className="w-8 h-8 mx-auto text-primary" />
          <h3 className="text-lg font-semibold">Secure Storage</h3>
          <p className="text-muted-foreground">
            Your Bitcoin is protected with industry-standard security measures
          </p>
        </div>

        <div className="space-y-3 text-center">
          <Send className="w-8 h-8 mx-auto text-primary" />
          <h3 className="text-lg font-semibold">Easy Transfers</h3>
          <p className="text-muted-foreground">
            Send and receive Bitcoin with just a few clicks
          </p>
        </div>

        <div className="space-y-3 text-center">
          <Wallet2 className="w-8 h-8 mx-auto text-primary" />
          <h3 className="text-lg font-semibold">Transaction History</h3>
          <p className="text-muted-foreground">
            Keep track of all your Bitcoin transactions in one place
          </p>
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