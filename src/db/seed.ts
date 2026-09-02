import { sql } from './client';

async function seed() {
  console.log('Seeding database with default data...');
  
  try {
    // Get admin IDs and salon name from environment
    const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '')
      .split(',')
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));
    
    const salonName = process.env.SALON_NAME || 'سالن زیبایی';
    
    // Create super admin user (if ADMIN_TELEGRAM_IDS is set)
    let adminUserId: number | null = null;
    if (adminIds.length > 0) {
      const firstAdminId = adminIds[0];
      console.log(`Creating super admin user with telegram_id: ${firstAdminId}`);
      
      const [adminUser] = await sql`
        INSERT INTO users (telegram_id, role, name, is_active)
        VALUES (${firstAdminId}, 'super_admin', ${`مدیر ${salonName}`}, true)
        ON CONFLICT (telegram_id) DO UPDATE SET role = 'super_admin', name = EXCLUDED.name
        RETURNING id
      ` as any[];
      adminUserId = adminUser.id;
      console.log('✓ Super admin user seeded');
    }

    // Create a default barber
    const barberTelegramId = adminIds.length > 0 ? adminIds[0] + 1 : 888888888;
    const [barberUser] = await sql`
      INSERT INTO users (telegram_id, role, name, is_active)
      VALUES (${barberTelegramId}, 'barber', ${salonName}, true)
      ON CONFLICT (telegram_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    ` as any[];
    console.log('✓ Default barber user seeded');

    const [barber] = await sql`
      INSERT INTO barbers (user_id, display_name, is_active)
      VALUES (${barberUser.id}, ${salonName}, true)
      ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name
      RETURNING id
    ` as any[];
    const barberId = barber.id;
    console.log('✓ Barber record seeded');

    // Seed services for the default barber
    const services = [
      { name: 'اصلاح مو', duration_minutes: 45, price_toman: 350000 },
      { name: 'اصلاح ریش', duration_minutes: 20, price_toman: 150000 },
      { name: 'رنگ مو', duration_minutes: 90, price_toman: 1200000 },
      { name: 'اصلاح ابرو', duration_minutes: 15, price_toman: 200000 },
    ];

    for (const service of services) {
      await sql`
        INSERT INTO services (barber_id, name, duration_minutes, price_toman)
        VALUES (${barberId}, ${service.name}, ${service.duration_minutes}, ${service.price_toman})
        ON CONFLICT DO NOTHING
      `;
    }
    console.log('✓ Services seeded');

    // Seed working hours for the default barber
    // Saturday=6, Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5
    const workingHours = [
      { weekday: 0, start_time: '10:00', end_time: '21:00', is_open: true },  // Sunday
      { weekday: 1, start_time: '10:00', end_time: '21:00', is_open: true },  // Monday
      { weekday: 2, start_time: '10:00', end_time: '21:00', is_open: true },  // Tuesday
      { weekday: 3, start_time: '10:00', end_time: '21:00', is_open: true },  // Wednesday
      { weekday: 4, start_time: '10:00', end_time: '21:00', is_open: true },  // Thursday
      { weekday: 5, start_time: '10:00', end_time: '21:00', is_open: false }, // Friday (closed)
      { weekday: 6, start_time: '10:00', end_time: '21:00', is_open: true },  // Saturday
    ];

    for (const hours of workingHours) {
      await sql`
        INSERT INTO working_hours (barber_id, weekday, start_time, end_time, is_open)
        VALUES (${barberId}, ${hours.weekday}, ${hours.start_time}, ${hours.end_time}, ${hours.is_open})
        ON CONFLICT (barber_id, weekday) DO NOTHING
      `;
    }
    console.log('✓ Working hours seeded');

    console.log('✓ Database seeding completed successfully');
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
