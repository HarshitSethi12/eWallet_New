import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, RefreshCw, Plus, Trash2 } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WalletSwitcherProps {
  onCreateNew?: () => void;
}

export function WalletSwitcher({ onCreateNew }: WalletSwitcherProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<number | null>(null);

  // Only show for email-authenticated users
  if (user?.provider !== 'email') {
    return null;
  }

  // Fetch all wallets for this email
  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ['/auth/email/wallets', user?.email],
    queryFn: () => apiRequest(`/auth/email/wallets?email=${user?.email}`),
    enabled: !!user?.email,
  });

  // Switch wallet mutation
  const switchWalletMutation = useMutation({
    mutationFn: async (walletId: number) => {
      const response = await fetch('/auth/email/switch-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ walletId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to switch wallet');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Wallet Switched!',
        description: `Now using wallet ${data.wallet.address.slice(0, 6)}...${data.wallet.address.slice(-4)}`,
      });

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();

      // Reload the page to update all components with new wallet data
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete wallet mutation
  const deleteWalletMutation = useMutation({
    mutationFn: async (walletId: number) => {
      const response = await fetch('/auth/email/delete-wallet', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ walletId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete wallet');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Wallet Deleted!',
        description: 'The wallet has been successfully deleted.',
      });

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();

      // If the current wallet is deleted, reload the page to switch to another wallet or prompt creation
      if (walletToDelete === user?.walletId) {
        window.location.reload();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsDeleteDialogOpen(false);
      setWalletToDelete(null);
    }
  });

  const handleSwitchWallet = (walletId: string) => {
    setIsLoading(true);
    switchWalletMutation.mutate(Number(walletId));
  };

  const handleDeleteWallet = (walletId: number) => {
    setWalletToDelete(walletId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteWallet = () => {
    if (walletToDelete !== null) {
      deleteWalletMutation.mutate(walletToDelete);
    }
  };

  if (walletsLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading wallets...
      </div>
    );
  }

  if (!wallets || wallets.length === 0) {
    return null;
  }

  const currentWalletId = user?.walletId?.toString();

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-amber-700">
          <Wallet className="h-4 w-4" />
          Switch Wallet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Select
            value={currentWalletId}
            onValueChange={handleSwitchWallet}
            disabled={isLoading || switchWalletMutation.isPending || deleteWalletMutation.isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a wallet" />
            </SelectTrigger>
            <SelectContent>
              {wallets.map((wallet: any) => (
                <SelectItem key={wallet.id} value={wallet.id.toString()}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-mono text-sm">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Created: {new Date(wallet.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {wallets.length > 1 && ( // Only show delete button if there's more than one wallet
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering select on button click
                          handleDeleteWallet(wallet.id);
                        }}
                        disabled={isLoading || switchWalletMutation.isPending || deleteWalletMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {onCreateNew && (
            <Button
              variant="outline"
              className="w-full"
              onClick={onCreateNew}
              disabled={isLoading || switchWalletMutation.isPending || deleteWalletMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Wallet
            </Button>
          )}

          <div className="text-xs text-gray-500 text-center">
            You have {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
          </div>
        </div>
      </CardContent>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this wallet?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All data associated with this wallet will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWalletToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteWallet} disabled={deleteWalletMutation.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}