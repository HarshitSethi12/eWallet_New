
import { db } from './db';
import { sql } from 'drizzle-orm';

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');

    // Create metamask_users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS metamask_users (
        id SERIAL PRIMARY KEY,
        address TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        ens_name TEXT,
        last_login TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ metamask_users table created');

    // Create user_sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        email TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        ip_address TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        session_id TEXT NOT NULL,
        login_time TIMESTAMP DEFAULT NOW(),
        logout_time TIMESTAMP,
        duration INTEGER,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // Add missing columns to existing table if they don't exist
    try {
      await db.execute(sql`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS phone TEXT`);
      await db.execute(sql`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS wallet_address TEXT`);
      await db.execute(sql`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS duration INTEGER`);
      await db.execute(sql`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
      console.log('✅ user_sessions table columns added');
    } catch (error) {
      console.log('⚠️  Some columns might already exist:', error.message);
    }
    console.log('✅ user_sessions table created');

    // Create wallets table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        chain TEXT NOT NULL,
        address TEXT NOT NULL UNIQUE,
        encrypted_private_key TEXT NOT NULL,
        last_balance TEXT DEFAULT '0',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ wallets table created');

    // Create transactions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        amount DECIMAL NOT NULL,
        fee DECIMAL DEFAULT 0,
        transaction_hash TEXT,
        chain TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        confirmed BOOLEAN DEFAULT FALSE,
        block_number INTEGER
      )
    `);
    console.log('✅ transactions table created');

    // Create contacts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ contacts table created');

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
