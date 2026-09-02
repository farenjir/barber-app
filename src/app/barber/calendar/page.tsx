import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function BarberCalendar() {
  const headersList = await headers();
  const userName = headersList.get('x-user-name') || '';

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">تقویم نوبت‌ها</h1>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-center">تقویم نوبت‌ها - در حال توسعه</p>
        </div>
      </div>
    </div>
  );
}
