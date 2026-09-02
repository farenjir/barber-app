import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyMagicLink, createSession } from '@/lib/auth';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    redirect('/login?error=missing');
  }

  const user = await verifyMagicLink(token);

  if (!user) {
    redirect('/login?error=expired');
  }

  const sessionToken = await createSession(user.id);

  const cookieStore = await cookies();
  cookieStore.set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  if (user.role === 'super_admin') {
    redirect('/admin');
  } else if (user.role === 'barber') {
    redirect('/barber');
  } else {
    redirect('/login?error=forbidden');
  }
}
