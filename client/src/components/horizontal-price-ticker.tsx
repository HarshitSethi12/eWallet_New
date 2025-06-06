
import { useQuery } from "@tanstack/react-query";
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

export function HorizontalPriceTicker() {
  const { data: prices, isLoading, error } = useQuery<CryptoPriceData[]>({
    queryKey: ["crypto-prices"],
    queryFn: async () => {
      const response = await fetch("/api/crypto-prices");
      if (!response.ok) throw new Error("Failed to fetch prices");
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="w-full bg-white/50 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center gap-6 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 min-w-[180px] animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="space-y-1">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-white/50 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-100">
        <p className="text-center text-gray-500">Unable to load prices</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white/50 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-center gap-6 overflow-x-auto pb-2">
        {prices?.map((crypto) => {
          const isPositive = crypto.price_change_percentage_24h > 0;
          const isNeutral = Math.abs(crypto.price_change_percentage_24h) < 0.01;
          
          return (
            <div key={crypto.id} className="flex items-center gap-3 min-w-[180px] hover:scale-105 transition-transform">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">
                    {crypto.symbol.toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg" style={{ color: 'var(--color-heading)' }}>
                    ${crypto.current_price.toLocaleString()}
                  </span>
                  <div className={`flex items-center gap-1 text-xs ${
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
                <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                  {crypto.symbol.toUpperCase()} • {crypto.name}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="pt-2 border-t border-gray-200 mt-2">
        <p className="text-xs text-gray-400 text-center">
          Live prices • Updates every 30 seconds
        </p>
      </div>
    </div>
  );
}
