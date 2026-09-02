import { requireAdmin } from '@/lib/auth-server';
import { sql } from '@/db/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Scissors, Plus, X, Check } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function addBarber(formData: FormData) {
  'use server';
  
  const telegramId = parseInt(formData.get('telegram_id') as string);
  const displayName = formData.get('display_name') as string;
  
  const [user] = await sql`
    INSERT INTO users (telegram_id, role, name, is_active)
    VALUES (${telegramId}, 'barber', ${displayName}, true)
    ON CONFLICT (telegram_id) DO UPDATE SET role = 'barber', name = ${displayName}
    RETURNING id
  ` as any[];
  
  await sql`
    INSERT INTO barbers (user_id, display_name, is_active)
    VALUES (${user.id}, ${displayName}, true)
    ON CONFLICT (user_id) DO UPDATE SET display_name = ${displayName}
  `;
  
  const firstBarber = await sql`
    SELECT id FROM barbers WHERE id != (SELECT id FROM barbers WHERE user_id = ${user.id}) LIMIT 1
  ` as any[];
  
  if (firstBarber.length > 0) {
    const sourceId = firstBarber[0].id;
    const newBarberId = await sql`SELECT id FROM barbers WHERE user_id = ${user.id}` as any[];
    
    await sql`
      INSERT INTO working_hours (barber_id, weekday, start_time, end_time, is_open)
      SELECT ${newBarberId[0].id}, weekday, start_time, end_time, is_open
      FROM working_hours
      WHERE barber_id = ${sourceId}
      ON CONFLICT (barber_id, weekday) DO NOTHING
    `;
  }
  
  redirect('/admin/barbers?added=1');
}

async function toggleBarber(formData: FormData) {
  'use server';
  
  const barberId = parseInt(formData.get('barber_id') as string);
  const currentStatus = formData.get('current_status') === 'true';
  
  await sql`
    UPDATE barbers
    SET is_active = ${!currentStatus}
    WHERE id = ${barberId}
  `;
  
  await sql`
    UPDATE users
    SET is_active = ${!currentStatus}
    WHERE id = (SELECT user_id FROM barbers WHERE id = ${barberId})
  `;
  
  redirect('/admin/barbers');
}

export default async function AdminBarbers({
  searchParams,
}: {
  searchParams: { add?: string; added?: string };
}) {
  const user = await requireAdmin();
  
  const barbers = await sql`
    SELECT b.*, u.name as user_name, u.telegram_id, u.is_active as user_active
    FROM barbers b
    JOIN users u ON b.user_id = u.id
    ORDER BY b.is_active DESC, b.display_name ASC
  ` as any[];

  return (
    <AppShell
      userName={user.name}
      userRole="super_admin"
      pageTitle="مدیریت آرایشگران"
    >
      {searchParams.added && (
        <div className="mb-6 p-4 bg-green-600/10 border border-green-600/20 rounded-lg text-green-600 flex items-center gap-2">
          <Check className="w-5 h-5" />
          آرایشگر با موفقیت اضافه شد
        </div>
      )}
      
      {searchParams.add && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>افزودن آرایشگر جدید</CardTitle>
              <Link href="/admin/barbers">
                <Button variant="ghost" size="icon">
                  <X className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <form action={addBarber} className="space-y-4">
              <div>
                <Label htmlFor="telegram_id">Telegram ID</Label>
                <Input
                  type="number"
                  id="telegram_id"
                  name="telegram_id"
                  placeholder="123456789"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  آیدی عددی تلگرام آرایشگر (با ارسال /start به @userinfobot قابل دریافت است)
                </p>
              </div>
              
              <div>
                <Label htmlFor="display_name">نام نمایشی</Label>
                <Input
                  type="text"
                  id="display_name"
                  name="display_name"
                  placeholder="نام آرایشگر"
                  required
                />
              </div>
              
              <div className="bg-accent/20 border border-accent/30 rounded-lg p-3 text-sm">
                <strong>توجه:</strong> ساعات کاری پیش‌فرض از آرایشگر دیگری کپی می‌شود.
              </div>
              
              <Button type="submit" className="w-full">
                افزودن آرایشگر
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>لیست آرایشگران ({barbers.length})</CardTitle>
            <Link href="/admin/barbers?add=1">
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                افزودن آرایشگر
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {barbers.length === 0 ? (
            <div className="text-center py-12">
              <Scissors className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">آرایشگری یافت نشد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {barbers.map((barber: any) => (
                <div key={barber.id} className="border border-border rounded-lg p-4 flex justify-between items-center hover:bg-accent/10 transition-colors">
                  <div>
                    <h3 className="font-semibold text-foreground">{barber.display_name}</h3>
                    <p className="text-sm text-muted-foreground">کاربر: {barber.user_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Telegram ID: {barber.telegram_id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={barber.is_active && barber.user_active ? 'success' : 'outline'}>
                      {barber.is_active && barber.user_active ? 'فعال' : 'غیرفعال'}
                    </Badge>
                    
                    <form action={toggleBarber} className="inline">
                      <input type="hidden" name="barber_id" value={barber.id} />
                      <input type="hidden" name="current_status" value={(barber.is_active && barber.user_active).toString()} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        {barber.is_active && barber.user_active ? 'غیرفعال' : 'فعال'}
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
