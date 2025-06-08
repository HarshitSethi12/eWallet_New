
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

// Fallback SVG icons for major cryptocurrencies
const getCoinFallbackIcon = (symbol: string): string => {
  const icons: { [key: string]: string } = {
    'BTC': `data:image/svg+xml,${encodeURIComponent(`
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#f7931a"/>
        <path d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z" fill="white"/>
      </svg>
    `)}`,
    'ETH': `data:image/svg+xml,${encodeURIComponent(`
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#627eea"/>
        <path d="M16.498 4v8.87l7.497 3.35-7.497-12.22z" fill="white" fill-opacity=".602"/>
        <path d="M16.498 4L9 16.22l7.498-3.35V4z" fill="white"/>
        <path d="M16.498 21.968v6.027L24 17.616l-7.502 4.352z" fill="white" fill-opacity=".602"/>
        <path d="M16.498 27.995v-6.028L9 17.616l7.498 10.38z" fill="white"/>
        <path d="M16.498 20.573l7.497-4.353-7.497-3.348v7.701z" fill="white" fill-opacity=".2"/>
        <path d="M9 16.22l7.498 4.353v-7.701L9 16.22z" fill="white" fill-opacity=".602"/>
      </svg>
    `)}`,
    'BNB': `data:image/svg+xml,${encodeURIComponent(`
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#f3ba2f"/>
        <path d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.26L16 26l-6.144-6.144-2.26-2.26zm13.884-1.596L23.74 13.74 21.48 16l2.26 2.26L26 16zM16 13.741l-2.26 2.26L16 18.26l2.26-2.26L16 13.741z" fill="white"/>
      </svg>
    `)}`,
    'ADA': `data:image/svg+xml,${encodeURIComponent(`
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#0033ad"/>
        <path d="M16 24.5c4.69 0 8.5-3.81 8.5-8.5S20.69 7.5 16 7.5 7.5 11.31 7.5 16s3.81 8.5 8.5 8.5z" fill="white"/>
        <circle cx="16" cy="16" r="6" fill="#0033ad"/>
        <circle cx="16" cy="13" r="1.5" fill="white"/>
        <circle cx="13" cy="19" r="1" fill="white"/>
        <circle cx="19" cy="19" r="1" fill="white"/>
      </svg>
    `)}`,
    'SOL': `data:image/svg+xml,${encodeURIComponent(`
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#9945ff"/>
        <path d="M9.5 18.5h13l-2-2h-9l-2 2zm2-5h9l2 2h-13l2-2zm11 8h-13l2-2h9l2 2z" fill="white"/>
      </svg>
    `)}`,
    'XRP': `data:image/svg+xml,${encodeURIComponent(`
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#23292f"/>
        <path d="M25.5 6.5L20 12c-1.1 1.1-2.9 1.1-4 0s-1.1-2.9 0-4l5.5-5.5h4zm-19 0v4L12 16c1.1 1.1 1.1 2.9 0 4s-2.9 1.1-4 0l-5.5-5.5v-4h4zm4 19h-4v-4L12 16c1.1-1.1 2.9-1.1 4 0s1.1 2.9 0 4l-5.5 5.5zm15 0L20 20c-1.1-1.1-1.1-2.9 0-4s2.9-1.1 4 0l5.5 5.5v4h-4z" fill="white"/>
      </svg>
    `)}`,
    'DOT': `data:image/svg+xml,${encodeURIComponent(`
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#e6007a"/>
        <circle cx="16" cy="9" r="3" fill="white"/>
        <circle cx="10" cy="20" r="3" fill="white"/>
        <circle cx="22" cy="20" r="3" fill="white"/>
      </svg>
    `)}`,
    'DOGE': `data:image/svg+xml,${encodeURIComponent(`
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#c2a633"/>
        <path d="M11 11h6c2.21 0 4 1.79 4 4s-1.79 4-4 4h-3v3h-3V11zm3 3v5h3c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1h-3z" fill="white"/>
      </svg>
    `)}`,
    'AVAX': `data:image/svg+xml,${encodeURIComponent(`
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#e84142"/>
        <path d="M13 20l3-8 3 8h-6zm-4 2h14l-7-12-7 12z" fill="white"/>
      </svg>
    `)}`,
    'MATIC': `data:image/svg+xml,${encodeURIComponent(`
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#8247e5"/>
        <path d="M20 10v12l-4-2v-8l4-2zm-8 4v8l-4 2V12l4 2z" fill="white"/>
        <path d="M16 6l4 2-4 2-4-2 4-2zm0 20l-4-2 4-2 4 2-4 2z" fill="white"/>
      </svg>
    `)}`
  };
  return icons[symbol.toUpperCase()] || icons['BTC'];
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
                    src={getCoinFallbackIcon(crypto.symbol)}
                    alt={crypto.name}
                    className="w-full h-full object-cover"
                    style={{ imageRendering: 'crisp-edges' }}
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
