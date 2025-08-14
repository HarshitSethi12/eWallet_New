import { Router } from "express";
import type { Application } from "express";
import { createServer } from "http";

export function registerRoutes(app: Application) {
  const router = Router();

  // Token list endpoint for 1inch integration
  router.get("/api/tokens", async (req, res) => {
    try {
      console.log('🔍 Fetching token data...');
      console.log('🔍 Environment check - All env vars:', Object.keys(process.env).filter(key => key.includes('INCH') || key.includes('API')));

      // Define tokens we want to fetch prices for with correct mainnet addresses
      const tokens = [
        { symbol: 'ETH', name: 'Ethereum', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', balance: '2.5', logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
        { symbol: 'USDC', name: 'USD Coin', address: '0xa0b86a33e6441b8c18d94ec8e42a99f0ba44683a', balance: '1000', logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png' },
        { symbol: 'USDT', name: 'Tether USD', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', balance: '500', logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', balance: '0.1', logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png' },
        { symbol: 'LINK', name: 'Chainlink', address: '0x514910771af9ca656af840dff83e8264ecf986ca', balance: '150', logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' }
      ];

      let priceData = {};
      let dataSource = 'fallback';

      // Try 1inch API first as priority
      try {
        console.log('🔄 Trying 1inch API as primary source...');
        const apiKey = process.env.ONEINCH_API_KEY;
        console.log('🔑 API Key exists:', apiKey ? 'YES' : 'NO');
        console.log('🔑 API Key length:', apiKey ? apiKey.length : 0);
        console.log('🔑 API Key preview:', apiKey ? `${apiKey.substring(0, 12)}...${apiKey.substring(apiKey.length - 4)}` : 'N/A');
        console.log('🔑 API Key type:', typeof apiKey);
        
        // Check for common API key issues
        if (apiKey) {
          console.log('🔑 API Key validation:');
          console.log('  - Has spaces:', apiKey.includes(' '));
          console.log('  - Has newlines:', apiKey.includes('\n') || apiKey.includes('\r'));
          console.log('  - Trimmed length:', apiKey.trim().length);
        }

        if (apiKey && apiKey.trim().length > 0) {
          const cleanApiKey = apiKey.trim();
          const oneInchUrl = `https://api.1inch.dev/price/v1.1/1`;
          console.log('📡 1inch API base URL:', oneInchUrl);
          
          // Test API key first with a simple request
          console.log('🧪 Testing API key with a simple ETH price request...');
          try {
            const testResponse = await fetch(`${oneInchUrl}/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${cleanApiKey}`,
                'Accept': 'application/json'
              }
            });
            
            console.log('🧪 API key test response status:', testResponse.status);
            console.log('🧪 API key test response headers:', Object.fromEntries(testResponse.headers.entries()));
            
            if (!testResponse.ok) {
              const errorText = await testResponse.text();
              console.log('🧪 API key test failed. Error response:', errorText);
              throw new Error(`API key test failed: ${testResponse.status} - ${errorText}`);
            } else {
              const testData = await testResponse.json();
              console.log('🧪 API key test successful! ETH price response:', testData);
            }
          } catch (testError) {
            console.error('🧪 API key test error:', testError.message);
            throw testError;
          }

          // Try bulk price fetch first
          const tokenAddresses = tokens.map(t => t.address).join(',');
          console.log('📡 Fetching bulk prices for addresses:', tokenAddresses);

          try {
            const bulkResponse = await fetch(`${oneInchUrl}/${tokenAddresses}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${cleanApiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });

            console.log('📡 Bulk response status:', bulkResponse.status);
            console.log('📡 Bulk response headers:', Object.fromEntries(bulkResponse.headers.entries()));

            if (bulkResponse.ok) {
              const bulkData = await bulkResponse.json();
              console.log('✅ Bulk 1inch API response (raw wei values):', bulkData);

              // Get current ETH price for conversion reference
              let ethPriceUSD = 3420.50; // fallback ETH price
              
              try {
                // Try to get current ETH price from CoinGecko for conversion
                const ethResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
                  headers: { 'Accept': 'application/json', 'User-Agent': 'BitWallet/1.0' }
                });
                
                if (ethResponse.ok) {
                  const ethData = await ethResponse.json();
                  if (ethData?.ethereum?.usd) {
                    ethPriceUSD = ethData.ethereum.usd;
                    console.log('✅ Got current ETH price for conversion:', ethPriceUSD);
                  }
                }
              } catch (ethError) {
                console.log('⚠️ Using fallback ETH price for conversion');
              }

              priceData = {};
              for (const token of tokens) {
                const addressKey = token.address.toLowerCase();
                const rawValue = bulkData[addressKey];
                
                if (rawValue) {
                  let priceInUSD = 0;
                  const weiValue = typeof rawValue === 'string' ? parseFloat(rawValue) : rawValue;
                  
                  if (token.symbol === 'ETH') {
                    // For ETH, use the direct USD price we fetched
                    priceInUSD = ethPriceUSD;
                  } else if (weiValue > 0) {
                    // 1inch API returns wei amount of token that equals 1 ETH
                    // For most ERC-20 tokens with 18 decimals:
                    // Price in USD = ETH_price_USD / (wei_value / 10^18)
                    
                    // Special handling for stablecoins and tokens with different decimals
                    if (token.symbol === 'USDC' || token.symbol === 'USDT') {
                      // USDC and USDT have 6 decimals, not 18
                      const tokenAmount = weiValue / 1e6;
                      priceInUSD = ethPriceUSD / tokenAmount;
                    } else if (token.symbol === 'WBTC') {
                      // WBTC has 8 decimals
                      const tokenAmount = weiValue / 1e8;
                      priceInUSD = ethPriceUSD / tokenAmount;
                    } else {
                      // Standard ERC-20 tokens with 18 decimals
                      const tokenAmount = weiValue / 1e18;
                      priceInUSD = ethPriceUSD / tokenAmount;
                    }
                  }
                  
                  // Additional sanity checks for reasonable price ranges
                  let isReasonablePrice = false;
                  if (token.symbol === 'ETH' && priceInUSD > 1000 && priceInUSD < 10000) {
                    isReasonablePrice = true;
                  } else if ((token.symbol === 'USDC' || token.symbol === 'USDT') && priceInUSD > 0.90 && priceInUSD < 1.10) {
                    isReasonablePrice = true;
                  } else if (token.symbol === 'WBTC' && priceInUSD > 30000 && priceInUSD < 100000) {
                    isReasonablePrice = true;
                  } else if (token.symbol === 'LINK' && priceInUSD > 1 && priceInUSD < 100) {
                    isReasonablePrice = true;
                  }
                  
                  if (isReasonablePrice) {
                    priceData[token.symbol.toLowerCase()] = {
                      usd: priceInUSD,
                      usd_24h_change: 0
                    };
                    console.log(`✅ Added ${token.symbol} price from bulk (converted): $${priceInUSD.toFixed(4)} (raw wei: ${rawValue})`);
                  } else {
                    console.log(`⚠️ Rejected unreasonable price for ${token.symbol}: $${priceInUSD} (raw wei: ${rawValue})`);
                  }
                }
              }

              if (Object.keys(priceData).length > 0) {
                dataSource = '1inch';
                console.log('✅ Successfully using 1inch API bulk fetch with USD conversion');
              }
            } else {
              const errorText = await bulkResponse.text();
              console.log(`❌ Bulk fetch failed. Status: ${bulkResponse.status}, Error: ${errorText}`);
              
              // Try individual fetches as fallback
              console.log('🔄 Trying individual token fetches...');
              priceData = {};
              
              for (const token of tokens) {
                try {
                  console.log(`📡 Fetching individual price for ${token.symbol} at ${token.address}`);
                  const response = await fetch(`${oneInchUrl}/${token.address}`, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${cleanApiKey}`,
                      'Accept': 'application/json'
                    }
                  });

                  console.log(`📡 ${token.symbol} response status:`, response.status);

                  if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Got ${token.symbol} individual response (raw wei):`, data);
                    
                    let rawPrice = null;
                    
                    if (typeof data === 'number') {
                      rawPrice = data;
                    } else if (data[token.address.toLowerCase()]) {
                      rawPrice = data[token.address.toLowerCase()];
                    } else if (data.price) {
                      rawPrice = data.price;
                    } else if (Object.keys(data).length === 1) {
                      rawPrice = Object.values(data)[0];
                    }

                    if (rawPrice && typeof rawPrice === 'number') {
                      let priceInUSD = 0;
                      
                      // Get current ETH price for conversion
                      let ethPriceUSD = 3420.50;
                      try {
                        const ethResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
                          headers: { 'Accept': 'application/json', 'User-Agent': 'BitWallet/1.0' }
                        });
                        if (ethResponse.ok) {
                          const ethData = await ethResponse.json();
                          if (ethData?.ethereum?.usd) {
                            ethPriceUSD = ethData.ethereum.usd;
                          }
                        }
                      } catch (e) {
                        console.log('Using fallback ETH price for individual conversion');
                      }
                      
                      if (token.symbol === 'ETH') {
                        priceInUSD = ethPriceUSD;
                      } else {
                        // Convert wei value to USD with proper decimal handling
                        const weiValue = typeof rawPrice === 'string' ? parseFloat(rawPrice) : rawPrice;
                        
                        if (weiValue > 0) {
                          if (token.symbol === 'USDC' || token.symbol === 'USDT') {
                            // USDC and USDT have 6 decimals
                            const tokenAmount = weiValue / 1e6;
                            priceInUSD = ethPriceUSD / tokenAmount;
                          } else if (token.symbol === 'WBTC') {
                            // WBTC has 8 decimals
                            const tokenAmount = weiValue / 1e8;
                            priceInUSD = ethPriceUSD / tokenAmount;
                          } else {
                            // Standard ERC-20 tokens with 18 decimals
                            const tokenAmount = weiValue / 1e18;
                            priceInUSD = ethPriceUSD / tokenAmount;
                          }
                        }
                      }
                      
                      // Sanity checks for reasonable price ranges
                      let isReasonablePrice = false;
                      if (token.symbol === 'ETH' && priceInUSD > 1000 && priceInUSD < 10000) {
                        isReasonablePrice = true;
                      } else if ((token.symbol === 'USDC' || token.symbol === 'USDT') && priceInUSD > 0.90 && priceInUSD < 1.10) {
                        isReasonablePrice = true;
                      } else if (token.symbol === 'WBTC' && priceInUSD > 30000 && priceInUSD < 100000) {
                        isReasonablePrice = true;
                      } else if (token.symbol === 'LINK' && priceInUSD > 1 && priceInUSD < 100) {
                        isReasonablePrice = true;
                      }
                      
                      if (isReasonablePrice) {
                        priceData[token.symbol.toLowerCase()] = {
                          usd: priceInUSD,
                          usd_24h_change: 0
                        };
                        console.log(`✅ Added ${token.symbol} price (converted): $${priceInUSD.toFixed(4)} (raw wei: ${rawPrice})`);
                      } else {
                        console.log(`⚠️ Rejected unreasonable ${token.symbol} price: $${priceInUSD} (raw wei: ${rawPrice})`);
                      }
                    }
                  } else {
                    const errorText = await response.text();
                    console.log(`❌ Failed to get ${token.symbol} price. Status: ${response.status}, Error: ${errorText}`);
                  }
                } catch (err) {
                  console.log(`❌ Error fetching ${token.symbol}:`, err.message);
                }
              }

              if (Object.keys(priceData).length > 0) {
                dataSource = '1inch';
                console.log('✅ Successfully using 1inch API individual fetches');
              }
            }
          } catch (bulkError) {
            console.error('❌ 1inch bulk fetch error:', bulkError.message);
          }

          if (Object.keys(priceData).length > 0) {
            console.log('✅ Final 1inch success with', Object.keys(priceData).length, 'tokens');
            console.log('✅ Token prices obtained:', Object.keys(priceData).map(symbol => 
              `${symbol.toUpperCase()}: $${priceData[symbol].usd}`
            ).join(', '));
          } else {
            console.log('⚠️ 1inch API returned no valid prices after all attempts');
          }
        } else {
          console.log('⚠️ No valid 1inch API key found - check ONEINCH_API_KEY environment variable');
        }
      } catch (error) {
        console.error('❌ 1inch API error:', error.message);
        console.error('❌ 1inch API full error:', error);
      }

      // Use CoinGecko as fallback only if 1inch failed
      if (Object.keys(priceData).length === 0) {
        try {
          console.log('🔄 Falling back to CoinGecko...');
          const coinIds = 'ethereum,usd-coin,tether,wrapped-bitcoin,chainlink';
          const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`;

          const response = await fetch(cgUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'BitWallet/1.0'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ CoinGecko API data received (fallback)');

            // Map CoinGecko IDs to our token symbols
            const coinGeckoMap = {
              'ethereum': 'eth',
              'usd-coin': 'usdc',
              'tether': 'usdt',
              'wrapped-bitcoin': 'wbtc',
              'chainlink': 'link'
            };

            priceData = {};
            for (const [coinId, tokenData] of Object.entries(data)) {
              const symbol = coinGeckoMap[coinId];
              if (symbol && tokenData && typeof tokenData.usd === 'number') {
                priceData[symbol] = {
                  usd: tokenData.usd,
                  usd_24h_change: tokenData.usd_24h_change || 0
                };
              }
            }
            dataSource = 'coingecko';
            console.log('✅ Using CoinGecko as fallback');
          } else {
            console.log('❌ CoinGecko fallback failed with status:', response.status);
          }
        } catch (error) {
          console.error('❌ CoinGecko fallback error:', error.message);
        }
      }

      // Fallback with current realistic prices if all APIs failed
      if (Object.keys(priceData).length === 0) {
        console.log('⚠️ Using fallback mock data with current market prices');
        priceData = {
          'eth': { usd: 3420.50, usd_24h_change: 2.3 },
          'usdc': { usd: 1.00, usd_24h_change: -0.05 },
          'usdt': { usd: 1.00, usd_24h_change: 0.02 },
          'wbtc': { usd: 67800.00, usd_24h_change: 1.8 },
          'link': { usd: 14.85, usd_24h_change: 5.7 }
        };
        dataSource = 'mock';
      }

      // Calculate balances and format response
      const enrichedTokens = tokens.map(token => {
        const priceInfo = priceData[token.symbol.toLowerCase()];
        const balance = parseFloat(token.balance) || 0;
        const price = priceInfo?.usd || 0;

        if (!priceInfo) {
          console.warn(`⚠️ No price data for ${token.symbol}`);
        }

        return {
          ...token,
          price: price,
          change24h: priceInfo?.usd_24h_change || 0,
          balanceUSD: balance * price
        };
      });

      console.log('📋 Final token data source:', dataSource);
      console.log('📋 Final token count:', enrichedTokens.length);
      console.log('📋 Price data keys:', Object.keys(priceData));
      console.log('💰 Final enriched tokens:', enrichedTokens.map(t => `${t.symbol}: $${t.price.toFixed(2)} (change: ${t.change24h.toFixed(2)}%)`));

      res.json({
        tokens: enrichedTokens,
        source: dataSource,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Token API error:', error);
      res.status(500).json({
        error: 'Failed to fetch token data',
        details: error.message,
        tokens: [] // Return empty array instead of crashing
      });
    }
  });

  // Get swap quote endpoint
  router.get('/api/swap-quote', async (req, res) => {
    try {
      const { fromToken, toToken, amount } = req.query;

      // Mock quote data - in production, this would call 1inch API
      const mockQuote = {
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: (parseFloat(amount as string) * 0.998).toString(), // Mock 0.2% slippage
        estimatedGas: '150000',
        protocols: ['Uniswap_V3', 'SushiSwap'],
        route: [
          { name: 'Uniswap V3', percentage: 60 },
          { name: 'SushiSwap', percentage: 40 }
        ]
      };

      res.json(mockQuote);
    } catch (error) {
      console.error('Error getting swap quote:', error);
      res.status(500).json({ error: 'Failed to get swap quote' });
    }
  });

  // Execute swap endpoint
  router.post('/api/execute-swap', async (req, res) => {
    try {
      const { fromToken, toToken, amount, userAddress } = req.body;

      // Mock transaction data - in production, this would execute the swap
      const mockTransaction = {
        hash: '0x' + Math.random().toString(16).substring(2, 66),
        status: 'pending',
        fromToken,
        toToken,
        amount,
        userAddress,
        timestamp: new Date().toISOString()
      };

      res.json(mockTransaction);
    } catch (error) {
      console.error('Error executing swap:', error);
      res.status(500).json({ error: 'Failed to execute swap' });
    }
  });

  // Crypto prices endpoint for price tickers (uses same logic as /api/tokens)
  router.get('/api/crypto-prices', async (req, res) => {
    try {
      console.log('🔍 Fetching crypto prices for tickers...');

      // Define crypto tokens for price tickers with correct mainnet addresses
      const cryptoTokens = [
        { id: 'bitcoin', symbol: 'BTC', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599' }, // WBTC address for 1inch
        { id: 'ethereum', symbol: 'ETH', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' },
        { id: 'cardano', symbol: 'ADA', address: '0x3ee2200efb3400fabb9aacf31297cbdd1d435d47' }, // ADA BSC address (1inch supports multiple chains)
        { id: 'polkadot', symbol: 'DOT', address: '0x7083609fce4d1d8dc0c979aab8c869ea2c873402' }, // DOT BSC address
        { id: 'chainlink', symbol: 'LINK', address: '0x514910771af9ca656af840dff83e8264ecf986ca' },
        { id: 'litecoin', symbol: 'LTC', address: '0x4338665cbb7b2485a8855a139b75d5e34ab0db94' }, // LTC token address
        { id: 'stellar', symbol: 'XLM', address: '0xa0b86a33e6441b8c18d94ec8e42a99f0ba44683a' }, // Using USDC address as placeholder
        { id: 'tron', symbol: 'TRX', address: '0x85eac5ac2f758618dfa09bdbe0cf174e7d574d5b' }, // TRX token address
        { id: 'staked-ether', symbol: 'STETH', address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84' },
        { id: 'wrapped-bitcoin', symbol: 'WBTC', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599' },
        { id: 'leo-token', symbol: 'LEO', address: '0x2af5d2ad76741191d15dfe7bf6ac92d4bd912ca3' },
        { id: 'usd-coin', symbol: 'USDC', address: '0xa0b86a33e6441b8c18d94ec8e42a99f0ba44683a' }
      ];

      let priceData = {};
      let dataSource = 'fallback';

      // Try 1inch API first as priority
      try {
        console.log('🔄 Trying 1inch API for crypto prices...');
        const apiKey = process.env.ONEINCH_API_KEY;
        
        if (apiKey) {
          const oneInchUrl = `https://api.1inch.dev/price/v1.1/1`;

          for (const crypto of cryptoTokens) {
            try {
              const response = await fetch(`${oneInchUrl}/${crypto.address}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Accept': 'application/json'
                }
              });

              if (response.ok) {
                const data = await response.json();
                let price = null;
                
                if (typeof data === 'number') {
                  price = data;
                } else if (data[crypto.address.toLowerCase()]) {
                  price = data[crypto.address.toLowerCase()];
                } else if (data.price) {
                  price = data.price;
                } else if (Object.keys(data).length === 1) {
                  price = Object.values(data)[0];
                }

                if (price && typeof price === 'number') {
                  priceData[crypto.id] = {
                    usd: price,
                    usd_24h_change: 0
                  };
                }
              }
            } catch (err) {
              console.log(`❌ Error fetching ${crypto.symbol}:`, err.message);
            }
          }

          if (Object.keys(priceData).length > 0) {
            dataSource = '1inch';
            console.log('✅ Successfully using 1inch API for crypto prices');
          }
        }
      } catch (error) {
        console.error('❌ 1inch API error for crypto prices:', error.message);
      }

      // Use CoinGecko as fallback only if 1inch failed
      if (Object.keys(priceData).length === 0) {
        try {
          console.log('🔄 Falling back to CoinGecko for crypto prices...');
          const coinIds = 'bitcoin,ethereum,cardano,polkadot,chainlink,litecoin,stellar,tron,staked-ether,wrapped-bitcoin,leo-token,usd-coin';
          const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`;

          const response = await fetch(cgUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'BitWallet/1.0'
            }
          });

          if (response.ok) {
            const data = await response.json();
            priceData = {};
            
            for (const [coinId, tokenData] of Object.entries(data)) {
              if (tokenData && typeof tokenData.usd === 'number') {
                priceData[coinId] = {
                  usd: tokenData.usd,
                  usd_24h_change: tokenData.usd_24h_change || 0
                };
              }
            }
            dataSource = 'coingecko';
          }
        } catch (error) {
          console.error('❌ CoinGecko fallback error for crypto prices:', error.message);
        }
      }

      // Fallback with mock data if all APIs failed
      if (Object.keys(priceData).length === 0) {
        priceData = {
          'bitcoin': { usd: 67800.00, usd_24h_change: 1.8 },
          'ethereum': { usd: 3420.50, usd_24h_change: 2.3 },
          'cardano': { usd: 0.45, usd_24h_change: 3.1 },
          'polkadot': { usd: 6.80, usd_24h_change: 4.2 },
          'chainlink': { usd: 14.85, usd_24h_change: 5.7 },
          'litecoin': { usd: 85.50, usd_24h_change: -1.2 },
          'stellar': { usd: 0.12, usd_24h_change: 2.8 },
          'tron': { usd: 0.08, usd_24h_change: 1.5 },
          'staked-ether': { usd: 3400.00, usd_24h_change: 2.1 },
          'wrapped-bitcoin': { usd: 67750.00, usd_24h_change: 1.9 },
          'leo-token': { usd: 5.95, usd_24h_change: 0.8 },
          'usd-coin': { usd: 1.00, usd_24h_change: -0.05 }
        };
        dataSource = 'mock';
      }

      console.log('📋 Crypto prices data source:', dataSource);
      console.log('📋 Available prices:', Object.keys(priceData));

      res.json(priceData);

    } catch (error) {
      console.error('❌ Crypto prices API error:', error);
      res.status(500).json({
        error: 'Failed to fetch crypto prices',
        details: error.message
      });
    }
  });

  // Get primary wallet for authenticated user
  router.get('/api/wallet/primary', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session?.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = req.session.user;

      // For MetaMask users, create a wallet based on their connected address
      if (user.provider === 'metamask' && user.walletAddress) {
        const mockWallet = {
          id: `wallet_${user.walletAddress}`,
          address: user.walletAddress,
          name: `MetaMask Wallet`,
          balance: '2.5',
          balanceUSD: 6250.00,
          privateKey: null, // Never expose private keys
          createdAt: new Date().toISOString(),
          userId: user.id
        };

        return res.json(mockWallet);
      }

      // For other users, create a mock wallet
      const mockWallet = {
        id: `wallet_${user.id}`,
        address: '0x742d35Cc6634C0532925a3b8D1b9E7c0896B79dC',
        name: 'Primary Wallet',
        balance: '1.5',
        balanceUSD: 3750.00,
        privateKey: null,
        createdAt: new Date().toISOString(),
        userId: user.id
      };

      res.json(mockWallet);
    } catch (error) {
      console.error('Error fetching primary wallet:', error);
      res.status(500).json({ error: 'Failed to fetch primary wallet' });
    }
  });

  // Get user token balances
  router.get('/api/wallet/tokens/:address', async (req, res) => {
    try {
      const { address } = req.params;

      // Mock token balances - in production, this would fetch from blockchain
      const mockBalances = [
        {
          symbol: 'ETH',
          name: 'Ethereum',
          address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          balance: '2.5',
          balanceUSD: 6250.00,
          price: 2500.00,
          change24h: 2.5
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0xa0b86a33e6441b8c18d94ec8e42a99f0ba44683a',
          balance: '1000.0',
          balanceUSD: 1000.00,
          price: 1.00,
          change24h: 0.1
        }
      ];

      res.json({ tokens: mockBalances });
    } catch (error) {
      console.error('Error fetching wallet tokens:', error);
      res.status(500).json({ error: 'Failed to fetch wallet tokens' });
    }
  });

  // MetaMask authentication endpoint
  router.post('/api/auth/metamask', async (req, res) => {
    try {
      const { message, signature, address } = req.body;

      // Validate required fields
      if (!message || !signature || !address) {
        return res.status(400).json({ error: 'Missing required fields: message, signature, and address' });
      }

      // Validate address format (basic Ethereum address validation)
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ error: 'Invalid Ethereum address format' });
      }

      // In a real implementation, you would verify the signature here
      // For now, we'll create a mock user session
      const metamaskUser = {
        id: `metamask_${address}`,
        walletAddress: address,
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        provider: 'metamask',
        picture: null
      };

      // Store user in session (assuming you have session middleware)
      if (req.session) {
        req.session.user = metamaskUser;
      }

      res.json({
        success: true,
        user: metamaskUser,
        message: 'MetaMask authentication successful'
      });
    } catch (error) {
      console.error('MetaMask authentication error:', error);
      res.status(500).json({ error: 'MetaMask authentication failed' });
    }
  });

  app.use(router);

  // Create and return the HTTP server
  const server = createServer(app);
  return server;
}