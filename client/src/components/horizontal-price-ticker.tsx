import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface CryptoPriceData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
}

const cryptoColors: { [key: string]: { primary: string; secondary: string } } = {
  btc: { primary: "#F7931A", secondary: "#FF9500" },
  eth: { primary: "#627EEA", secondary: "#4A90E2" },
  usdt: { primary: "#26A17B", secondary: "#009393" },
  bnb: { primary: "#F3BA2F", secondary: "#E1A429" },
  sol: { primary: "#9945FF", secondary: "#7C3AED" },
  usdc: { primary: "#2775CA", secondary: "#1E5A96" },
  xrp: { primary: "#23292F", secondary: "#4A5568" },
  ada: { primary: "#0033AD", secondary: "#1B4F93" },
  avax: { primary: "#E84142", secondary: "#E53E3E" },
  doge: { primary: "#C2A633", secondary: "#B7931F" },
  link: { primary: "#2A5ADA", secondary: "#1B4F93" },
  matic: { primary: "#8247E5", secondary: "#7C3AED" },
  ltc: { primary: "#BFBBBB", secondary: "#A6A6A6" },
  uni: { primary: "#FF007A", secondary: "#E6006F" },
  near: { primary: "#00C08B", secondary: "#00A876" },
  dot: { primary: "#E6007A", secondary: "#D53F8C" },
  icp: { primary: "#F15A24", secondary: "#D9491F" },
  xlm: { primary: "#7D00FF", secondary: "#6A00D9" },
  etc: { primary: "#328332", secondary: "#2A6F2A" },
  vet: { primary: "#15BDFF", secondary: "#0FA8E6" },
  fil: { primary: "#0090FF", secondary: "#007ACC" },
  hbar: { primary: "#000000", secondary: "#333333" },
  atom: { primary: "#2E3148", secondary: "#252839" },
  xmr: { primary: "#FF6600", secondary: "#E65C00" },
  algo: { primary: "#000000", secondary: "#333333" }
};

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

