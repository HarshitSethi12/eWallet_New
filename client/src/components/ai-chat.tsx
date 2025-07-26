import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, TrendingUp, TrendingDown } from "lucide-react";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

export function AiChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your AI assistant. I can help you with crypto wallet questions and provide current cryptocurrency prices. Try asking "What\'s the price of Bitcoin?" or "Show me Ethereum price".',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchCryptoPrices = async (): Promise<CryptoPrice[]> => {
    try {
      const response = await fetch('/api/crypto-prices');
      if (!response.ok) {
        throw new Error('Failed to fetch crypto prices');
      }
      const data = await response.json();

      const cryptoList: CryptoPrice[] = [
        { symbol: 'BTC', name: 'Bitcoin', price: data.bitcoin?.usd || 0, change: data.bitcoin?.usd_24h_change || 0 },
        { symbol: 'ETH', name: 'Ethereum', price: data.ethereum?.usd || 0, change: data.ethereum?.usd_24h_change || 0 },
        { symbol: 'ADA', name: 'Cardano', price: data.cardano?.usd || 0, change: data.cardano?.usd_24h_change || 0 },
        { symbol: 'DOT', name: 'Polkadot', price: data.polkadot?.usd || 0, change: data.polkadot?.usd_24h_change || 0 },
        { symbol: 'LINK', name: 'Chainlink', price: data.chainlink?.usd || 0, change: data.chainlink?.usd_24h_change || 0 },
        { symbol: 'LTC', name: 'Litecoin', price: data.litecoin?.usd || 0, change: data.litecoin?.usd_24h_change || 0 },
        { symbol: 'XLM', name: 'Stellar', price: data.stellar?.usd || 0, change: data.stellar?.usd_24h_change || 0 },
        { symbol: 'TRX', name: 'Tron', price: data.tron?.usd || 0, change: data.tron?.usd_24h_change || 0 },
        { symbol: 'STETH', name: 'Staked Ether', price: data['staked-ether']?.usd || 0, change: data['staked-ether']?.usd_24h_change || 0 },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', price: data['wrapped-bitcoin']?.usd || 0, change: data['wrapped-bitcoin']?.usd_24h_change || 0 },
        { symbol: 'LEO', name: 'LEO Token', price: data['leo-token']?.usd || 0, change: data['leo-token']?.usd_24h_change || 0 },
        { symbol: 'USDC', name: 'USD Coin', price: data['usd-coin']?.usd || 0, change: data['usd-coin']?.usd_24h_change || 0 },
      ];

      return cryptoList;
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      return [];
    }
  };

  const findCryptoPriceByQuery = (query: string, cryptoList: CryptoPrice[]): CryptoPrice | null => {
    const lowerQuery = query.toLowerCase();

    // Direct symbol match
    for (const crypto of cryptoList) {
      if (lowerQuery.includes(crypto.symbol.toLowerCase()) || 
          lowerQuery.includes(crypto.name.toLowerCase())) {
        return crypto;
      }
    }

    // Special cases for common variations
    if (lowerQuery.includes('bitcoin') || lowerQuery.includes('btc')) {
      return cryptoList.find(c => c.symbol === 'BTC') || null;
    }
    if (lowerQuery.includes('ethereum') || lowerQuery.includes('eth')) {
      return cryptoList.find(c => c.symbol === 'ETH') || null;
    }
    if (lowerQuery.includes('cardano') || lowerQuery.includes('ada')) {
      return cryptoList.find(c => c.symbol === 'ADA') || null;
    }
    if (lowerQuery.includes('polkadot') || lowerQuery.includes('dot')) {
      return cryptoList.find(c => c.symbol === 'DOT') || null;
    }
    if (lowerQuery.includes('chainlink') || lowerQuery.includes('link')) {
      return cryptoList.find(c => c.symbol === 'LINK') || null;
    }
    if (lowerQuery.includes('litecoin') || lowerQuery.includes('ltc')) {
      return cryptoList.find(c => c.symbol === 'LTC') || null;
    }
    if (lowerQuery.includes('stellar') || lowerQuery.includes('xlm')) {
      return cryptoList.find(c => c.symbol === 'XLM') || null;
    }
    if (lowerQuery.includes('tron') || lowerQuery.includes('trx')) {
      return cryptoList.find(c => c.symbol === 'TRX') || null;
    }

    return null;
  };

  const formatPriceResponse = (crypto: CryptoPrice): string => {
    const isPositive = crypto.change > 0;
    const changeIcon = isPositive ? '📈' : '📉';
    const changeColor = isPositive ? '+' : '';

    return `${crypto.name} (${crypto.symbol})
💰 Current Price: $${crypto.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
${changeIcon} 24h Change: ${changeColor}${crypto.change.toFixed(2)}%

${isPositive ? 'Price is up!' : 'Price is down.'} Data updates every 30 seconds.`;
  };

  const generateResponse = async (userMessage: string): Promise<string> => {
    const lowerMessage = userMessage.toLowerCase();

    // Check if user is asking for crypto prices
    const priceKeywords = ['price', 'cost', 'value', 'worth', 'how much', 'current'];
    const isPriceQuery = priceKeywords.some(keyword => lowerMessage.includes(keyword)) &&
                        (lowerMessage.includes('bitcoin') || lowerMessage.includes('btc') ||
                         lowerMessage.includes('ethereum') || lowerMessage.includes('eth') ||
                         lowerMessage.includes('cardano') || lowerMessage.includes('ada') ||
                         lowerMessage.includes('polkadot') || lowerMessage.includes('dot') ||
                         lowerMessage.includes('chainlink') || lowerMessage.includes('link') ||
                         lowerMessage.includes('litecoin') || lowerMessage.includes('ltc') ||
                         lowerMessage.includes('stellar') || lowerMessage.includes('xlm') ||
                         lowerMessage.includes('tron') || lowerMessage.includes('trx') ||
                         lowerMessage.includes('crypto') || lowerMessage.includes('coin'));

    if (isPriceQuery) {
      try {
        const cryptoList = await fetchCryptoPrices();
        const matchedCrypto = findCryptoPriceByQuery(userMessage, cryptoList);

        if (matchedCrypto) {
          return formatPriceResponse(matchedCrypto);
        } else {
          return `I couldn't find price information for that cryptocurrency. I can provide prices for: Bitcoin (BTC), Ethereum (ETH), Cardano (ADA), Polkadot (DOT), Chainlink (LINK), Litecoin (LTC), Stellar (XLM), and Tron (TRX).

Try asking: "What's the price of Bitcoin?" or "Show me Ethereum price"`;
        }
      } catch (error) {
        return 'Sorry, I\'m having trouble fetching the latest crypto prices right now. Please try again in a moment.';
      }
    }

    // List prices query
    if (lowerMessage.includes('list') && (lowerMessage.includes('price') || lowerMessage.includes('crypto'))) {
      try {
        const cryptoList = await fetchCryptoPrices();
        const topCryptos = cryptoList.slice(0, 5);

        let response = '📊 Current Top Cryptocurrency Prices:\n\n';
        topCryptos.forEach(crypto => {
          const isPositive = crypto.change > 0;
          const changeIcon = isPositive ? '📈' : '📉';
          response += `${crypto.symbol}: $${crypto.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${changeIcon} ${crypto.change > 0 ? '+' : ''}${crypto.change.toFixed(2)}%\n`;
        });

        response += '\nAsk me about any specific cryptocurrency for more details!';
        return response;
      } catch (error) {
        return 'Sorry, I\'m having trouble fetching crypto prices right now.';
      }
    }

    // Regular responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'Hello! I\'m here to help you with your crypto wallet questions and provide current cryptocurrency prices. Try asking "What\'s the price of Bitcoin?"';
    }

    if (lowerMessage.includes('help')) {
      return `I can help you with:
• 💰 Current cryptocurrency prices (Bitcoin, Ethereum, Cardano, etc.)
• 📊 24-hour price changes
• 💼 Wallet functions and transactions
• ❓ General crypto questions

Try asking: "What's the price of Bitcoin?" or "List crypto prices"`;
    }

    if (lowerMessage.includes('balance')) {
      return 'To check your balance, you can view it on your dashboard. Your current balance is displayed prominently at the top of the page.';
    }

    if (lowerMessage.includes('send') || lowerMessage.includes('transfer')) {
      return 'To send cryptocurrency, click the "Send" button on your dashboard. You\'ll need the recipient\'s wallet address and the amount you want to send.';
    }

    if (lowerMessage.includes('receive')) {
      return 'To receive cryptocurrency, click the "Receive" button to see your wallet address and QR code. Share this with the sender.';
    }

    if (lowerMessage.includes('transaction')) {
      return 'You can view your transaction history on the dashboard. Each transaction shows the amount, date, and status.';
    }

    return `I'm here to help with your crypto wallet needs and provide current cryptocurrency prices! 

You can ask me:
• "What's the price of Bitcoin?"
• "Show me Ethereum price"
• "List crypto prices"
• Questions about sending, receiving, balances, or transactions`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      content: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await generateResponse(currentInput);

      const aiResponse: Message = {
        id: Date.now().toString() + '-ai',
        content: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const errorResponse: Message = {
        id: Date.now().toString() + '-ai',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Assistant
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Live Prices</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 p-0 min-h-0">
        <ScrollArea className="flex-1 p-4 min-h-0" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.isUser ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.isUser 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {message.isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-gray-600" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex-shrink-0 p-3 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about crypto prices or wallet functions..."
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}