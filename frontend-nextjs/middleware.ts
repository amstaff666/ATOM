import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

// API routes that don't require authentication (free edition)
const publicApiRoutes = [
  '/api/auth',
  '/api/health',
  '/api/documents',
  '/api/hubspot/oauth/start',
  '/api/integrations/hubspot/callback',
  '/api/integrations/zoom/auth/start',
  '/api/integrations/zoom/callback',
  '/api/integrations/salesforce/auth/start',
  '/api/integrations/salesforce/callback',
  '/api/integrations/slack/auth/start',
  '/api/integrations/slack/callback',
];

// Legacy account URLs → home (auth UI removed)
const legacyAccountRedirects: Record<string, string> = {
  '/login': '/',
  '/settings/sessions': '/settings',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const legacyTarget = legacyAccountRedirects[pathname];
  if (legacyTarget) {
    return NextResponse.redirect(new URL(legacyTarget, request.url));
  }

  const isPublicApiRoute = publicApiRoutes.some(route =>
    pathname.startsWith(route)
  );

  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};