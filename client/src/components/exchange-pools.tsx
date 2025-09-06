
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LiquidityPool {
  pairId: string;
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  fee: number;
  totalShares: number;
  currentPrice: number;
  priceA: number;
  volume24h: number;
  tvl: number;
}

export function ExchangePools() {
  const { toast } = useToast();
  const [pools, setPools] = useState<LiquidityPool[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPools = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/exchange/pools');
      if (response.ok) {
        const data = await response.json();
        setPools(data.pools || []);
      }
    } catch (error) {
      console.error('Error fetching pools:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch liquidity pools"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
    
    // Auto-refresh pools every 30 seconds
    const interval = setInterval(fetchPools, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number, currency: string = '₹') => {
    if (currency === '₹') {
      return `₹${(amount / 100000).toFixed(2)}L`; // Show in Lakhs
    }
    return `${amount.toFixed(4)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            BitWallet Exchange Pools
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchPools}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pools.map((pool) => (
            <div
              key={pool.pairId}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{pool.pairId}</h3>
                  <p className="text-sm text-gray-500">
                    Fee: {(pool.fee * 100).toFixed(1)}%
                  </p>
                </div>
                <Badge variant="default">
                  {formatCurrency(pool.currentPrice)} per {pool.tokenA}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">TVL</p>
                  <p className="font-semibold">{formatCurrency(pool.tvl)}</p>
                </div>
                <div>
                  <p className="text-gray-500">24h Volume</p>
                  <p className="font-semibold">{formatCurrency(pool.volume24h)}</p>
                </div>
                <div>
                  <p className="text-gray-500">{pool.tokenA} Reserve</p>
                  <p className="font-semibold">{formatCurrency(pool.reserveA, '')}</p>
                </div>
                <div>
                  <p className="text-gray-500">{pool.tokenB} Reserve</p>
                  <p className="font-semibold">{formatCurrency(pool.reserveB)}</p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Liquidity
                </Button>
                <Button size="sm" className="flex-1">
                  Trade
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {pools.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <p>No liquidity pools available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ExchangePools;
