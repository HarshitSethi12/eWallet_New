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
  bnb: { primary: "#F3BA2F", secondary: "#E1A429" },
  ada: { primary: "#0033AD", secondary: "#1B4F93" },
  sol: { primary: "#9945FF", secondary: "#7C3AED" },
  xrp: { primary: "#23292F", secondary: "#4A5568" },
  dot: { primary: "#E6007A", secondary: "#D53F8C" },
  doge: { primary: "#C2A633", secondary: "#B7931F" },
  avax: { primary: "#E84142", secondary: "#E53E3E" },
  matic: { primary: "#8247E5", secondary: "#7C3AED" }
};

// Helper function to get CoinGecko image ID for each cryptocurrency
const getCoinImageId = (coinId: string): string => {
  const imageMap: { [key: string]: string } = {
    'bitcoin': '1',
    'ethereum': '279',
    'binancecoin': '825',
    'cardano': '975',
    'solana': '4128',
    'ripple': '44',
    'polkadot': '12171',
    'dogecoin': '5',
    'avalanche-2': '12559',
    'polygon': '4713'
  };
  return imageMap[coinId] || '1'; // Default to Bitcoin if not found
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
                  src={`https://assets.coingecko.com/coins/images/${getCoinImageId(crypto.id)}/large/${crypto.symbol}.png`}
                  alt={crypto.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    // Fallback to gradient design if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.style.background = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`;
                      parent.innerHTML = `<span class="text-white font-bold text-[0.6rem] sm:text-xs">${crypto.symbol.toUpperCase().slice(0, 3)}</span>`;
                    }
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