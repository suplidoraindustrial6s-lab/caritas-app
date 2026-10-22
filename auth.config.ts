import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    trustHost: true,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "ed3c0602f610bb7f4dcdfd100895d3c60234a4a2af48d851755dd976fa2f6389",
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl, headers } }) {
            // Permitir peticiones de Server Actions sin interrupción de middleware
            if (headers.get('next-action')) {
                return true;
            }

            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');

            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirigir a /login
            } else if (isLoggedIn && nextUrl.pathname === '/login') {
                return Response.redirect(new URL('/dashboard', nextUrl));
            }
            return true;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
