
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

// Get coin image from CoinGecko API with fallback
const getCoinImageUrl = (coinId: string): string => {
  return `https://api.coingecko.com/api/v3/coins/${coinId}/image`;
};

// Enhanced fallback for when image fails to load
const getCoinFallbackIcon = (symbol: string): string => {
  const colors: { [key: string]: string } = {
    'BTC': '#f7931a',
    'ETH': '#627eea', 
    'BNB': '#f3ba2f',
    'ADA': '#0033ad',
    'SOL': '#9945ff',
    'XRP': '#23292f',
    'DOT': '#e6007a',
    'DOGE': '#c2a633',
    'AVAX': '#e84142',
    'MATIC': '#8247e5',
    'LTC': '#bfbbbb',
    'LINK': '#2a5ada',
    'UNI': '#ff007a',
    'ATOM': '#2e3148'
  };
  
  const color = colors[symbol.toUpperCase()] || '#6B7280';
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="${color}"/>
      <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="10" font-weight="bold">
        ${symbol.toUpperCase()}
      </text>
    </svg>
  `)}`;
};

export function PriceTicker() {
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
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white border-2 border-gray-100 shadow-sm">
                  <img 
                    src={`https://api.coingecko.com/api/v3/coins/${crypto.id}/image`}
                    alt={crypto.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = getCoinFallbackIcon(crypto.symbol);
                    }}
                  />
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
