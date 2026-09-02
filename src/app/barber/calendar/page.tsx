import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import Link from 'next/link';
import { getTehranDayStart, addTehranDays } from '@/lib/tehran-time';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Scissors, CheckCircle, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function getJalaliWeekdayName(date: Date): string {
  const weekday = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tehran' })).getDay();
  const names = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
  return names[weekday];
}

function formatJalaliDateShort(date: Date): string {
  return date.toLocaleDateString('fa-IR', { 
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

async function getWeekAppointments(barberId: number, weekStart: Date) {
  const weekEnd = addTehranDays(weekStart, 7);
  
  return await sql`
    SELECT 
      a.*,
      s.name as service_name,
      s.duration_minutes
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.barber_id = ${barberId}
    AND a.appointment_time >= ${weekStart.toISOString()}
    AND a.appointment_time < ${weekEnd.toISOString()}
    ORDER BY a.appointment_time ASC
  ` as any[];
}

export default async function BarberCalendar({
  searchParams,
}: {
  searchParams: { confirm?: string; cancel?: string };
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

  if (searchParams.confirm) {
    await sql`
      UPDATE appointments 
      SET status = 'confirmed', updated_at = NOW()
      WHERE id = ${parseInt(searchParams.confirm)} AND barber_id = ${barberId}
    `;
  }
  
  if (searchParams.cancel) {
    await sql`
      UPDATE appointments 
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ${parseInt(searchParams.cancel)} AND barber_id = ${barberId}
    `;
  }

  const now = new Date();
  const today = getTehranDayStart(now);
  
  const currentWeekday = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Tehran' })).getDay();
  const daysFromSaturday = currentWeekday === 6 ? 0 : currentWeekday + 1;
  const weekStart = addTehranDays(today, -daysFromSaturday);
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addTehranDays(weekStart, i));
  
  const appointments = await getWeekAppointments(barberId, weekStart);
  
  const appointmentsByDay = new Map<string, any[]>();
  for (const appt of appointments) {
    const apptDate = getTehranDayStart(new Date(appt.appointment_time));
    const dayKey = apptDate.toISOString();
    if (!appointmentsByDay.has(dayKey)) {
      appointmentsByDay.set(dayKey, []);
    }
    appointmentsByDay.get(dayKey)!.push(appt);
  }

  return (
    <AppShell
      userName={user.name}
      userRole="barber"
      barberName={barber[0].display_name}
      pageTitle="تقویم هفتگی"
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            هفته {formatJalaliDateShort(weekStart)} تا {formatJalaliDateShort(addTehranDays(weekStart, 6))}
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {weekDays.map((day) => {
          const dayKey = day.toISOString();
          const dayAppointments = appointmentsByDay.get(dayKey) || [];
          const isToday = day.toISOString() === today.toISOString();
          
          return (
            <Card key={dayKey} className={isToday ? 'border-accent shadow-md' : ''}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{getJalaliWeekdayName(day)}</span>
                  <span className="text-muted-foreground">{formatJalaliDateShort(day)}</span>
                  {isToday && <span className="text-accent text-sm font-semibold">(امروز)</span>}
                </div>
              </CardHeader>
              <CardContent>
                {dayAppointments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">نوبتی وجود ندارد</p>
                ) : (
                  <div className="space-y-3">
                    {dayAppointments.map((appt: any) => {
                      const time = new Date(appt.appointment_time).toLocaleTimeString('fa-IR', {
                        timeZone: 'Asia/Tehran',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      
                      return (
                        <div key={appt.id} className="border border-border rounded-lg p-4 hover:bg-accent/10 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {time} - {appt.service_name}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {appt.customer_name} | {appt.customer_phone}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                ⏱ {appt.duration_minutes} دقیقه
                              </div>
                            </div>
                            <StatusBadge status={appt.status} />
                          </div>
                          
                          {appt.status === 'pending' && (
                            <div className="flex gap-2 mt-3">
                              <Link href={`/barber/calendar?confirm=${appt.id}`} className="flex-1">
                                <Button variant="default" size="sm" className="w-full">
                                  <CheckCircle className="w-4 h-4 ml-2" />
                                  تأیید
                                </Button>
                              </Link>
                              <Link href={`/barber/calendar?cancel=${appt.id}`} className="flex-1">
                                <Button variant="destructive" size="sm" className="w-full">
                                  <XCircle className="w-4 h-4 ml-2" />
                                  لغو
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
