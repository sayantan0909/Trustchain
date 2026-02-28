import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Optional: Add backend session validation here if using Firebase Session Cookies.
    // For now, AdminLayout handle client-side protection.

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
