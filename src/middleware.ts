import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths (webhooks, API routes, static assets, login)
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname === '/login' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Root path - redirect to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protected paths - require session cookie
  if (pathname.startsWith('/barber') || pathname.startsWith('/admin')) {
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Session cookie exists - let the page verify the actual user and role
    // (Pages will use getAuthUser helper which does the database check)
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
