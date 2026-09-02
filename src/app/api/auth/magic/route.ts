import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink, createSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Magic link authentication endpoint
 * GET /api/auth/magic?token=...
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify magic link
  const user = await verifyMagicLink(token);

  if (!user) {
    // Invalid or expired token - redirect to login with error
    return NextResponse.redirect(new URL('/login?error=expired', request.url));
  }

  // Create session
  const sessionToken = await createSession(user.id);

  // Determine redirect destination based on role
  let destination: string;
  if (user.role === 'super_admin') {
    destination = '/admin';
  } else if (user.role === 'barber') {
    destination = '/barber';
  } else {
    // Customers don't have web access
    return NextResponse.redirect(new URL('/login?error=forbidden', request.url));
  }

  // Create redirect response with session cookie
  const response = NextResponse.redirect(new URL(destination, request.url));
  
  response.cookies.set('session', sessionToken, {
    httpOnly: true,
    secure: true, // Always secure in production URLs
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}
