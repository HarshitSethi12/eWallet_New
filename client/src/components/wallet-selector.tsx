
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, Smartphone } from "lucide-react";
import { useMetaMask } from "@/hooks/use-metamask";
import { useWalletConnect } from "@/hooks/use-walletconnect";
import { useToast } from "@/hooks/use-toast";

export function WalletSelector() {
  const [open, setOpen] = useState(false);
  const metamask = useMetaMask();
  const walletConnect = useWalletConnect();
  const { toast } = useToast();

  const handleMetaMaskConnect = async () => {
    try {
      await metamask.connectWallet();
      setOpen(false);
      toast({
        title: "Connected!",
        description: "MetaMask wallet connected successfully"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect MetaMask"
      });
    }
  };

  const handleWalletConnectConnect = async () => {
    try {
      await walletConnect.connectWallet();
      setOpen(false);
      toast({
        title: "Connected!",
        description: "WalletConnect connected successfully"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect WalletConnect"
      });
    }
  };

  // If already connected, show disconnect button
  if (metamask.isConnected || walletConnect.isConnected) {
    const connectedWallet = metamask.isConnected ? 'MetaMask' : 'WalletConnect';
    const handleDisconnect = metamask.isConnected 
      ? metamask.disconnectWallet 
      : walletConnect.disconnectWallet;

    return (
      <Button variant="outline" onClick={handleDisconnect}>
        Disconnect {connectedWallet}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Your Wallet</DialogTitle>
          <DialogDescription>
            Choose your preferred wallet to connect to BitWallet
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {/* MetaMask Option */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={handleMetaMaskConnect}
            disabled={metamask.isLoading}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold">MetaMask</p>
                <p className="text-xs text-gray-500">Connect using browser extension</p>
              </div>
            </div>
          </Button>

          {/* WalletConnect Option */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={handleWalletConnectConnect}
            disabled={walletConnect.isLoading}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold">WalletConnect</p>
                <p className="text-xs text-gray-500">Scan QR with mobile wallet</p>
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
