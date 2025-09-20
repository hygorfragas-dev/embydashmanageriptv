import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userType = request.cookies.get('userType')?.value || '';

  // Bloqueia qualquer acesso a /dashboard/servidor para user comum
  if (
    userType === 'user' &&
    request.nextUrl.pathname.startsWith('/dashboard/servidor')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Bloqueia qualquer rota fora de /dashboard para user comum
  if (
    userType === 'user' &&
    request.nextUrl.pathname !== '/dashboard'
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|api|static|favicon.ico).*)',
  ],
}; 