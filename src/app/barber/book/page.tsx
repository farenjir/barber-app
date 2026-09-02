import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAvailableSlots } from '@/lib/slots';
import { getTehranDayStart, addTehranDays } from '@/lib/tehran-time';
import { formatFullJalaliDate, formatTime } from '@/lib/jalali';

export const dynamic = 'force-dynamic';

async function createAppointment(formData: FormData, barberId: number) {
  'use server';
  
  const serviceId = parseInt(formData.get('service') as string);
  const dateTime = formData.get('datetime') as string;
  const customerName = formData.get('name') as string;
  const customerPhone = formData.get('phone') as string;
  
  // Get service duration
  const service = await sql`SELECT duration_minutes FROM services WHERE id = ${serviceId}` as any[];
  const duration = service[0].duration_minutes;
  
  // Create appointment as confirmed
  await sql`
    INSERT INTO appointments (
      barber_id, service_id, customer_telegram_id, customer_name, 
      customer_phone, appointment_time, duration_minutes, status
    ) VALUES (
      ${barberId}, ${serviceId}, 0, ${customerName}, 
      ${customerPhone}, ${dateTime}, ${duration}, 'confirmed'
    )
  `;
  
  redirect('/barber/book?success=1');
}

export default async function BarberBook({
  searchParams,
}: {
  searchParams: { success?: string; service?: string; date?: string };
}) {
  const user = await requireBarber();
  
  const barber = await sql`SELECT id FROM barbers WHERE user_id = ${user.id}` as any[];
  if (barber.length === 0) {
    return <div dir="rtl" className="p-4">شما به عنوان آرایشگر ثبت نشده‌اید.</div>;
  }
  
  const barberId = barber[0].id;
  
  // Get services
  const services = await sql`
    SELECT * FROM services 
    WHERE barber_id = ${barberId} AND is_active = true
    ORDER BY name
  ` as any[];
  
  // Generate next 14 days
  const today = getTehranDayStart();
  const days = Array.from({ length: 14 }, (_, i) => addTehranDays(today, i));
  
  // Get available slots if service and date are selected
  let availableSlots: Date[] = [];
  if (searchParams.service && searchParams.date) {
    const service = services.find((s: any) => s.id === parseInt(searchParams.service!));
    if (service) {
      const date = new Date(searchParams.date);
      availableSlots = await getAvailableSlots(barberId, date, service.duration_minutes);
    }
  }
  
  const createAction = createAppointment.bind(null, barberId as any) as any;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">رزرو دستی نوبت</h1>
          <Link href="/barber" className="text-blue-600 hover:text-blue-800">بازگشت</Link>
        </div>
      </header>
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {searchParams.success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded text-green-800">
            ✓ نوبت با موفقیت ثبت شد
          </div>
        )}
        
        <form action={createAction} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <label className="block font-semibold mb-2">خدمت</label>
            <select
              name="service"
              required
              className="w-full px-3 py-2 border rounded"
              onChange={(e) => {
                const form = e.target.form!;
                const service = form.service.value;
                const date = form.date?.value;
                if (service && date) {
                  window.location.href = `/barber/book?service=${service}&date=${date}`;
                }
              }}
              defaultValue={searchParams.service}
            >
              <option value="">انتخاب کنید...</option>
              {services.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_minutes}د - {s.price_toman.toLocaleString('fa-IR')}ت)
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block font-semibold mb-2">تاریخ</label>
            <select
              name="date"
              required
              className="w-full px-3 py-2 border rounded"
              onChange={(e) => {
                const form = e.target.form!;
                const service = form.service.value;
                const date = e.target.value;
                if (service && date) {
                  window.location.href = `/barber/book?service=${service}&date=${date}`;
                }
              }}
              defaultValue={searchParams.date}
            >
              <option value="">انتخاب کنید...</option>
              {days.map((day) => (
                <option key={day.toISOString()} value={day.toISOString()}>
                  {formatFullJalaliDate(day)}
                </option>
              ))}
            </select>
          </div>
          
          {availableSlots.length > 0 && (
            <div>
              <label className="block font-semibold mb-2">ساعت ({availableSlots.length} زمان آزاد)</label>
              <select name="datetime" required className="w-full px-3 py-2 border rounded">
                <option value="">انتخاب کنید...</option>
                {availableSlots.map((slot) => (
                  <option key={slot.toISOString()} value={slot.toISOString()}>
                    {formatTime(slot)}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className="block font-semibold mb-2">نام مشتری</label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-3 py-2 border rounded"
              placeholder="نام و نام خانوادگی"
            />
          </div>
          
          <div>
            <label className="block font-semibold mb-2">شماره تلفن</label>
            <input
              type="tel"
              name="phone"
              required
              pattern="09[0-9]{9}"
              className="w-full px-3 py-2 border rounded"
              placeholder="09123456789"
            />
          </div>
          
          <button
            type="submit"
            disabled={!searchParams.service || !searchParams.date || availableSlots.length === 0}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold disabled:bg-gray-400"
          >
            ثبت نوبت
          </button>
        </form>
      </div>
    </div>
  );
}
