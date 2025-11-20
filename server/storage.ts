// ===== IMPORT SECTION =====
// Import database configuration and schema definitions

import { db } from './db';                      // Database connection instance
import {
  userSessions,                               // User sessions table schema
  metamaskUsers,                              // MetaMask users table schema
  emailWallets,                               // Email wallets table schema
  InsertUserSession,                          // TypeScript type for inserting user sessions
  InsertMetaMaskUser,                         // TypeScript type for inserting MetaMask users
  InsertEmailWallet                           // TypeScript type for inserting email wallets
} from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';        // Database query operators
import crypto from 'crypto';                   // Encryption utilities

// ===== STORAGE CLASS =====
// This class handles all database operations for the application
// SELF-CUSTODIAL: No encryption needed - private keys never stored on server!
class Storage {
  constructor() {
    // No encryption key required for self-custodial wallets
    console.log('✅ Storage initialized - Self-custodial mode (no private key storage)');
  }

  // ===== USER SESSION MANAGEMENT =====

  /**
   * Creates a new user session record in the database
   * This tracks when users log in and their session details
   */
  async createUserSession(sessionData: {
    userId?: number | null;      // Optional user ID (may be null for new users)
    email?: string | null;       // User's email address
    name: string;                // User's display name
    phone?: string | null;       // Phone number (for phone auth)
    walletAddress?: string | null; // MetaMask wallet address (for MetaMask auth)
    ipAddress: string;           // User's IP address for security tracking
    userAgent: string;           // Browser user agent string
    sessionId: string;           // Express session ID
  }) {
    try {
      console.log('💾 Creating user session in database...');

      // Insert new session record into database
      const result = await db.insert(userSessions).values({
        userId: sessionData.userId,
        email: sessionData.email,
        name: sessionData.name,
        phone: sessionData.phone,
        walletAddress: sessionData.walletAddress,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        sessionId: sessionData.sessionId,
        startTime: new Date(),               // Set current time as start time
        isActive: true,                      // Mark session as active
      }).returning({ id: userSessions.id }); // Return the generated session ID

      console.log('✅ User session created with ID:', result[0]?.id);
      return result[0]?.id;
    } catch (error) {
      console.error('❌ Error creating user session:', error);
      throw error;
    }
  }

