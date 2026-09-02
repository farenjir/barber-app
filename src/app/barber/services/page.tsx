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
import { Scissors, Clock, DollarSign, X, Plus } from 'lucide-react';

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
  
  const services = await sql`
    SELECT * FROM services 
    WHERE barber_id = ${barberId}
    ORDER BY is_active DESC, name ASC
  ` as any[];
  
  let editService = null;
  if (searchParams.edit) {
    const editId = parseInt(searchParams.edit);
    editService = services.find((s: any) => s.id === editId);
  }
  
  const createAction = createService.bind(null, barberId as any) as any;
  const updateAction = updateService.bind(null, barberId as any) as any;
  const toggleAction = toggleService.bind(null, barberId as any) as any;

  return (
    <AppShell
      userName={user.name}
      userRole="barber"
      barberName={barber[0].display_name}
      pageTitle="مدیریت خدمات"
    >
      {(searchParams.add || editService) && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {editService ? 'ویرایش خدمت' : 'افزودن خدمت جدید'}
              </CardTitle>
              <Link href="/barber/services">
                <Button variant="ghost" size="icon">
                  <X className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <form action={editService ? updateAction : createAction} className="space-y-4">
              {editService && (
                <input type="hidden" name="id" value={editService.id} />
              )}
              
              <div>
                <Label htmlFor="name">نام خدمت</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue={editService?.name}
                  placeholder="مثال: اصلاح مو"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">مدت زمان (دقیقه)</Label>
                  <Input
                    type="number"
                    id="duration"
                    name="duration"
                    defaultValue={editService?.duration_minutes}
                    placeholder="45"
                    min="1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="price">قیمت (تومان)</Label>
                  <Input
                    type="number"
                    id="price"
                    name="price"
                    defaultValue={editService?.price_toman}
                    placeholder="350000"
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full">
                {editService ? 'ذخیره تغییرات' : 'افزودن خدمت'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>لیست خدمات</CardTitle>
            <Link href="/barber/services?add=1">
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                افزودن خدمت جدید
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-12">
              <Scissors className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">هنوز خدمتی اضافه نکرده‌اید</p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((service: any) => (
                <div key={service.id} className="border border-border rounded-lg p-4 flex justify-between items-start hover:bg-accent/10 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-foreground">{service.name}</h3>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {service.duration_minutes} دقیقه
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {service.price_toman.toLocaleString('fa-IR')} تومان
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={service.is_active ? 'success' : 'outline'}>
                      {service.is_active ? 'فعال' : 'غیرفعال'}
                    </Badge>
                    
                    <Link href={`/barber/services?edit=${service.id}`}>
                      <Button variant="ghost" size="sm">
                        ویرایش
                      </Button>
                    </Link>
                    
                    <form action={toggleAction} className="inline">
                      <input type="hidden" name="id" value={service.id} />
                      <input type="hidden" name="current_status" value={service.is_active.toString()} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        {service.is_active ? 'غیرفعال' : 'فعال'}
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
