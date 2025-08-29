
# Cryptocurrency API Setup Guide

## 1. CoinGecko API (Recommended - FREE)
- **No API key required** for basic usage
- **Free tier**: 30 calls/minute, 10,000 calls/month
- **Coverage**: 10,000+ cryptocurrencies across all blockchains
- **Setup**: No setup required! Already integrated.

## 2. CoinMarketCap API (Premium Option)
- **Free tier**: 10,000 calls/month
- **Coverage**: 9,000+ cryptocurrencies
- **Setup**:
  1. Go to https://coinmarketcap.com/api/
  2. Sign up for free account
  3. Get your API key
  4. Add to Replit Secrets as `COINMARKETCAP_API_KEY`

## 3. Moralis Web3 API (Web3 Features)
- **Free tier**: 40,000 requests/month
- **Features**: Token prices, balances, NFTs, DeFi data
- **Setup**:
  1. Go to https://moralis.io/
  2. Sign up for free account
  3. Get your API key
  4. Add to Replit Secrets as `MORALIS_API_KEY`

## 4. Alternative APIs:
- **Coingecko Pro**: Higher rate limits
- **Cryptocompare**: Real-time data
- **Alpha Vantage**: Financial data
- **Messari**: Research-grade data

## Current Implementation:
- **Primary**: CoinGecko (no setup needed)
- **Fallback**: CoinMarketCap (requires API key)
- **Legacy**: 1inch (Ethereum only, having issues)

## Test Your APIs:
Visit `/api/debug/test-apis` to test all configured APIs.
