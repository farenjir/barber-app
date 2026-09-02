import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function createService(formData: FormData, barberId: number) {
  'use server';
  
  const name = formData.get('name') as string;
  const duration = parseInt(formData.get('duration') as string);
  const price = parseInt(formData.get('price') as string);
  
  await sql`
    INSERT INTO services (barber_id, name, duration_minutes, price_toman, is_active)
    VALUES (${barberId}, ${name}, ${duration}, ${price}, true)
  `;
  
  redirect('/barber/services');
}

async function updateService(formData: FormData, barberId: number) {
  'use server';
  
  const serviceId = parseInt(formData.get('id') as string);
  const name = formData.get('name') as string;
  const duration = parseInt(formData.get('duration') as string);
  const price = parseInt(formData.get('price') as string);
  
  await sql`
    UPDATE services
    SET name = ${name}, duration_minutes = ${duration}, price_toman = ${price}, updated_at = NOW()
    WHERE id = ${serviceId} AND barber_id = ${barberId}
  `;
  
  redirect('/barber/services');
}

async function toggleService(formData: FormData, barberId: number) {
  'use server';
  
  const serviceId = parseInt(formData.get('id') as string);
  const currentStatus = formData.get('current_status') === 'true';
  
  await sql`
    UPDATE services
    SET is_active = ${!currentStatus}, updated_at = NOW()
    WHERE id = ${serviceId} AND barber_id = ${barberId}
  `;
  
  redirect('/barber/services');
}

export default async function BarberServices({
  searchParams,
}: {
  searchParams: { edit?: string; add?: string };
}) {
  const user = await requireBarber();
  
  // Get barber ID
  const barber = await sql`
    SELECT id FROM barbers WHERE user_id = ${user.id}
  ` as any[];
  
  if (barber.length === 0) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600">شما به عنوان آرایشگر ثبت نشده‌اید.</p>
        </div>
      </div>
    );
  }
  
  const barberId = barber[0].id;
  
  const services = await sql`
    SELECT * FROM services 
    WHERE barber_id = ${barberId}
    ORDER BY is_active DESC, name ASC
  ` as any[];
  
  // Get service to edit
  let editService = null;
  if (searchParams.edit) {
    const editId = parseInt(searchParams.edit);
    editService = services.find((s: any) => s.id === editId);
  }
  
  const createAction = createService.bind(null, barberId as any) as any;
  const updateAction = updateService.bind(null, barberId as any) as any;
  const toggleAction = toggleService.bind(null, barberId as any) as any;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">مدیریت خدمات</h1>
          <Link href="/barber" className="text-blue-600 hover:text-blue-800">بازگشت</Link>
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Add/Edit Form */}
        {(searchParams.add || editService) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editService ? 'ویرایش خدمت' : 'افزودن خدمت جدید'}
              </h2>
              <Link href="/barber/services" className="text-gray-600 hover:text-gray-800">
                ✕
              </Link>
            </div>
            
            <form action={editService ? updateAction : createAction}>
              {editService && (
                <input type="hidden" name="id" value={editService.id} />
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">نام خدمت</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editService?.name}
                    required
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="مثال: اصلاح مو"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">مدت زمان (دقیقه)</label>
                    <input
                      type="number"
                      name="duration"
                      defaultValue={editService?.duration_minutes}
                      required
                      min="1"
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="45"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-1">قیمت (تومان)</label>
                    <input
                      type="number"
                      name="price"
                      defaultValue={editService?.price_toman}
                      required
                      min="0"
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="350000"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                >
                  {editService ? 'ذخیره تغییرات' : 'افزودن خدمت'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Services List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">لیست خدمات</h2>
            <Link
              href="/barber/services?add=1"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
            >
              + افزودن خدمت جدید
            </Link>
          </div>
          
          {services.length === 0 ? (
            <p className="text-gray-600 text-center py-8">خدمتی یافت نشد</p>
          ) : (
            <div className="space-y-3">
              {services.map((service: any) => (
                <div key={service.id} className="border rounded-lg p-4 flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{service.name}</h3>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span>⏱ {service.duration_minutes} دقیقه</span>
                      <span>💰 {service.price_toman.toLocaleString('fa-IR')} تومان</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${service.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {service.is_active ? 'فعال' : 'غیرفعال'}
                    </span>
                    
                    <Link
                      href={`/barber/services?edit=${service.id}`}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      ویرایش
                    </Link>
                    
                    <form action={toggleAction} className="inline">
                      <input type="hidden" name="id" value={service.id} />
                      <input type="hidden" name="current_status" value={service.is_active.toString()} />
                      <button
                        type="submit"
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-semibold"
                      >
                        {service.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
