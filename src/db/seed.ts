import { sql } from './client';

async function seed() {
  console.log('Seeding database with default data...');
  
  try {
    // Seed services
    const services = [
      { name: 'اصلاح مو', duration_minutes: 45, price_toman: 350000 },
      { name: 'اصلاح ریش', duration_minutes: 20, price_toman: 150000 },
      { name: 'رنگ مو', duration_minutes: 90, price_toman: 1200000 },
      { name: 'اصلاح ابرو', duration_minutes: 15, price_toman: 200000 },
    ];

    for (const service of services) {
      await sql`
        INSERT INTO services (name, duration_minutes, price_toman)
        VALUES (${service.name}, ${service.duration_minutes}, ${service.price_toman})
        ON CONFLICT DO NOTHING
      `;
    }
    console.log('✓ Services seeded');

    // Seed working hours (Saturday=0 to Friday=5 in Persian calendar, but using standard 0-6)
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
        INSERT INTO working_hours (weekday, start_time, end_time, is_open)
        VALUES (${hours.weekday}, ${hours.start_time}, ${hours.end_time}, ${hours.is_open})
        ON CONFLICT (weekday) DO NOTHING
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