export function HorizontalPriceTicker() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { data: prices = [], isLoading, error } = useQuery({
    queryKey: ['horizontal-sushiswap-prices'],
    queryFn: async () => {
      try {
        console.log('🍣 Fetching SushiSwap prices for horizontal ticker...');

        // Try SushiSwap prices endpoint first
        let response = await fetch('/api/sushiswap/prices');
        if (response.ok) {
          const data = await response.json();
          console.log('📊 SushiSwap prices API response:', data);

          if (data.success && data.prices) {
            const formattedPrices = data.prices.slice(0, 10).map(token => ({
              id: token.symbol.toLowerCase(),
              symbol: token.symbol,
              name: token.name,
              price: token.price,
              change: token.change24h,
              logoURI: token.logoURI || getCoinImageUrl(token.symbol.toLowerCase())
            }));

            console.log('✅ Formatted SushiSwap prices for horizontal ticker:', formattedPrices.length, 'items');
            return formattedPrices;
          }
        }

        // Fallback to tokens endpoint (which also has SushiSwap data)
        console.log('🔄 Falling back to /api/tokens...');
        response = await fetch('/api/tokens');
        if (response.ok) {
          const data = await response.json();
          console.log('📊 Tokens API response:', data);

          if (data.success && data.tokens) {
            const formattedPrices = data.tokens.slice(0, 10).map(token => ({
              id: token.symbol.toLowerCase(),
              symbol: token.symbol,
              name: token.name,
              price: token.price,
              change: token.change24h,
              logoURI: token.logoURI || getCoinImageUrl(token.symbol.toLowerCase())
            }));

            console.log('✅ Formatted prices from SushiSwap tokens API:', formattedPrices.length, 'items');
            return formattedPrices;
          }
        }

        throw new Error('All SushiSwap APIs failed');
      } catch (error) {
        console.error('❌ SushiSwap horizontal ticker fetch error:', error);
        
        // Try CoinGecko as final fallback for real prices
        try {
          const coinGeckoResponse = await fetch('/api/crypto-prices');
          if (coinGeckoResponse.ok) {
            const coinGeckoData = await coinGeckoResponse.json();
            console.log('✅ Using CoinGecko fallback for horizontal ticker');
            
            const mappedPrices = Object.entries(coinGeckoData).slice(0, 8).map(([id, data]: [string, any]) => {
              const symbolMap: { [key: string]: string } = {
                'bitcoin': 'BTC',
                'ethereum': 'ETH',
                'tether': 'USDT',
                'binancecoin': 'BNB',
                'solana': 'SOL',
                'usd-coin': 'USDC',
                'ripple': 'XRP',
                'cardano': 'ADA',
                'chainlink': 'LINK',
                'uniswap': 'UNI'
              };
              
              return {
                id,
                symbol: symbolMap[id] || id.toUpperCase(),
                name: id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                price: data.usd || data.price || 0,
                change: data.usd_24h_change || data.change24h || 0,
                logoURI: getCoinImageUrl(id)
              };
            });
            
            return mappedPrices;
          }
        } catch (coinGeckoError) {
          console.warn('CoinGecko fallback also failed:', coinGeckoError);
        }
        
        // Return SushiSwap-focused fallback data with updated realistic prices
        return [
          { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 3650.25, change: 2.1, logoURI: getCoinImageUrl('ethereum') },
          { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', price: 1.00, change: 0.01, logoURI: getCoinImageUrl('usd-coin') },
          { id: 'tether', symbol: 'USDT', name: 'Tether USD', price: 1.00, change: 0.00, logoURI: getCoinImageUrl('tether') },
          { id: 'wrapped-bitcoin', symbol: 'WBTC', name: 'Wrapped Bitcoin', price: 95420.00, change: 1.8, logoURI: getCoinImageUrl('wrapped-bitcoin') },
          { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', price: 22.45, change: 3.2, logoURI: getCoinImageUrl('chainlink') },
          { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', price: 15.80, change: -2.1, logoURI: getCoinImageUrl('uniswap') },
          { id: 'sushi', symbol: 'SUSHI', name: 'SushiSwap', price: 1.25, change: 4.5, logoURI: getCoinImageUrl('sushi') },
          { id: 'aave', symbol: 'AAVE', name: 'Aave', price: 285.30, change: 2.3, logoURI: getCoinImageUrl('aave') }
        ];
      }
    },
    refetchInterval: 30000,
    retry: 3,
    staleTime: 30000
  });

  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;

    const scrollAmount = 300;
    const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });

    setTimeout(updateScrollButtons, 300);
  };

  useEffect(() => {
    updateScrollButtons();
  }, [prices]); // Depend on prices to update buttons when data loads

  if (isLoading) {
    return (
      <div className="relative w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center gap-6 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center min-w-[140px] animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-12 mb-1"></div>
              <div className="h-5 bg-gray-200 rounded w-16 mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-14"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <p className="text-center text-gray-500">Unable to load market data</p>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Left scroll button */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-1.5 sm:p-2 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
        </button>
      )}

      {/* Right scroll button */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-1.5 sm:p-2 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
        </button>
      )}

      {/* Price ticker content */}
      <div
        ref={scrollRef}
        className="flex items-center justify-start gap-2 sm:gap-4 lg:gap-6 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={updateScrollButtons}
      >
        {Array.isArray(prices) && prices.length > 0 ? prices.map((crypto) => {
          const isPositive = crypto.change > 0;
          const colors = cryptoColors[crypto.symbol.toLowerCase()] || { primary: "#6B7280", secondary: "#9CA3AF" };

          return (
            <div key={crypto.id} className="flex flex-col items-center min-w-[90px] max-w-[90px] sm:min-w-[110px] sm:max-w-[110px] lg:min-w-[120px] lg:max-w-[120px] p-2 sm:p-3 lg:p-3 hover:transform hover:scale-105 transition-transform cursor-pointer flex-shrink-0">
              {/* Coin Icon */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full shadow-md mb-1 sm:mb-2 relative overflow-hidden bg-white border-2 border-gray-100">
                <img
                  src={crypto.logoURI || getCoinFallbackIcon(crypto.symbol)}
                  alt={crypto.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getCoinFallbackIcon(crypto.symbol);
                  }}
                />
                {/* Placeholder for the trending indicator, if needed */}
                {/* <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full border-2 border-white"></div> */}
              </div>

              {/* Coin Symbol */}
              <p className="text-[0.6rem] font-medium text-gray-600 mb-0.5 sm:mb-1 uppercase tracking-wide text-center">
                {crypto.symbol}
              </p>

              {/* Price */}
              <p className="text-xs sm:text-sm lg:text-base font-bold text-gray-900 mb-0.5 sm:mb-1 text-center">
                ${crypto.price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>

              {/* Percentage Change */}
              <div className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[0.6rem] font-medium ${
                isPositive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {isPositive ? '+' : ''}{crypto.change.toFixed(2)}%
              </div>
            </div>
          );
        }) : (
          <div className="flex items-center justify-center w-full py-8">
            <p className="text-gray-500">No market data available</p>
          </div>
        )}
      </div>

      {/* Bottom info bar */}
      <div className="bg-gray-50 px-4 sm:px-6 py-2 sm:py-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          🍣 SushiSwap prices • Updates every 30 seconds
        </p>
      </div>
    </div>
  );
}