  /**
   * Marks a user session as ended when they log out
   * Calculates session duration and updates the database
   */
  async endUserSession(sessionId: number) {
    try {
      console.log('💾 Ending user session:', sessionId);

      // Get the session to calculate duration
      const sessions = await db.select().from(userSessions).where(eq(userSessions.id, sessionId));

      if (sessions.length === 0) {
        console.warn('⚠️ Session not found:', sessionId);
        return;
      }

      const session = sessions[0];
      const endTime = new Date();

      // Calculate session duration in seconds
      const duration = session.startTime
        ? Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000)
        : null;

      // Update session with end time and duration
      await db.update(userSessions)
        .set({
          endTime: endTime,
          duration: duration,
          isActive: false,                   // Mark session as inactive
          updatedAt: new Date()
        })
        .where(eq(userSessions.id, sessionId));

      console.log('✅ User session ended. Duration:', duration, 'seconds');
    } catch (error) {
      console.error('❌ Error ending user session:', error);
      throw error;
    }
  }

  /**
   * Retrieves all user sessions from the database
   * Used for admin monitoring and analytics
   */
  async getAllSessions() {
    try {
      console.log('📊 Fetching all user sessions...');

      // Get all sessions ordered by most recent first
      const sessions = await db.select().from(userSessions).orderBy(desc(userSessions.startTime));

      console.log('✅ Retrieved', sessions.length, 'sessions');
      return sessions;
    } catch (error) {
      console.error('❌ Error fetching sessions:', error);
      throw error;
    }
  }

  /**
   * Gets active (currently ongoing) user sessions
   * Useful for monitoring current app usage
   */
  async getActiveSessions() {
    try {
      console.log('📊 Fetching active user sessions...');

      // Get only sessions where isActive is true
      const activeSessions = await db.select()
        .from(userSessions)
        .where(eq(userSessions.isActive, true))
        .orderBy(desc(userSessions.startTime));

      console.log('✅ Retrieved', activeSessions.length, 'active sessions');
      return activeSessions;
    } catch (error) {
      console.error('❌ Error fetching active sessions:', error);
      throw error;
    }
  }

  /**
   * Gets all sessions for a specific user email
   * Used for admin monitoring of specific users
   */
  async getSessionsByEmail(email: string) {
    try {
      console.log('📊 Fetching sessions for email:', email);

      // Get all sessions for the specified email
      const sessions = await db.select()
        .from(userSessions)
        .where(eq(userSessions.email, email))
        .orderBy(desc(userSessions.startTime));

      console.log('✅ Retrieved', sessions.length, 'sessions for email:', email);
      return sessions;
    } catch (error) {
      console.error('❌ Error fetching sessions by email:', error);
      throw error;
    }
  }

  // ===== METAMASK USER MANAGEMENT =====

  /**
   * Creates or updates a MetaMask user in the database
   * Stores wallet address and user preferences
   */
  async createOrUpdateMetaMaskUser(userData: {
    address: string;             // MetaMask wallet address (unique identifier)
    displayName: string;         // User's chosen display name
    ensName?: string | null;     // ENS domain name (if they have one)
  }) {
    try {
      console.log('🦊 Creating/updating MetaMask user:', userData.address);

      // Try to find existing user first
      const existingUsers = await db.select()
        .from(metamaskUsers)
        .where(eq(metamaskUsers.address, userData.address));

      if (existingUsers.length > 0) {
        // User exists, update their information
        console.log('📝 Updating existing MetaMask user');

        const result = await db.update(metamaskUsers)
          .set({
            displayName: userData.displayName,
            ensName: userData.ensName,
            lastLogin: new Date()              // Update last login time
          })
          .where(eq(metamaskUsers.address, userData.address))
          .returning();

        return result[0];
      } else {
        // User doesn't exist, create new record
        console.log('🆕 Creating new MetaMask user');

        const result = await db.insert(metamaskUsers)
          .values({
            address: userData.address,
            displayName: userData.displayName,
            ensName: userData.ensName,
            lastLogin: new Date(),
            createdAt: new Date()
          })
          .returning();

        return result[0];
      }
    } catch (error) {
      console.error('❌ Error creating/updating MetaMask user:', error);
      throw error;
    }
  }

  /**
   * Finds a MetaMask user by their wallet address
   * Used during authentication to get user details
   */
  async getMetaMaskUserByAddress(address: string) {
    try {
      console.log('🔍 Finding MetaMask user by address:', address);

      const users = await db.select()
        .from(metamaskUsers)
        .where(eq(metamaskUsers.address, address));

      if (users.length > 0) {
        console.log('✅ MetaMask user found');
        return users[0];
      } else {
        console.log('❌ MetaMask user not found');
        return null;
      }
    } catch (error) {
      console.error('❌ Error finding MetaMask user:', error);
      throw error;
    }
  }

  // ===== EMAIL WALLET MANAGEMENT =====

  /**
   * Creates a new self-custodial email wallet
   * SELF-CUSTODIAL: Private keys NEVER stored on server!
   * Only stores: email (canonicalized), password hash (bcrypt), salt, public address, chain
   */
  async createEmailWallet(walletData: {
    email: string;
    passwordHash: string;
    salt: string;
    btcAddress: string;
    ethAddress: string;
    solAddress: string;
  }) {
    try {
      // Canonicalize email (lowercase) for consistent login
      const canonicalEmail = walletData.email.toLowerCase().trim();
      
      console.log('🔐 Creating new multi-chain self-custodial wallet for:', canonicalEmail);
      console.log('📍 BTC:', walletData.btcAddress);
      console.log('📍 ETH:', walletData.ethAddress);
      console.log('📍 SOL:', walletData.solAddress);

      const result = await db.insert(emailWallets)
        .values({
          email: canonicalEmail,
          passwordHash: walletData.passwordHash,
          salt: walletData.salt,
          btcAddress: walletData.btcAddress,
          ethAddress: walletData.ethAddress,
          solAddress: walletData.solAddress,
        })
        .returning();

      console.log('✅ Multi-chain self-custodial wallet created (no private keys stored!)');
      return {
        isNew: true,
        wallet: {
          id: result[0].id,
          email: result[0].email,
          btcAddress: result[0].btcAddress,
          ethAddress: result[0].ethAddress,
          solAddress: result[0].solAddress,
          createdAt: result[0].createdAt,
        }
      };
    } catch (error) {
      console.error('❌ Error creating email wallet:', error);
      throw error;
    }
  }

  /**
   * Gets a single wallet by email and chain
   * Returns wallet with salt and password hash for authentication
   * Used for login to specific chain wallet
   */
  async getEmailWalletByEmail(email: string) {
    try {
      const canonicalEmail = email.toLowerCase().trim();
      console.log('🔍 Finding multi-chain wallet for email:', canonicalEmail);

      const wallets = await db.select()
        .from(emailWallets)
        .where(eq(emailWallets.email, canonicalEmail))
        .limit(1);

      if (wallets.length === 0) {
        console.log('❌ No wallet found for email:', canonicalEmail);
        return null;
      }

      const wallet = wallets[0];
      console.log('✅ Multi-chain wallet found for email:', canonicalEmail);

      return {
        id: wallet.id,
        email: wallet.email,
        passwordHash: wallet.passwordHash,
        salt: wallet.salt,
        btcAddress: wallet.btcAddress,
        ethAddress: wallet.ethAddress,
        solAddress: wallet.solAddress,
        createdAt: wallet.createdAt,
        lastLogin: wallet.lastLogin,
      };
    } catch (error) {
      console.error('❌ Error finding wallet by email:', error);
      throw error;
    }
  }


  /**
   * Gets the wallet for an email address (singular - one wallet per email)
   * Returns wallet with btc/eth/sol addresses (without private keys for security)
   */
  async getEmailWallets(email: string) {
    try {
      const canonicalEmail = email.toLowerCase().trim();
      console.log('🔍 Finding wallet for email:', canonicalEmail);

      const wallets = await db.select()
        .from(emailWallets)
        .where(eq(emailWallets.email, canonicalEmail))
        .limit(1);

      if (wallets.length === 0) {
        console.log('❌ No wallet found for email:', canonicalEmail);
        return null;
      }

      const wallet = wallets[0];
      console.log('✅ Wallet found for email:', canonicalEmail);

      return {
        id: wallet.id,
        email: wallet.email,
        btcAddress: wallet.btcAddress,
        ethAddress: wallet.ethAddress,
        solAddress: wallet.solAddress,
        createdAt: wallet.createdAt,
        lastLogin: wallet.lastLogin,
      };
    } catch (error) {
      console.error('❌ Error retrieving email wallet:', error);
      throw error;
    }
  }

  /**
   * Gets a specific wallet by ID for an email
   * Returns wallet with all chain addresses
   */
  async getEmailWalletById(email: string, walletId: number) {
    try {
      const canonicalEmail = email.toLowerCase().trim();
      console.log('🔍 Finding wallet by ID:', walletId, 'for email:', canonicalEmail);

      const wallets = await db.select()
        .from(emailWallets)
        .where(eq(emailWallets.id, walletId));

      if (wallets.length === 0 || wallets[0].email !== canonicalEmail) {
        console.log('❌ Wallet not found or email mismatch');
        return null;
      }

      const wallet = wallets[0];

      // Update last login
      await db.update(emailWallets)
        .set({ lastLogin: new Date() })
        .where(eq(emailWallets.id, walletId));

      console.log('✅ Email wallet found');
      return {
        id: wallet.id,
        email: wallet.email,
        btcAddress: wallet.btcAddress,
        ethAddress: wallet.ethAddress,
        solAddress: wallet.solAddress,
        createdAt: wallet.createdAt,
        lastLogin: wallet.lastLogin,
      };
    } catch (error) {
      console.error('❌ Error retrieving email wallet by ID:', error);
      throw error;
    }
  }

  /**
   * Checks if an email already has a wallet
   */
  async emailHasWallet(email: string): Promise<boolean> {
    try {
      const wallets = await db.select()
        .from(emailWallets)
        .where(eq(emailWallets.email, email));

      return wallets.length > 0;
    } catch (error) {
      console.error('❌ Error checking email wallet:', error);
      return false;
    }
  }

  /**
   * Deletes all wallets for an email address (admin/cleanup function)
   */
  async deleteEmailWallets(email: string): Promise<number> {
    try {
      console.log('🗑️ Deleting all wallets for email:', email);

      const result = await db.delete(emailWallets)
        .where(eq(emailWallets.email, email))
        .returning({ id: emailWallets.id });

      console.log('✅ Deleted', result.length, 'wallet(s) for email:', email);
      return result.length;
    } catch (error) {
      console.error('❌ Error deleting email wallets:', error);
      throw error;
    }
  }

  /**
   * Gets count of all wallets for an email (for debugging)
   */
  async getEmailWalletCount(email: string): Promise<number> {
    try {
      const wallets = await db.select()
        .from(emailWallets)
        .where(eq(emailWallets.email, email));

      return wallets.length;
    } catch (error) {
      console.error('❌ Error counting email wallets:', error);
      return 0;
    }
  }

  /**
   * Deletes a specific wallet by ID for an email address
   * Only allows deletion if the user owns the wallet (email matches)
   */
  async deleteEmailWalletById(email: string, walletId: number): Promise<boolean> {
    try {
      console.log('🗑️ Deleting wallet ID:', walletId, 'for email:', email);

      // First verify the wallet belongs to this email
      const wallets = await db.select()
        .from(emailWallets)
        .where(eq(emailWallets.id, walletId));

      if (wallets.length === 0 || wallets[0].email !== email) {
        console.log('❌ Wallet not found or email mismatch');
        return false;
      }

      // Delete the wallet
      const result = await db.delete(emailWallets)
        .where(eq(emailWallets.id, walletId))
        .returning({ id: emailWallets.id });

      if (result.length > 0) {
        console.log('✅ Wallet deleted successfully:', walletId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error deleting email wallet:', error);
      throw error;
    }
  }

  /**
   * ADMIN ONLY: Force delete any wallet by ID without restrictions
   * This bypasses all safety checks (email verification, active wallet check, etc.)
   */
  async adminForceDeleteWallet(walletId: number): Promise<{ success: boolean; wallet?: any; error?: string }> {
    try {
      console.log('⚠️ ADMIN: Force deleting wallet ID:', walletId);

      // Get wallet info before deletion
      const wallets = await db.select()
        .from(emailWallets)
        .where(eq(emailWallets.id, walletId));

      if (wallets.length === 0) {
        return { success: false, error: 'Wallet not found' };
      }

      const wallet = wallets[0];

      // Delete the wallet
      const result = await db.delete(emailWallets)
        .where(eq(emailWallets.id, walletId))
        .returning({ id: emailWallets.id });

      if (result.length > 0) {
        console.log('✅ ADMIN: Wallet deleted successfully:', walletId);
        return {
          success: true,
          wallet: {
            id: wallet.id,
            email: wallet.email,
            btcAddress: wallet.btcAddress,
            ethAddress: wallet.ethAddress,
            solAddress: wallet.solAddress,
            createdAt: wallet.createdAt,
          }
        };
      }

      return { success: false, error: 'Delete operation failed' };
    } catch (error: any) {
      console.error('❌ ADMIN: Error force deleting wallet:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  // ===== ADMIN GET METHODS =====
  // Get all email wallets
  async getAllEmailWallets() {
    // Returning wallet addresses and related info, not sensitive keys
    return await db.select({
      id: emailWallets.id,
      email: emailWallets.email,
      btcAddress: emailWallets.btcAddress,
      ethAddress: emailWallets.ethAddress,
      solAddress: emailWallets.solAddress,
      createdAt: emailWallets.createdAt,
      lastLogin: emailWallets.lastLogin,
    }).from(emailWallets).orderBy(desc(emailWallets.createdAt));
  }

  // Get all MetaMask users
  async getAllMetaMaskUsers() {
    return await db.select().from(metamaskUsers).orderBy(desc(metamaskUsers.createdAt));
  }

  // ===== GET METHODS =====

  /**
   * Cleans up old inactive sessions from the database
   * Helps keep the database size manageable
   */
  async cleanupOldSessions(daysOld: number = 30) {
    try {
      console.log(`🧹 Cleaning up sessions older than ${daysOld} days...`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Delete old inactive sessions
      const result = await db.delete(userSessions)
        .where(eq(userSessions.isActive, false))
        // Note: Additional date filtering would need more complex query
        .returning({ id: userSessions.id });

      console.log('✅ Cleaned up', result.length, 'old sessions');
      return result.length;
    } catch (error) {
      console.error('❌ Error cleaning up old sessions:', error);
      throw error;
    }
  }

  /**
   * Gets database statistics for monitoring
   * Returns counts of various database records
   */
  async getDatabaseStats() {
    try {
      console.log('📊 Gathering database statistics...');

      // Get counts of different record types
      const totalSessions = await db.select().from(userSessions);
      const activeSessions = await db.select().from(userSessions).where(eq(userSessions.isActive, true));
      const metamaskUserCount = await db.select().from(metamaskUsers);

      const stats = {
        totalSessions: totalSessions.length,
        activeSessions: activeSessions.length,
        metamaskUsers: metamaskUserCount.length,
        lastUpdated: new Date().toISOString()
      };

      console.log('✅ Database stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      throw error;
    }
  }
}

// ===== EXPORT STORAGE INSTANCE =====
// Create and export a single instance of the Storage class
// This ensures we use the same database connection throughout the app
export const storage = new Storage();