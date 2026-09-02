import { headers } from 'next/headers';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminAppointments() {
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">مدیریت نوبت‌ها</h1>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">بازگشت</Link>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-center">مدیریت نوبت‌ها - در حال توسعه</p>
        </div>
      </div>
    </div>
  );
}
