import { readFileSync } from 'fs';
import { join } from 'path';
import { sql } from './client';

async function migrate() {
  console.log('Running database migrations...');
  
  try {
    const schema = readFileSync(join(process.cwd(), 'src/db/schema.sql'), 'utf-8');
    await sql(schema);
    console.log('✓ Migrations completed successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
