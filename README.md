# BitWallet - Self-Custodial Cryptocurrency Wallet

A full-stack cryptocurrency wallet application with **real blockchain integration** for Bitcoin, Ethereum, and Solana. Users create one wallet with one recovery phrase that generates real, working addresses across all three chains.

## 🌟 Key Features

### Self-Custodial Architecture
- **Client-side key derivation** - Private keys NEVER touch the server
- **One seed, multi-chain** - Single recovery phrase for BTC, ETH, and SOL
- **Industry-standard derivation paths**:
  - Bitcoin: BIP84 (m/84'/0'/0'/0/0) - Native SegWit (bc1...)
  - Ethereum: BIP44 (m/44'/60'/0'/0/0) - Standard addresses (0x...)
  - Solana: SLIP-0010 (m/44'/501'/0'/0') - Base58 addresses

### Real Blockchain Integration ✅
- **Live balance fetching** from actual blockchains (Bitcoin, Ethereum, Solana)
- **Real transaction history** with confirmations, fees, and accurate amounts
- **Production-ready addresses** that can receive real cryptocurrency
- **USD value calculations** with live market prices from CoinGecko

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (fast build tool)
- Tailwind CSS + Radix UI + shadcn/ui
- TanStack Query (React Query)
- Cryptocurrency libraries: @scure/bip39, @scure/bip32, bitcoinjs-lib, ethers, @solana/web3.js

**Backend:**
- Express.js + Node.js + TypeScript
- PostgreSQL with Drizzle ORM
- Express Session for authentication
- Bcrypt for password hashing

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL database
- Etherscan API key (free from [Etherscan.io](https://etherscan.io/apis))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/HarshitSethi12/eWallet.git
cd eWallet
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
# Database (required)
DATABASE_URL=postgresql://user:password@host:port/database

# Blockchain APIs (required for real-time data)
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Security (required)
SESSION_SECRET=your_random_secret_key_here
# Generate with: openssl rand -hex 32

# Environment
NODE_ENV=development
```

4. **Set up the database**

```bash
npm run db:push
```

This will create all necessary tables in your PostgreSQL database.

5. **Start the development server**

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📁 Project Structure

```
eWallet/
├── client/                          # Frontend React application
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── ui/                # shadcn/ui components
│   │   │   ├── email-auth.tsx     # Email authentication UI
│   │   │   ├── address-card.tsx   # Wallet address display
│   │   │   └── transaction-list.tsx # Transaction history
│   │   ├── pages/
│   │   │   ├── dashboard.tsx      # Main dashboard (balances, transactions)
│   │   │   └── home.tsx           # Landing page
│   │   ├── lib/
│   │   │   ├── self-custodial-wallet.ts  # ⭐ Core wallet generation
│   │   │   ├── polyfills.ts       # Browser crypto polyfills
│   │   │   └── queryClient.ts     # React Query setup
│   │   └── hooks/
│   │       └── use-auth.tsx       # Authentication hook
│   └── index.html
├── server/                         # Backend Express application
│   ├── index.ts                   # Server entry point
│   ├── routes.ts                  # API routes
│   ├── blockchain-service.ts      # ⭐ Blockchain integration
│   ├── db.ts                      # Database connection
│   ├── storage.ts                 # Data access layer
│   └── vite.ts                    # Vite dev server setup
├── shared/
│   └── schema.ts                  # Database schema (Drizzle)
└── package.json
```

## 🔐 Security Model

### What the Server Stores
- ✅ Email address
- ✅ Password hash (bcrypt with salt)
- ✅ Public wallet addresses (BTC, ETH, SOL)
- ✅ Salt for key derivation

### What is NEVER Stored
- ❌ Private keys
- ❌ Recovery phrases (12-word mnemonics)
- ❌ Plain-text passwords

### How It Works

1. **User Registration/Login**
   - User enters email + password
   - Random salt generated (32 bytes)
   
2. **Wallet Generation (Client-Side Only)**
   - Scrypt derives seed from `email:password` + salt
   - BIP39 generates 12-word recovery phrase from seed
   - Derive private keys for all 3 chains using standard paths
   - Generate public addresses
   
3. **Server Storage**
   - Server receives: email, password hash, salt, public addresses
   - Server NEVER sees: private keys, mnemonic, plain password

## 🌐 Blockchain APIs

- **Bitcoin**: blockchain.info API (balance + transactions)
- **Ethereum**: Etherscan API (balance + transactions + gas prices)
- **Solana**: Solana mainnet-beta RPC (balance + transactions)
- **Market Prices**: CoinGecko API (real-time cryptocurrency prices)

## 🛠️ Available Scripts

```bash
npm run dev              # Start development server (port 5000)
npm run build            # Build for production
npm start                # Start production server
npm run db:push          # Push schema changes to database
npm run db:push --force  # Force push (data loss possible)
npm run db:studio        # Open Drizzle Studio (database GUI)
```

## 📱 Features in Detail

### Wallet Management
- Create self-custodial wallet with email + strong password
- View real-time balances for Bitcoin, Ethereum, and Solana
- Display wallet addresses with QR codes
- Copy addresses to clipboard
- Switch between networks (BTC/ETH/SOL)

### Transaction History
- View real transactions from blockchain explorers
- Transaction details: hash, from/to addresses, amount, fee
- Confirmation status and count
- Timestamp and block number
- Filter by blockchain network

### Live Market Data
- Real-time prices for 25+ cryptocurrencies
- 24-hour price changes
- Portfolio value calculation in USD
- Price ticker component

### Authentication
- Email/password authentication
- Strong password requirements (12+ chars, uppercase, lowercase, number, special char)
- Session-based authentication with Express Session
- Logout functionality

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ETHERSCAN_API_KEY` | Yes | Free API key from Etherscan.io |
| `SESSION_SECRET` | Yes | Random string for session encryption |
| `NODE_ENV` | No | `development` or `production` |

### Database Schema

The app uses PostgreSQL with Drizzle ORM. Main tables:

- **users** - User accounts (id, email, passwordHash, salt, btcAddress, ethAddress, solAddress)
- **transactions** - (Deprecated - now fetches from blockchain APIs)

Schema is defined in `shared/schema.ts` and managed with Drizzle Kit.

## 🚢 Deployment

### Deploy to Replit
1. Import from GitHub: `https://github.com/HarshitSethi12/eWallet`
2. Set environment variables in Replit Secrets:
   - `DATABASE_URL`
   - `ETHERSCAN_API_KEY`
   - `SESSION_SECRET`
3. Replit will auto-create PostgreSQL database
4. Click "Run" - the workflow runs `npm run dev`

### Deploy to Other Platforms

**Vercel / Netlify / Railway:**
1. Connect GitHub repository
2. Set environment variables
3. Build command: `npm run build`
4. Start command: `npm start`
5. Provision PostgreSQL database (or use Neon, Supabase, etc.)

**Lovable / Bolt / Cursor:**
1. Import project from GitHub
2. These platforms auto-detect package.json
3. Set environment variables in their UI
4. Run `npm install` then `npm run dev`

## 🧪 Testing with Real Cryptocurrency

**⚠️ WARNING: All addresses are MAINNET - use small test amounts!**

1. Create a new wallet in the app
2. Copy one of your addresses (Bitcoin, Ethereum, or Solana)
3. Send a SMALL test amount from an exchange or another wallet
4. Wait for confirmations (varies by network)
5. Refresh the dashboard - balance should update automatically
6. Check transaction history tab

### Recommended Test Amounts
- Bitcoin: 0.0001 BTC (~$5 USD)
- Ethereum: 0.001 ETH (~$3 USD)
- Solana: 0.01 SOL (~$1 USD)

## ⚠️ Important Security Notes

1. **Mainnet Only**: All addresses are for real cryptocurrency, not testnets
2. **Self-Custody**: Users are fully responsible for their recovery phrases
3. **Irreversible**: Blockchain transactions cannot be reversed
4. **No Recovery**: If you lose your recovery phrase, funds are PERMANENTLY LOST
5. **Strong Passwords**: Use 12+ character passwords with mixed case, numbers, symbols
6. **Backup**: Always backup your 12-word recovery phrase securely offline

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL format
postgresql://username:password@host:port/database

# Test connection
psql $DATABASE_URL
```

### Missing Balances
- Check ETHERSCAN_API_KEY is set correctly
- Verify addresses have received transactions (check on blockchain explorer)
- Check browser console for API errors

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

## 📄 License

MIT License - See LICENSE file

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Support

- **Issues**: Open a GitHub issue
- **Security**: For security vulnerabilities, please email privately (do not open public issues)

## 🔗 Links

- [Live Demo](https://workspace.harshitsethi1.repl.co) (if deployed)
- [GitHub Repository](https://github.com/HarshitSethi12/eWallet)
- [Etherscan API Docs](https://docs.etherscan.io/)
- [Bitcoin Core](https://bitcoin.org/en/developer-documentation)
- [Solana Documentation](https://docs.solana.com/)

---

**Built with ❤️ using React, Express, and blockchain technology**

**Self-custodial • Open source • Production-ready**
