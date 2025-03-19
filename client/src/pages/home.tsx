import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AddressCard } from "@/components/address-card";
import { TransactionList } from "@/components/transaction-list";
import { Send, Shield, Smartphone, Bitcoin, QrCode, Fingerprint } from "lucide-react";
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
          <Smartphone className="w-10 h-10 absolute -bottom-2 -right-2 text-primary/80 animate-bounce" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Your Go-to Cryptocurrency Wallet
        </h1>
        <p className="text-xl font-medium text-muted-foreground max-w-2xl mx-auto">
          Secure Cryptocurrency Management
        </p>
        <Button size="lg" onClick={createWallet} className="mt-8">
          <Smartphone className="mr-2 h-5 w-5" />
          Try Demo Wallet
        </Button>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="space-y-3 text-center">
          <Shield className="w-8 h-8 mx-auto text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">Mobile Security</h3>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Enhanced with biometric authentication and secure enclave storage
          </p>
        </div>

        <div className="space-y-3 text-center">
          <QrCode className="w-8 h-8 mx-auto text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">Quick Transfers</h3>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Scan QR codes for instant Bitcoin transfers on the go
          </p>
        </div>

        <div className="space-y-3 text-center">
          <Fingerprint className="w-8 h-8 mx-auto text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">Touch ID / Face ID</h3>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Secure access with your device's biometric authentication
          </p>
        </div>
      </div>

      {/* Mobile App Promotion */}
      <div className="text-center space-y-4 bg-primary/5 rounded-lg p-8">
        <h2 className="text-2xl font-semibold tracking-tight">Coming Soon to Mobile Stores</h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Get ready for a seamless Bitcoin experience on your mobile device.
          Native apps for both iOS and Android platforms.
        </p>
        <div className="flex gap-4 justify-center mt-6">
          <Button variant="outline" disabled>
            App Store
          </Button>
          <Button variant="outline" disabled>
            Google Play
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