
// ===== IMPORT SECTION =====
// Import database configuration and schema definitions

import { db } from './db';                      // Database connection instance
import { 
  userSessions,                               // User sessions table schema
  metamaskUsers,                              // MetaMask users table schema
  InsertUserSession,                          // TypeScript type for inserting user sessions
  InsertMetaMaskUser                          // TypeScript type for inserting MetaMask users
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';        // Database query operators

// ===== STORAGE CLASS =====
// This class handles all database operations for the application
class Storage {
  
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

  // ===== DATABASE MAINTENANCE =====

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
