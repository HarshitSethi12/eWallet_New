
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CryptoPriceData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
}

export function PriceTicker() {
  const { data: prices, isLoading, error } = useQuery<CryptoPriceData[]>({
    queryKey: ["crypto-prices"],
    queryFn: async () => {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,cardano,polkadot,chainlink&order=market_cap_desc&per_page=5&page=1&sparkline=false"
      );
      if (!response.ok) throw new Error("Failed to fetch prices");
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle style={{ color: 'var(--color-heading)' }}>Market Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle style={{ color: 'var(--color-heading)' }}>Market Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500">Unable to load prices</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-heading)' }}>
          <span>Market Prices</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {prices?.map((crypto) => {
          const isPositive = crypto.price_change_percentage_24h > 0;
          const isNeutral = Math.abs(crypto.price_change_percentage_24h) < 0.01;
          
          return (
            <div key={crypto.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {crypto.symbol.toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--color-heading)' }}>
                    {crypto.symbol.toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-500">{crypto.name}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-bold text-lg" style={{ color: 'var(--color-heading)' }}>
                  ${crypto.current_price.toLocaleString()}
                </p>
                <div className={`flex items-center gap-1 text-sm ${
                  isNeutral ? 'text-gray-500' : isPositive ? 'text-green-500' : 'text-red-500'
                }`}>
                  {isNeutral ? (
                    <Minus className="h-3 w-3" />
                  ) : isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {isPositive ? '+' : ''}{crypto.price_change_percentage_24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="pt-2 border-t">
          <p className="text-xs text-gray-400 text-center">
            Prices update every 30 seconds • Powered by CoinGecko
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
