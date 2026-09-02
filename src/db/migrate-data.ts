import { sql } from './client';

/**
 * Migrate existing data to multi-barber schema
 * This script should be run AFTER the schema migration
 * It handles backfilling barber_id and setting constraints
 */
async function migrateData() {
  console.log('Migrating existing data to multi-barber schema...');
  
  try {
    // Check if users table exists and has data
    const existingUsers = await sql`SELECT COUNT(*) as count FROM users` as any[];
    const userCount = parseInt(existingUsers[0].count);
    
    if (userCount > 0) {
      console.log('✓ Users table already has data, checking barber migration...');
    } else {
      console.log('Creating initial users and barber...');
    }

    // Get admin IDs from environment
    const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '')
      .split(',')
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    if (adminIds.length === 0) {
      throw new Error('ADMIN_TELEGRAM_IDS is required for initial setup');
    }

    const firstAdminId = adminIds[0];
    const salonName = process.env.SALON_NAME || 'سالن زیبایی';
    
    console.log(`Using Telegram ID ${firstAdminId} as super admin and first barber`);
    
    // Create or get super admin user (who is also the first barber)
    let adminUser = await sql`
      SELECT id FROM users WHERE telegram_id = ${firstAdminId}
    ` as any[];

    let adminUserId: number;
    
    if (adminUser.length === 0) {
      console.log('Creating super admin user...');
      const [newUser] = await sql`
        INSERT INTO users (telegram_id, role, name, is_active)
        VALUES (${firstAdminId}, 'super_admin', ${`مدیر ${salonName}`}, true)
        RETURNING id
      ` as any[];
      adminUserId = newUser.id;
      console.log(`✓ Super admin user created with id: ${adminUserId}`);
    } else {
      adminUserId = adminUser[0].id;
      console.log(`✓ Super admin user already exists with id: ${adminUserId}`);
    }

    // Create or get barber record for the admin
    let barber = await sql`
      SELECT id FROM barbers WHERE user_id = ${adminUserId}
    ` as any[];

    let barberId: number;
    
    if (barber.length === 0) {
      console.log('Creating barber record for admin...');
      const [newBarber] = await sql`
        INSERT INTO barbers (user_id, display_name, is_active)
        VALUES (${adminUserId}, ${salonName}, true)
        RETURNING id
      ` as any[];
      barberId = newBarber.id;
      console.log(`✓ Barber record created with id: ${barberId}`);
    } else {
      barberId = barber[0].id;
      console.log(`✓ Barber record already exists with id: ${barberId}`);
    }

    // Check if we need to backfill barber_id columns
    const needsBackfill = await sql`
      SELECT EXISTS (
        SELECT 1 FROM services WHERE barber_id IS NULL LIMIT 1
      ) as needs_services,
      EXISTS (
        SELECT 1 FROM working_hours WHERE barber_id IS NULL LIMIT 1
      ) as needs_hours,
      EXISTS (
        SELECT 1 FROM blocked_slots WHERE barber_id IS NULL LIMIT 1
      ) as needs_blocked,
      EXISTS (
        SELECT 1 FROM appointments WHERE barber_id IS NULL LIMIT 1
      ) as needs_appointments
    ` as any[];

    const needs = needsBackfill[0];

    // Backfill services
    if (needs.needs_services) {
      console.log('Backfilling services...');
      await sql`UPDATE services SET barber_id = ${barberId} WHERE barber_id IS NULL`;
      const count = await sql`SELECT COUNT(*) as count FROM services WHERE barber_id = ${barberId}` as any[];
      console.log(`✓ Migrated ${count[0].count} services to barber ${barberId}`);
    }

    // Backfill working hours
    if (needs.needs_hours) {
      console.log('Backfilling working hours...');
      await sql`UPDATE working_hours SET barber_id = ${barberId} WHERE barber_id IS NULL`;
      const count = await sql`SELECT COUNT(*) as count FROM working_hours WHERE barber_id = ${barberId}` as any[];
      console.log(`✓ Migrated ${count[0].count} working hours to barber ${barberId}`);
    }

    // Backfill blocked slots
    if (needs.needs_blocked) {
      console.log('Backfilling blocked slots...');
      await sql`UPDATE blocked_slots SET barber_id = ${barberId} WHERE barber_id IS NULL`;
      const count = await sql`SELECT COUNT(*) as count FROM blocked_slots WHERE barber_id = ${barberId}` as any[];
      console.log(`✓ Migrated ${count[0].count} blocked slots to barber ${barberId}`);
    }

    // Backfill appointments
    if (needs.needs_appointments) {
      console.log('Backfilling appointments...');
      await sql`UPDATE appointments SET barber_id = ${barberId} WHERE barber_id IS NULL`;
      const count = await sql`SELECT COUNT(*) as count FROM appointments WHERE barber_id = ${barberId}` as any[];
      console.log(`✓ Migrated ${count[0].count} appointments to barber ${barberId}`);
    }

    // Set NOT NULL constraints and add foreign keys (if not already set)
    console.log('Setting constraints...');
    
    try {
      await sql`ALTER TABLE services ALTER COLUMN barber_id SET NOT NULL`;
      console.log('✓ Set services.barber_id NOT NULL');
    } catch (e) {
      console.log('  services.barber_id already NOT NULL');
    }

    try {
      await sql`
        ALTER TABLE services 
        ADD CONSTRAINT fk_services_barber 
        FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
      `;
      console.log('✓ Added foreign key services -> barbers');
    } catch (e) {
      console.log('  Foreign key services -> barbers already exists');
    }

    try {
      await sql`ALTER TABLE working_hours ALTER COLUMN barber_id SET NOT NULL`;
      console.log('✓ Set working_hours.barber_id NOT NULL');
    } catch (e) {
      console.log('  working_hours.barber_id already NOT NULL');
    }

    try {
      await sql`
        ALTER TABLE working_hours 
        ADD CONSTRAINT fk_working_hours_barber 
        FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
      `;
      console.log('✓ Added foreign key working_hours -> barbers');
    } catch (e) {
      console.log('  Foreign key working_hours -> barbers already exists');
    }

    try {
      await sql`
        ALTER TABLE working_hours 
        ADD CONSTRAINT working_hours_barber_weekday_key 
        UNIQUE (barber_id, weekday)
      `;
      console.log('✓ Added unique constraint working_hours(barber_id, weekday)');
    } catch (e) {
      console.log('  Unique constraint working_hours(barber_id, weekday) already exists');
    }

    try {
      await sql`ALTER TABLE blocked_slots ALTER COLUMN barber_id SET NOT NULL`;
      console.log('✓ Set blocked_slots.barber_id NOT NULL');
    } catch (e) {
      console.log('  blocked_slots.barber_id already NOT NULL');
    }

    try {
      await sql`
        ALTER TABLE blocked_slots 
        ADD CONSTRAINT fk_blocked_slots_barber 
        FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
      `;
      console.log('✓ Added foreign key blocked_slots -> barbers');
    } catch (e) {
      console.log('  Foreign key blocked_slots -> barbers already exists');
    }

    try {
      await sql`ALTER TABLE appointments ALTER COLUMN barber_id SET NOT NULL`;
      console.log('✓ Set appointments.barber_id NOT NULL');
    } catch (e) {
      console.log('  appointments.barber_id already NOT NULL');
    }

    try {
      await sql`
        ALTER TABLE appointments 
        ADD CONSTRAINT fk_appointments_barber 
        FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE RESTRICT
      `;
      console.log('✓ Added foreign key appointments -> barbers');
    } catch (e) {
      console.log('  Foreign key appointments -> barbers already exists');
    }

    // Create customer user records for existing appointments
    const customers = await sql`
      SELECT DISTINCT customer_telegram_id, customer_name, customer_phone
      FROM appointments
      WHERE customer_telegram_id NOT IN (SELECT telegram_id FROM users)
    ` as any[];

    if (customers.length > 0) {
      console.log(`Creating ${customers.length} customer user records...`);
      for (const customer of customers) {
        await sql`
          INSERT INTO users (telegram_id, role, name, phone, is_active)
          VALUES (
            ${customer.customer_telegram_id}, 
            'customer', 
            ${customer.customer_name}, 
            ${customer.customer_phone},
            true
          )
          ON CONFLICT (telegram_id) DO NOTHING
        `;
      }
      console.log('✓ Customer user records created');
    }

    console.log('✓ Data migration completed successfully');
  } catch (error) {
    console.error('✗ Data migration failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

migrateData();
