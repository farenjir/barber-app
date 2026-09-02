'use client';

import { useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Check } from 'lucide-react';

export default function BarberBookClient({
  user,
  barberName,
  services,
  days,
  availableSlots,
  searchParams,
}: any) {
  useEffect(() => {
    const form = document.getElementById('booking-form') as HTMLFormElement;
    if (!form) return;

    const serviceSelect = form.querySelector('[name="service"]') as HTMLSelectElement;
    const dateSelect = form.querySelector('[name="date"]') as HTMLSelectElement;

    const handleChange = () => {
      const service = serviceSelect.value;
      const date = dateSelect.value;
      if (service && date) {
        window.location.href = `/barber/book?service=${service}&date=${date}`;
      }
    };

    serviceSelect?.addEventListener('change', handleChange);
    dateSelect?.addEventListener('change', handleChange);

    return () => {
      serviceSelect?.removeEventListener('change', handleChange);
      dateSelect?.removeEventListener('change', handleChange);
    };
  }, []);

  return (
    <AppShell
      userName={user.name}
      userRole="barber"
      barberName={barberName}
      pageTitle="رزرو دستی نوبت"
    >
      {searchParams.success && (
        <div className="mb-6 p-4 bg-green-600/10 border border-green-600/20 rounded-lg text-green-600 flex items-center gap-2">
          <Check className="w-5 h-5" />
          نوبت با موفقیت ثبت شد
        </div>
      )}
      
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-6 h-6" />
              ثبت نوبت جدید
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form id="booking-form" action="/api/barber/book" method="POST" className="space-y-4">
              <div>
                <Label htmlFor="service">خدمت</Label>
                <select
                  id="service"
                  name="service"
                  required
                  className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                  defaultValue={searchParams.service || ''}
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
                <Label htmlFor="date">تاریخ</Label>
                <select
                  id="date"
                  name="date"
                  required
                  className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                  defaultValue={searchParams.date || ''}
                >
                  <option value="">انتخاب کنید...</option>
                  {days.map((day: any) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {availableSlots.length > 0 && (
                <div>
                  <Label htmlFor="datetime">ساعت ({availableSlots.length} زمان آزاد)</Label>
                  <select
                    id="datetime"
                    name="datetime"
                    required
                    className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="">انتخاب کنید...</option>
                    {availableSlots.map((slot: any) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <Label htmlFor="name">نام مشتری</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="نام و نام خانوادگی"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">شماره تلفن</Label>
                <Input
                  type="tel"
                  id="phone"
                  name="phone"
                  pattern="09[0-9]{9}"
                  placeholder="09123456789"
                  required
                />
              </div>
              
              <Button
                type="submit"
                disabled={!searchParams.service || !searchParams.date || availableSlots.length === 0}
                className="w-full"
                size="lg"
              >
                ثبت نوبت
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
