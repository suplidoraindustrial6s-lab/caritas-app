'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
    prevState: { success?: boolean; error?: string } | undefined,
    formData: FormData,
) {
    try {
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        await signIn('credentials', {
            email,
            password,
            redirectTo: '/dashboard',
            redirect: false,
        });

        return { success: true };
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return { success: false, error: 'Credenciales inválidas. Verifique correo y contraseña.' };
                default:
                    return { success: false, error: 'Error al iniciar sesión. Intente de nuevo.' };
            }
        }
        // Si por alguna razón es NEXT_REDIRECT, considerarlo éxito
        const errStr = String(error);
        if (errStr.includes('NEXT_REDIRECT')) {
            return { success: true };
        }
        console.error('Error en authenticate:', error);
        return { success: false, error: 'Error de conexión con el servidor.' };
    }
}

export async function logout() {
    await signOut({ redirectTo: '/login' });
}
