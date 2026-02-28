import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protect all /admin routes except the login page and access-denied
    if (pathname.startsWith('/admin') &&
        pathname !== '/admin' &&
        pathname !== '/admin/access-denied') {

        // Coarse check: Does any supabase auth cookie exist?
        // Supabase auth cookies typically start with 'sb-'
        const hasSession = request.cookies.getAll().some(cookie => cookie.name.startsWith('sb-'));

        if (!hasSession) {
            // Redirect to admin login if no session is detected at all
            const url = request.nextUrl.clone();
            url.pathname = '/admin';
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
