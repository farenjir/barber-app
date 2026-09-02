import { requireAdmin } from '@/lib/auth-server';
import { AppShell } from '@/components/MantineAppShell';
import ErrorsClient from './client';
import { getErrorLogs } from '@/lib/error-logger';

export const dynamic = 'force-dynamic';

export default async function AdminErrors() {
  const user = await requireAdmin();
  const errorLogs = await getErrorLogs(100);

  return (
    <AppShell
      userName={user.name}
      userRole="super_admin"
      pageTitle="خطاها"
    >
      <ErrorsClient errorLogs={errorLogs as any[]} />
    </AppShell>
  );
}
