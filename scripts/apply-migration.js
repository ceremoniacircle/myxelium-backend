#!/usr/bin/env node

/**
 * Apply Supabase migration directly using database credentials
 * This script reads the migration file and executes it against your Supabase database
 */

const { readFileSync } = require('fs');
const { join } = require('path');

// Load environment variables
require('dotenv').config({ path: join(__dirname, '..', '.env.local') });

async function applyMigration() {
  // Dynamic import of pg for ESM compatibility
  const { Client } = await import('pg');

  const client = new Client({
    connectionString: process.env.POSTGRES_URL_NON_POOLING,
    ssl: process.env.POSTGRES_URL_NON_POOLING?.includes('localhost')
      ? false
      : { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Read migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250930_abstract_schema_v2.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    console.log(`📊 Migration file size: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);

    // Execute migration
    console.log('🚀 Applying migration...');
    const startTime = Date.now();

    await client.query(migrationSQL);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Migration applied successfully in ${duration}s`);

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`\n📋 Created tables (${result.rows.length}):`);
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    if (error.position) {
      console.error(`Error at position: ${error.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run migration
applyMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
