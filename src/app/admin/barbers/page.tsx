import { requireAdmin } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { AppShell } from '@/components/MantineAppShell';
import BarbersClient from './client';

export const dynamic = 'force-dynamic';

export default async function AdminBarbers() {
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
      <BarbersClient initialBarbers={barbers} />
    </AppShell>
  );
}
