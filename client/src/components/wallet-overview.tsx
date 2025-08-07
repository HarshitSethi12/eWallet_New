
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

interface Token {
  symbol: string;
  name: string;
  address: string;
  balance?: string;
  balanceUSD?: number;
  price?: number;
  change24h?: number;
  logoURI?: string;
}

interface WalletOverviewProps {
  tokens?: Token[];
  isLoading?: boolean;
}

export function WalletOverview({ tokens = [], isLoading = false }: WalletOverviewProps) {
  // Calculate total portfolio value
  const totalValue = tokens.reduce((sum, token) => sum + (token.balanceUSD || 0), 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading tokens...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No tokens found</p>
            <p className="text-sm text-gray-400 mt-1">Connect your wallet to see your tokens</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Overview
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
            <p className="text-sm text-gray-500">Total Portfolio Value</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tokens.map((token, index) => (
            <div key={token.address || index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                {token.logoURI ? (
                  <img 
                    src={token.logoURI} 
                    alt={token.name}
                    className="w-10 h-10 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-600">
                      {token.symbol.slice(0, 2)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold">{token.symbol}</p>
                  <p className="text-sm text-gray-500">{token.name}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-semibold">{token.balance || '0'} {token.symbol}</p>
                    <p className="text-sm text-gray-500">
                      ${token.balanceUSD?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  {token.change24h !== undefined && (
                    <Badge variant={token.change24h >= 0 ? "default" : "destructive"} className="ml-2">
                      {token.change24h >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(token.change24h).toFixed(2)}%
                    </Badge>
                  )}
                </div>
                {token.price && (
                  <p className="text-xs text-gray-400 mt-1">
                    ${token.price.toFixed(6)} per {token.symbol}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
