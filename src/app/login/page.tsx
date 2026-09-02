import { redirect } from 'next/navigation';
import LoginView from './client';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (token) {
    redirect(`/api/auth/magic?token=${encodeURIComponent(token)}`);
  }

  return <LoginView error={error} />;
}
