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
  const { data: prices, isLoading, error } = useQuery<any[]>({
    queryKey: ["crypto-prices"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/crypto-prices');
        if (!response.ok) {
          throw new Error('Failed to fetch crypto prices');
        }
        const data = await response.json();

        // Transform the data to match your expected format
        const cryptoList = [
          { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', current_price: data.bitcoin?.usd || 0, price_change_percentage_24h: data.bitcoin?.usd_24h_change || 0 },
          { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', current_price: data.ethereum?.usd || 0, price_change_percentage_24h: data.ethereum?.usd_24h_change || 0 },
          { id: 'cardano', symbol: 'ADA', name: 'Cardano', current_price: data.cardano?.usd || 0, price_change_percentage_24h: data.cardano?.usd_24h_change || 0 },
          { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', current_price: data.polkadot?.usd || 0, price_change_percentage_24h: data.polkadot?.usd_24h_change || 0 },
          { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', current_price: data.chainlink?.usd || 0, price_change_percentage_24h: data.chainlink?.usd_24h_change || 0 },
          { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', current_price: data.litecoin?.usd || 0, price_change_percentage_24h: data.litecoin?.usd_24h_change || 0 },
          { id: 'stellar', symbol: 'XLM', name: 'Stellar', current_price: data.stellar?.usd || 0, price_change_percentage_24h: data.stellar?.usd_24h_change || 0 },
          { id: 'tron', symbol: 'TRX', name: 'Tron', current_price: data.tron?.usd || 0, price_change_percentage_24h: data.tron?.usd_24h_change || 0 },
          { id: 'staked-ether', symbol: 'STETH', name: 'Staked Ether', current_price: data['staked-ether']?.usd || 0, price_change_percentage_24h: data['staked-ether']?.usd_24h_change || 0 },
          { id: 'wrapped-bitcoin', symbol: 'WBTC', name: 'Wrapped Bitcoin', current_price: data['wrapped-bitcoin']?.usd || 0, price_change_percentage_24h: data['wrapped-bitcoin']?.usd_24h_change || 0 },
          { id: 'leo-token', symbol: 'LEO', name: 'LEO Token', current_price: data['leo-token']?.usd || 0, price_change_percentage_24h: data['leo-token']?.usd_24h_change || 0 },
          { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', current_price: data['usd-coin']?.usd || 0, price_change_percentage_24h: data['usd-coin']?.usd_24h_change || 0 },
        ];

        return cryptoList;
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
        return [];
      }
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
    <Card className="border-none shadow-lg h-[500px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-heading)' }}>
          <span>Market Prices</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {prices?.map((crypto) => {
          const isPositive = crypto.price_change_percentage_24h > 0;
          const isNeutral = Math.abs(crypto.price_change_percentage_24h) < 0.01;

          return (
            <div key={crypto.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white border-2 border-gray-100 shadow-sm">
                  <img 
                    src={getCoinImageUrl(crypto.id)}
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
                  ${crypto.current_price?.toLocaleString() || '0'}
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
                    {isPositive ? '+' : ''}{(crypto.price_change_percentage_24h || 0).toFixed(2)}%
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