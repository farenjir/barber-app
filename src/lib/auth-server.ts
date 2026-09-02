import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from './auth';
import type { User } from '@/db/client';

/**
 * Get the authenticated user from the session cookie
 * This runs in Node.js runtime (server components/actions)
 * Returns the user or redirects to login if not authenticated
 */
export async function getAuthUser(): Promise<User> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
    redirect('/login');
  }

  const user = await verifySession(sessionToken);

  if (!user) {
    // Invalid or expired session - clear cookie and redirect
    cookieStore.delete('session');
    redirect('/login');
  }

  return user;
}

/**
 * Get the authenticated user and verify they have the required role
 */
export async function requireRole(allowedRoles: Array<'customer' | 'barber' | 'super_admin'>): Promise<User> {
  const user = await getAuthUser();

  if (!allowedRoles.includes(user.role)) {
    redirect('/login');
  }

  return user;
}

/**
 * Get the authenticated barber user
 */
export async function requireBarber(): Promise<User> {
  return requireRole(['barber', 'super_admin']);
}

/**
 * Get the authenticated admin user
 */
export async function requireAdmin(): Promise<User> {
  return requireRole(['super_admin']);
}
