import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/research', '/videos', '/trades', '/ticker', '/indices', '/calendar', '/notifications', '/profile', '/chat'];

// Check if the request is from a search engine crawler
function isSearchEngineCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return (
    ua.includes('googlebot') ||
    ua.includes('bingbot') ||
    ua.includes('slurp') || // Yahoo
    ua.includes('duckduckbot') ||
    ua.includes('baiduspider') ||
    ua.includes('yandexbot') ||
    ua.includes('sogou') ||
    ua.includes('exabot') ||
    ua.includes('facebot') ||
    ua.includes('ia_archiver') ||
    ua.includes('facebookexternalhit') || // Facebook crawler
    ua.includes('twitterbot') || // Twitter crawler
    ua.includes('linkedinbot') || // LinkedIn crawler
    ua.includes('whatsapp') || // WhatsApp link preview
    ua.includes('discordbot') || // Discord link preview
    ua.includes('slackbot') // Slack link preview
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const userAgent = request.headers.get('user-agent') || '';
  const sessionToken = request.cookies.get('session_token')?.value;
  const isAuthenticated = !!sessionToken;

  // Protected routes: require login to view (research, videos, jungle tabs, etc.)
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isCrawler = isSearchEngineCrawler(userAgent);

  // Redirect unauthenticated users to login so they can sign in or create an account
  if (isProtectedRoute && !isAuthenticated && !isCrawler) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Force HTTPS and www in production (after auth check so one redirect for guests)
  const canonicalHost = 'www.primatetrading.com';
  const isProduction = hostname.includes('primatetrading.com');
  if (isProduction) {
    const needsRedirect =
      request.nextUrl.protocol !== 'https:' ||
      !hostname.startsWith('www.');
    if (needsRedirect) {
      url.protocol = 'https:';
      url.hostname = canonicalHost;
      return NextResponse.redirect(url, 301);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

