
# eWallet - Multi-Blockchain Cryptocurrency Wallet

A modern, full-stack cryptocurrency wallet application supporting Bitcoin, Ethereum, and Solana networks with integrated DEX swap functionality.

## Features

- 🔐 **Multi-Wallet Support**: Bitcoin, Ethereum, and Solana
- 💱 **DEX Integration**: Swap tokens across different networks
- 📱 **Phone Authentication**: Secure phone-based login with OTP
- 💬 **AI Chat Assistant**: Built-in AI helper for crypto guidance
- 📊 **Real-time Price Tracking**: Live cryptocurrency price updates
- 💸 **Send/Receive**: Easy transaction management
- 📝 **Notes System**: Keep track of transactions and contacts
- 🔄 **Exchange Pools**: Monitor liquidity pools and trading pairs

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **TailwindCSS** for styling
- **shadcn/ui** for UI components
- **React Query** for data fetching
- **WalletConnect** for Web3 integration

### Backend
- **Node.js** with Express
- **TypeScript**
- **PostgreSQL** (via Neon) for database
- **Drizzle ORM** for type-safe database queries
- **Session-based authentication**
- **Twilio** for SMS/phone authentication

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Neon account)
- Twilio account (for phone auth)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with the following:
```env
DATABASE_URL=your_postgres_connection_string
SESSION_SECRET=your_session_secret
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

4. Run database migrations:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utility functions
├── server/              # Backend Express application
│   ├── blockchain/      # Blockchain integration
│   ├── config/          # Configuration files
│   ├── auth.ts          # Authentication logic
│   └── routes.ts        # API routes
├── shared/              # Shared types and schemas
└── scripts/             # Utility scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push database schema changes

## Deployment

This project is optimized for deployment on Replit with Cloud Run as the target.

### Deploy to Replit
1. Import this repository to Replit
2. Set environment variables in Secrets
3. Click "Deploy" and configure build/run commands
4. Your app will be live at `<app-name>.replit.app`

## Security Notes

- Never commit `.env` files or sensitive credentials
- Use environment variables for all secrets
- Session secrets should be strong and unique
- Keep dependencies updated regularly

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Built with [Replit](https://replit.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Blockchain integrations via WalletConnect and Web3 libraries
