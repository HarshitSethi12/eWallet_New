
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressCard } from "@/components/address-card";
import { TransactionList } from "@/components/transaction-list";
import { AiChat } from "@/components/ai-chat";
import { Send, ArrowDownLeft, Wallet as WalletIcon, ShieldCheck, LogOut } from "lucide-react";
import { generateMockAddress, generateMockPrivateKey } from "@/lib/mock-blockchain";
import { apiRequest } from "@/lib/queryClient";
import type { Wallet, Transaction } from "@shared/schema";
import { RiExchangeFundsFill } from "react-icons/ri";
import { useAuth } from "@/hooks/use-auth";
import { useMetaMask } from "@/hooks/use-metamask";
import { HorizontalPriceTicker } from "@/components/horizontal-price-ticker";
import React from "react";

export default function Dashboard() {
  const { user, logout, isLoggingOut, checkSessionStatus } = useAuth();
  const { disconnectWallet } = useMetaMask();
  const [sessionStatus, setSessionStatus] = React.useState(null);

  // Manual session check function
  const handleCheckSession = async () => {
    const status = await checkSessionStatus();
    setSessionStatus(status);
    console.log('📊 Manual session check result:', status);
  };

  const { data: wallets } = useQuery({
    queryKey: ["/api/wallets"],
    queryFn: () => apiRequest("/api/wallets"),
  });

  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: () => apiRequest("/api/transactions"),
  });

  return (
    <div className="h-full flex flex-col">
      {/* Main content container that takes full available space */}
      <div className="flex-1 w-full px-3 py-3 max-w-none overflow-hidden">
        <div className="h-full max-w-none mx-auto">
          <div className="h-full flex flex-col">
            {/* Two column layout for AI assistant and wallet - Full height */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-2 h-full">
              {/* AI Assistant Section - Left Side */}
              <div className="flex flex-col h-full min-h-0">
                <AiChat />
              </div>

              {/* MetaMask Wallet Section - Right Side */}
              <div className="flex flex-col h-full min-h-0 space-y-2">
                <Card className="flex-1 flex flex-col min-h-0">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {user?.picture ? (
                          <img 
                            src={user.picture} 
                            alt={user.name} 
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white shadow-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white shadow-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                            <WalletIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                          </div>
                        )}
                        <div>
                          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">MetaMask Wallet</h1>
                          <p className="text-sm sm:text-base text-gray-600">
                            {user?.provider === 'metamask' ? 
                              `${user.walletAddress?.slice(0, 6)}...${user.walletAddress?.slice(-4)}` : 
                              user?.name
                            }
                          </p>
                          {user?.provider === 'metamask' && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <p className="text-xs text-gray-500">MetaMask Connected</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex items-center gap-2"
                          onClick={() => window.location.href = "/send"}
                        >
                          <Send className="h-4 w-4" />
                          Send
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex items-center gap-2"
                          onClick={() => window.location.href = "/receive"}
                        >
                          <ArrowDownLeft className="h-4 w-4" />
                          Receive
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={logout}
                          disabled={isLoggingOut}
                          className="flex items-center gap-2"
                        >
                          <LogOut className="h-4 w-4" />
                          {isLoggingOut ? "Signing out..." : "Sign Out"}
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col min-h-0 space-y-4">
                    {/* Tokens Section */}
                    <div className="flex-1 min-h-0">
                      <h3 className="text-lg font-bold mb-4 text-gray-900">Tokens</h3>
                      <div className="h-full overflow-y-auto">
                        {wallets?.length === 0 ? (
                          <div className="text-center py-8 sm:py-12">
                            <WalletIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 text-sm sm:text-base">No tokens found</p>
                            <p className="text-xs text-gray-400 mt-1">Connect your wallet to see your tokens</p>
                          </div>
                        ) : (
                          <div className="grid gap-4 sm:gap-6">
                            {wallets?.map((wallet: Wallet) => (
                              <AddressCard key={wallet.id} wallet={wallet} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="flex-shrink-0">
                      <h3 className="text-lg font-bold mb-4 text-gray-900">Recent Transactions</h3>
                      <div className="max-h-48 overflow-y-auto">
                        <TransactionList transactions={transactions || []} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
