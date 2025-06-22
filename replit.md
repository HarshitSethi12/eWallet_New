# BitWallet - Cryptocurrency Exchange

## Overview

BitWallet is a full-stack cryptocurrency wallet and exchange application built with React, Express.js, and PostgreSQL. The application provides secure cryptocurrency management with Google OAuth authentication, wallet creation, transaction history, and real-time crypto price tracking.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and production builds
- **UI Framework**: Tailwind CSS with Radix UI components for accessible design
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod schema validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Express Session with Google OAuth 2.0
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Build Process**: ESBuild for server bundling

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Tables**:
  - `users`: User profiles with Google OAuth integration
  - `wallets`: Cryptocurrency wallets (BTC/ETH) with encrypted private keys
  - `transactions`: Transaction records with confirmation status
  - `contacts`: Address book for saved cryptocurrency addresses
  - `user_sessions`: Session tracking and analytics

## Key Components

### Authentication System
- Google OAuth 2.0 integration using `@auth/express`
- Session-based authentication with Express Session
- JWT token support for API authentication
- User session tracking and analytics

### Wallet Management
- Multi-chain wallet support (Bitcoin and Ethereum)
- Secure private key encryption and storage
- QR code generation for wallet addresses
- Balance tracking and updates

### Transaction System
- Send/receive cryptocurrency functionality
- Transaction history with confirmation status
- Contact management for frequent recipients
- Mock blockchain integration for development

### User Interface
- Responsive design optimized for mobile and desktop
- Dark/light theme support with CSS custom properties
- Real-time cryptocurrency price ticker
- Progressive Web App (PWA) capabilities

## Data Flow

1. **Authentication Flow**:
   - User initiates Google OAuth login
   - Server validates with Google and creates session
   - Frontend receives user data and authentication state
   - Protected routes check authentication status

2. **Wallet Operations**:
   - Wallet creation generates encrypted keypairs
   - Balance updates through blockchain service integration
   - Transaction creation updates both sender and recipient records
   - Real-time UI updates through React Query

3. **Data Persistence**:
   - Database operations through Drizzle ORM
   - Connection pooling with Neon serverless
   - Session data stored server-side
   - Client state synchronized with server

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless
- **Authentication**: Google OAuth 2.0 APIs
- **UI Components**: Radix UI primitives
- **Styling**: Tailwind CSS framework
- **Development**: Replit hosting and development environment

### Optional Integrations
- **Cryptocurrency APIs**: CoinGecko for price data
- **Blockchain Networks**: Bitcoin and Ethereum testnets
- **MetaMask**: Web3 wallet integration for DEX functionality

## Deployment Strategy

### Development Environment
- Replit-hosted development with hot reload
- Vite dev server for frontend with HMR
- PostgreSQL module provisioned automatically
- Environment variables managed through Replit secrets

### Production Deployment
- Cloud Run deployment target configured
- Build process: Vite build + ESBuild server bundling
- Static assets served from `/dist/public`
- Database connection through environment variables

### Environment Configuration
- Development: Local database with mock data
- Production: Neon PostgreSQL with SSL
- Session secrets and OAuth credentials via environment variables
- Build optimization for production bundle size

## Changelog

- June 22, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.