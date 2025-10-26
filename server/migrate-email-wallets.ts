
import { db } from './db';
import { sql } from 'drizzle-orm';

async function createEmailWalletsTable() {
  try {
    console.log('🚀 Creating email_wallets table...');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_wallets (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        wallet_address TEXT NOT NULL UNIQUE,
        encrypted_private_key TEXT NOT NULL,
        encrypted_seed_phrase TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ email_wallets table created successfully');

    // Create index on email for faster lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_email_wallets_email 
      ON email_wallets(email)
    `);

    console.log('✅ Index on email column created');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating email_wallets table:', error);
    process.exit(1);
  }
}

createEmailWalletsTable();
