import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isTasksNew = pathname === '/tasks/new';
  const isProtectedPath = 
    pathname.startsWith('/settings') || 
    pathname.startsWith('/chat') || 
    pathname.startsWith('/support') || 
    pathname.startsWith('/leaderboard') || 
    pathname.startsWith('/tasks');

  // Verify authentication session
  if (!token) {
    if (isAdminRoute || isTasksNew || isProtectedPath) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/auth';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Verify Role-Based Authorization
  if (isAdminRoute) {
    const payload = parseJwt(token);
    const role = payload?.role;
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'MODERATOR') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/settings/:path*',
    '/chat/:path*',
    '/support/:path*',
    '/leaderboard/:path*',
    '/tasks/:path*',
  ],
};
