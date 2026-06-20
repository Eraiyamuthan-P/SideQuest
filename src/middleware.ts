import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Protected paths requiring active session
  const protectedPaths = ['/settings', '/chat', '/support', '/leaderboard'];
  const isProtected = 
    protectedPaths.some(path => pathname.startsWith(path)) || 
    pathname.startsWith('/tasks/'); // protect details/creation

  // If path is protected and no token, redirect to login
  if (isProtected && !token && !pathname.endsWith('/new')) {
    // Note: let /tasks/new be protected, let's check
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }
  
  if (pathname === '/tasks/new' && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|uploads).*)'],
};
