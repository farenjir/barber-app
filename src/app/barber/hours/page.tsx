import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Check } from 'lucide-react';

export const dynamic = 'force-dynamic';

const WEEKDAYS = [
  { value: 6, label: 'شنبه' },
  { value: 0, label: 'یکشنبه' },
  { value: 1, label: 'دوشنبه' },
  { value: 2, label: 'سه‌شنبه' },
  { value: 3, label: 'چهارشنبه' },
  { value: 4, label: 'پنج‌شنبه' },
  { value: 5, label: 'جمعه' },
];

async function updateWorkingHours(formData: FormData, barberId: number) {
  'use server';
  
  for (const day of WEEKDAYS) {
    const isOpen = formData.get(`is_open_${day.value}`) === 'on';
    const startTime = formData.get(`start_${day.value}`) as string;
    const endTime = formData.get(`end_${day.value}`) as string;
    
    await sql`
      INSERT INTO working_hours (barber_id, weekday, start_time, end_time, is_open)
      VALUES (${barberId}, ${day.value}, ${startTime}, ${endTime}, ${isOpen})
      ON CONFLICT (barber_id, weekday)
      DO UPDATE SET 
        start_time = ${startTime},
        end_time = ${endTime},
        is_open = ${isOpen},
        updated_at = NOW()
    `;
  }
  
  redirect('/barber/hours?saved=1');
}

export default async function BarberHours({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const user = await requireBarber();
  
  const barber = await sql`
    SELECT id, display_name FROM barbers WHERE user_id = ${user.id}
  ` as any[];
  
  if (barber.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg text-center">
          <p className="text-destructive">شما به عنوان آرایشگر ثبت نشده‌اید.</p>
        </div>
      </div>
    );
  }
  
  const barberId = barber[0].id;
  
  const workingHours = await sql`
    SELECT * FROM working_hours WHERE barber_id = ${barberId} ORDER BY weekday
  ` as any[];
  
  const hoursMap = new Map(workingHours.map((h: any) => [h.weekday, h]));

  const updateHoursAction = updateWorkingHours.bind(null, barberId as any) as any;

  return (
    <AppShell
      userName={user.name}
      userRole="barber"
      barberName={barber[0].display_name}
      pageTitle="ساعات کاری"
    >
      {searchParams.saved && (
        <div className="mb-6 p-4 bg-green-600/10 border border-green-600/20 rounded-lg text-green-600 flex items-center gap-2">
          <Check className="w-5 h-5" />
          ساعات کاری با موفقیت ذخیره شد
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>تنظیم ساعات کاری</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-accent/20 border border-accent/30 rounded-lg text-sm">
            <strong>توجه:</strong> این پلتفرم برای آرایشگران مستقل است. هر آرایشگر روز تعطیل و ساعات کاری خودش را مشخص می‌کند.
          </div>
          
          <form action={updateHoursAction} className="space-y-4">
            {WEEKDAYS.map((day) => {
              const hours = hoursMap.get(day.value);
              const isOpen = hours?.is_open ?? true;
              const startTime = hours?.start_time ?? '10:00';
              const endTime = hours?.end_time ?? '21:00';
              
              return (
                <div key={day.value} className="border border-border rounded-lg p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name={`is_open_${day.value}`}
                        defaultChecked={isOpen}
                        className="w-5 h-5 accent-primary"
                      />
                      <span className="font-semibold text-lg">{day.label}</span>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`start_${day.value}`}>ساعت شروع</Label>
                      <Input
                        type="time"
                        id={`start_${day.value}`}
                        name={`start_${day.value}`}
                        defaultValue={startTime}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`end_${day.value}`}>ساعت پایان</Label>
                      <Input
                        type="time"
                        id={`end_${day.value}`}
                        name={`end_${day.value}`}
                        defaultValue={endTime}
                        required
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            
            <Button type="submit" className="w-full" size="lg">
              <Clock className="w-4 h-4 ml-2" />
              ذخیره ساعات کاری
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
