import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Google returns to NEXTAUTH_URL. Keep the browser on that same host so
  // NextAuth's short-lived OAuth state cookie is sent on the callback.
  if (process.env.NODE_ENV === 'development' && request.nextUrl.hostname === '127.0.0.1') {
    const canonical = request.nextUrl.clone();
    canonical.hostname = 'localhost';
    return NextResponse.redirect(canonical);
  }
  return NextResponse.next();
}
