import { useQuery } from "@tanstack/react-query";
import type { Wallet } from "@shared/schema";
import { AddressCard } from "@/components/address-card";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Receive() {
  const { data: wallet, isLoading } = useQuery<Wallet | null>({
    queryKey: ["/api/wallet/primary"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="container max-w-xl mx-auto p-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="container max-w-xl mx-auto p-4">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2">No Wallet Found</h2>
          <p>Please create a wallet from the home page first.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-center">Receive Bitcoin</h1>
      <p className="text-center text-muted-foreground">
        Share your QR code or wallet address to receive Bitcoin
      </p>
      <AddressCard 
        address={wallet.address}
        balance={wallet.balance}
      />
    </div>
  );
}
