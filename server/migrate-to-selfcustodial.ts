
import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Migration to Self-Custodial Architecture
 * This removes all private keys from the database
 * WARNING: This is irreversible! Users will need to import wallets with seed phrases.
 */

async function migrateSelfCustodial() {
  console.log('🔄 Starting migration to self-custodial architecture...');
  
  try {
    // Drop the private key columns
    await db.execute(sql`
      ALTER TABLE email_wallets 
      DROP COLUMN IF EXISTS encrypted_private_key,
      DROP COLUMN IF EXISTS encrypted_seed_phrase;
    `);
    
    console.log('✅ Migration complete!');
    console.log('   - Removed encrypted_private_key column');
    console.log('   - Removed encrypted_seed_phrase column');
    console.log('   - Database is now self-custodial');
    console.log('\n⚠️  Users must import their wallets using seed phrases');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

migrateSelfCustodial()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
