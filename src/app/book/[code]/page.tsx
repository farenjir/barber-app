import { notFound, redirect } from 'next/navigation';
import { sql } from '@/db/client';
import { getBarberByCode } from '@/lib/auth';
import BookingClient from './client';

export const dynamic = 'force-dynamic';

async function getBarberWithServices(code: string) {
  const barber = await getBarberByCode(code);
  
  if (!barber) {
    return null;
  }
  
  const services = await sql`
    SELECT * FROM services 
    WHERE barber_id = ${barber.id} AND is_active = true 
    ORDER BY name
  ` as any[];
  
  if (services.length === 0) {
    return null;
  }
  
  return { barber, services };
}

export default async function BookingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  
  let data;
  try {
    data = await getBarberWithServices(code);
  } catch (error) {
    console.error('Error fetching barber data:', error);
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>خطا</h1>
          <p style={{ marginBottom: '1.5rem', color: '#666' }}>
            خطایی در دریافت اطلاعات رخ داد. لطفاً دوباره تلاش کنید.
          </p>
          <a 
            href="/" 
            style={{ 
              display: 'inline-block', 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#228be6', 
              color: 'white', 
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            بازگشت به صفحه اصلی
          </a>
        </div>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>آرایشگر یافت نشد</h1>
          <p style={{ marginBottom: '1.5rem', color: '#666' }}>
            آرایشگری با این کد یافت نشد یا در حال حاضر فعال نیست.
          </p>
          <a 
            href="/" 
            style={{ 
              display: 'inline-block', 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#228be6', 
              color: 'white', 
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            بازگشت به صفحه اصلی
          </a>
        </div>
      </div>
    );
  }
  
  return <BookingClient barber={data.barber} services={data.services} />;
}
