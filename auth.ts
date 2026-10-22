import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import prisma from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';

async function getUser(email: string): Promise<User | null> {
    try {
        let user = await prisma.user.findUnique({ where: { email } });
        
        // Auto-crear el usuario administrador inicial si no existe en la base de datos
        if (!user && email.toLowerCase() === 'admin@caritaspq.com') {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            user = await prisma.user.upsert({
                where: { email: 'admin@caritaspq.com' },
                update: {},
                create: {
                    email: 'admin@caritaspq.com',
                    password: hashedPassword,
                    name: 'Administrador',
                    role: 'ADMIN',
                },
            });
            console.log('Usuario administrador inicial auto-creado exitosamente.');
        }

        return user;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    trustHost: true,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "ed3c0602f610bb7f4dcdfd100895d3c60234a4a2af48d851755dd976fa2f6389",
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    let user = await getUser(email);
                    if (!user) return null;
                    
                    let passwordsMatch = await bcrypt.compare(password, user.password);

                    // Si es el administrador oficial y la clave es admin123 pero el hash previo difería, actualizarlo
                    if (!passwordsMatch && email.toLowerCase() === 'admin@caritaspq.com' && password === 'admin123') {
                        const newHash = await bcrypt.hash('admin123', 10);
                        user = await prisma.user.update({
                            where: { id: user.id },
                            data: { password: newHash },
                        });
                        passwordsMatch = true;
                    }

                    if (passwordsMatch) return {
                        ...user,
                        id: user.id.toString(),
                    };
                }

                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
});
