import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  if (pathname === '/login' || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify session
  const user = await verifySession(sessionToken);

  if (!user) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }

  // Role-based access control
  if (pathname.startsWith('/barber')) {
    if (user.role !== 'barber' && user.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (pathname.startsWith('/admin')) {
    if (user.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Add user info to request headers for pages to use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.id.toString());
  requestHeaders.set('x-user-role', user.role);
  requestHeaders.set('x-user-name', user.name);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
