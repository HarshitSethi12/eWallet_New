import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CryptoPriceData {
  id: string;
  symbol: string;
  name: string;
  image?: string; // Added for CoinGecko image URL
  current_price: number;
  price_change_percentage_24h: number;
  market_cap?: number; // Added for market cap
  total_volume: number;
  market_cap_rank?: number; // Added for market cap rank
}

// Get coin image URL from CoinGecko with proper fallback
const getCoinImageUrl = (coinId: string): string => {
  // Use CoinGecko's direct image URLs for better reliability
  return `https://coin-images.coingecko.com/coins/images/${getCoinImageId(coinId)}/large/${coinId}.png`;
};

// Map CoinGecko coin IDs to their image IDs for better reliability
const getCoinImageId = (coinId: string): string => {
  const imageMap: { [key: string]: string } = {
    'bitcoin': '1',
    'ethereum': '279',
    'tether': '325',
    'binancecoin': '825',
    'solana': '4128',
    'usd-coin': '6319',
    'ripple': '44',
    'dogecoin': '5',
    'cardano': '975',
    'avalanche-2': '12559',
    'shiba-inu': '11939',
    'chainlink': '877',
    'polkadot': '12171',
    'bitcoin-cash': '780',
    'polygon': '4713',
    'litecoin': '2',
    'near': '10365',
    'uniswap': '12504',
    'internet-computer': '14495',
    'ethereum-classic': '453',
    'stellar': '4',
    'filecoin': '12817',
    'cosmos': '5055',
    'monero': '69',
    'hedera-hashgraph': '4642',
    'tron': '1094',
    'lido-staked-ether': '13442',
    'wrapped-bitcoin': '7598',
    'sui': '26375',
    'wrapped-steth': '18834',
    'leo-token': '11091',
    'the-open-network': '11419',
    'usds': '28001'
  };

  return imageMap[coinId] || '1'; // Default to Bitcoin image ID if not found
};

// Enhanced fallback for when image fails to load
const getCoinFallbackIcon = (symbol: string): string => {
  const colors: { [key: string]: string } = {
    'BTC': '#f7931a',
    'ETH': '#627eea',
    'USDT': '#26a17b',
    'BNB': '#f3ba2f',
    'SOL': '#9945ff',
    'USDC': '#2775ca',
    'XRP': '#23292f',
    'DOGE': '#c2a633',
    'ADA': '#0033ad',
    'AVAX': '#e84142',
    'SHIB': '#ffa409',
    'LINK': '#2a5ada',
    'DOT': '#e6007a',
    'BCH': '#8dc351',
    'MATIC': '#8247e5',
    'LTC': '#bfbbbb',
    'NEAR': '#00c08b',
    'UNI': '#ff007a',
    'ICP': '#f15a24',
    'ETC': '#328332',
    'XLM': '#7d00ff',
    'FIL': '#0090ff',
    'ATOM': '#2e3148',
    'XMR': '#ff6600',
    'HBAR': '#000000',
    'TRX': '#ff060a',
    'STETH': '#00d4aa',
    'WBTC': '#f09242',
    'SUI': '#4da2ff',
    'WSTETH': '#00d4aa',
    'LEO': '#ffa500',
    'TON': '#0088cc',
    'USDS': '#1652f0'
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
    queryKey: ["crypto-prices-top25"],
    queryFn: async () => {
      try {
        console.log('🔄 Fetching top 25 crypto prices for Live Market Prices...');
        
        // Fetch top 25 coins from the dedicated endpoint
        const response = await fetch('/api/crypto-prices-top25');
        if (!response.ok) {
          console.error('❌ API response not ok:', response.status, response.statusText);
          throw new Error(`Failed to fetch crypto prices: ${response.status}`);
        }
        const data = await response.json();

        console.log('✅ Top 25 crypto prices fetched successfully:', data.length, 'tokens');
        console.log('📊 First few tokens:', data.slice(0, 3).map(coin => coin.symbol));
        console.log('📊 All token symbols:', data.map(coin => coin.symbol).join(', '));

        // Ensure we have exactly 25 tokens
        if (data.length !== 25) {
          console.warn('⚠️ Expected 25 tokens but got:', data.length);
          console.warn('⚠️ Missing tokens:', 25 - data.length);
        } else {
          console.log('✅ Perfect! Got exactly 25 tokens as expected');
        }

        // Data is already in the correct format from the backend
        const cryptoList: CryptoPriceData[] = data.map((coin: any) => ({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          image: coin.image,
          current_price: coin.current_price,
          price_change_percentage_24h: coin.price_change_percentage_24h,
          market_cap: coin.market_cap,
          total_volume: coin.total_volume,
          market_cap_rank: coin.market_cap_rank,
        }));

        console.log('📊 Live Market Prices processed:', cryptoList.length, 'tokens');
        console.log('🎯 Sample tokens:', cryptoList.slice(0, 5).map(c => `${c.symbol}: $${c.current_price}`));
        
        return cryptoList;
      } catch (error) {
        console.error('❌ Error fetching top 25 crypto prices:', error);
        throw error; // Re-throw to let React Query handle retries
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3, // Retry 3 times on failure
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
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
      <CardContent className="space-y-2 max-h-96 overflow-y-auto">
        {prices && prices.length > 0 ? (
          <>
            {prices.map((crypto, index) => {
              const isPositive = crypto.price_change_percentage_24h > 0;
              const isNeutral = Math.abs(crypto.price_change_percentage_24h) < 0.01;

              return (
                <div key={`${crypto.id}-${index}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white border-2 border-gray-100 shadow-sm">
                      <img
                        src={crypto.image || getCoinImageUrl(crypto.id)}
                        alt={crypto.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getCoinFallbackIcon(crypto.symbol);
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-heading)' }}>
                        {crypto.symbol}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-24">{crypto.name}</p>
                      {crypto.market_cap_rank && (
                        <p className="text-xs text-blue-600">#{crypto.market_cap_rank}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-sm" style={{ color: 'var(--color-heading)' }}>
                      ${crypto.current_price >= 1 
                        ? crypto.current_price.toLocaleString(undefined, {maximumFractionDigits: 2})
                        : crypto.current_price.toFixed(6)
                      }
                    </p>
                    <div className={`flex items-center gap-1 text-xs ${
                      isNeutral ? 'text-gray-500' : isPositive ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {isNeutral ? (
                        <Minus className="h-2 w-2" />
                      ) : isPositive ? (
                        <TrendingUp className="h-2 w-2" />
                      ) : (
                        <TrendingDown className="h-2 w-2" />
                      )}
                      <span>
                        {isPositive ? '+' : ''}{crypto.price_change_percentage_24h.toFixed(2)}%
                      </span>
                    </div>
                    {crypto.market_cap && (
                      <p className="text-xs text-gray-400">
                        ${crypto.market_cap >= 1e9 
                          ? `${(crypto.market_cap / 1e9).toFixed(1)}B`
                          : `${(crypto.market_cap / 1e6).toFixed(0)}M`
                        }
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="pt-2 mt-2 border-t">
              <p className="text-xs text-gray-400 text-center">
                Showing {prices.length} of top 25 cryptocurrencies • Updates every 30s • CoinGecko
              </p>
              {prices.length < 25 && (
                <p className="text-xs text-orange-500 text-center mt-1">
                  ⚠️ Only {prices.length} tokens loaded (expected 25)
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No price data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}