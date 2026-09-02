import { sql } from './client';

/**
 * Migrate existing data to multi-barber schema
 * This script should be run AFTER the schema migration
 */
async function migrateData() {
  console.log('Migrating existing data to multi-barber schema...');
  
  try {
    // Check if migration is needed (if users table is empty)
    const existingUsers = await sql`SELECT COUNT(*) as count FROM users` as any[];
    const userCount = parseInt(existingUsers[0].count);
    
    if (userCount > 0) {
      console.log('✓ Data already migrated (users table is not empty)');
      return;
    }

    // Get admin IDs from environment
    const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '')
      .split(',')
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    if (adminIds.length === 0) {
      console.log('⚠ No ADMIN_TELEGRAM_IDS found in environment. Skipping admin creation.');
    }

    // Create super admin user from first admin ID (or use a default)
    const firstAdminId = adminIds[0] || 999999999;
    const salonName = process.env.SALON_NAME || 'سالن زیبایی';
    
    console.log(`Creating super admin user with telegram_id: ${firstAdminId}`);
    
    const [adminUser] = await sql`
      INSERT INTO users (telegram_id, role, name, is_active)
      VALUES (${firstAdminId}, 'super_admin', ${`مدیر ${salonName}`}, true)
      ON CONFLICT (telegram_id) DO UPDATE SET role = 'super_admin'
      RETURNING id
    ` as any[];

    console.log(`✓ Super admin user created with id: ${adminUser.id}`);

    // Create a default barber from the salon
    const [defaultBarber] = await sql`
      INSERT INTO users (telegram_id, role, name, is_active)
      VALUES (${firstAdminId + 1}, 'barber', ${salonName}, true)
      ON CONFLICT (telegram_id) DO UPDATE SET name = ${salonName}
      RETURNING id
    ` as any[];

    console.log(`✓ Default barber user created with id: ${defaultBarber.id}`);

    const [barber] = await sql`
      INSERT INTO barbers (user_id, display_name, is_active)
      VALUES (${defaultBarber.id}, ${salonName}, true)
      RETURNING id
    ` as any[];

    const barberId = barber.id;
    console.log(`✓ Barber record created with id: ${barberId}`);

    // Migrate existing services (if any)
    const existingServices = await sql`SELECT * FROM services WHERE barber_id IS NULL` as any[];
    
    if (existingServices.length > 0) {
      console.log(`Migrating ${existingServices.length} services to barber ${barberId}...`);
      await sql`
        UPDATE services 
        SET barber_id = ${barberId} 
        WHERE barber_id IS NULL
      `;
      console.log('✓ Services migrated');
    }

    // Migrate existing working hours (if any)
    const existingHours = await sql`SELECT * FROM working_hours WHERE barber_id IS NULL` as any[];
    
    if (existingHours.length > 0) {
      console.log(`Migrating ${existingHours.length} working hours to barber ${barberId}...`);
      await sql`
        UPDATE working_hours 
        SET barber_id = ${barberId} 
        WHERE barber_id IS NULL
      `;
      console.log('✓ Working hours migrated');
    }

    // Migrate existing blocked slots (if any)
    const existingBlocked = await sql`SELECT * FROM blocked_slots WHERE barber_id IS NULL` as any[];
    
    if (existingBlocked.length > 0) {
      console.log(`Migrating ${existingBlocked.length} blocked slots to barber ${barberId}...`);
      await sql`
        UPDATE blocked_slots 
        SET barber_id = ${barberId} 
        WHERE barber_id IS NULL
      `;
      console.log('✓ Blocked slots migrated');
    }

    // Migrate existing appointments (if any)
    const existingAppointments = await sql`SELECT * FROM appointments WHERE barber_id IS NULL` as any[];
    
    if (existingAppointments.length > 0) {
      console.log(`Migrating ${existingAppointments.length} appointments to barber ${barberId}...`);
      await sql`
        UPDATE appointments 
        SET barber_id = ${barberId} 
        WHERE barber_id IS NULL
      `;
      console.log('✓ Appointments migrated');
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
    process.exit(1);
  }
}

migrateData();
