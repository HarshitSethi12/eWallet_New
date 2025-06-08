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
    'ADA': '#0033ad',
    'AVAX': '#e84142',
    'DOGE': '#c2a633',
    'LINK': '#2a5ada',
    'MATIC': '#8247e5',
    'LTC': '#bfbbbb',
    'UNI': '#ff007a',
    'NEAR': '#00c08b',
    'DOT': '#e6007a',
    'ICP': '#f15a24',
    'XLM': '#7d00ff',
    'ETC': '#328332',
    'VET': '#15bdff',
    'FIL': '#0090ff',
    'HBAR': '#000000',
    'ATOM': '#2e3148',
    'XMR': '#ff6600',
    'ALGO': '#000000'
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

  const { data: prices, isLoading, error } = useQuery<CryptoPriceData[]>({
    queryKey: ["crypto-prices"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/crypto-prices");
        if (!response.ok) throw new Error("Failed to fetch prices");
        return response.json();
      } catch (error) {
        console.error("Error fetching crypto prices:", error);
        throw error;
      }
    },
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 1000,
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
  }, [prices]);

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
        {prices?.map((crypto) => {
          const isPositive = crypto.price_change_percentage_24h > 0;
          const colors = cryptoColors[crypto.symbol.toLowerCase()] || { primary: "#6B7280", secondary: "#9CA3AF" };

          return (
            <div key={crypto.id} className="flex flex-col items-center min-w-[90px] max-w-[90px] sm:min-w-[110px] sm:max-w-[110px] lg:min-w-[120px] lg:max-w-[120px] p-2 sm:p-3 lg:p-3 hover:transform hover:scale-105 transition-transform cursor-pointer flex-shrink-0">
              {/* Coin Icon */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full shadow-md mb-1 sm:mb-2 relative overflow-hidden bg-white border-2 border-gray-100">
                <img 
                  src={`https://api.coingecko.com/api/v3/coins/${crypto.id}/image`}
                  alt={crypto.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getCoinFallbackIcon(crypto.symbol);
                  }}
                />
                <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full border-2 border-white"></div>
              </div>

              {/* Coin Symbol */}
              <p className="text-[0.6rem] font-medium text-gray-600 mb-0.5 sm:mb-1 uppercase tracking-wide text-center">
                {crypto.symbol}
              </p>

              {/* Price */}
              <p className="text-xs sm:text-sm lg:text-base font-bold text-gray-900 mb-0.5 sm:mb-1 text-center">
                ${crypto.current_price.toLocaleString('en-US', { 
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
                {isPositive ? '+' : ''}{crypto.price_change_percentage_24h.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom info bar */}
      <div className="bg-gray-50 px-4 sm:px-6 py-2 sm:py-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Live market data • Updates every 30 seconds
        </p>
      </div>
    </div>
  );
}