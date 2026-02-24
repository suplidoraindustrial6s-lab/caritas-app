'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { authenticate } from '@/app/actions/auth';
import Image from 'next/image';

export default function LoginForm() {
    const [errorMessage, dispatch] = useFormState(authenticate, undefined);

    return (
        <form action={dispatch} className="space-y-4">
            <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 relative mb-2">
                    <Image
                        src="/logo.png"
                        alt="Logo"
                        fill
                        className="object-contain"
                    />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Cáritas Parroquial</h2>
                <p className="text-sm text-slate-500">Iniciar Sesión</p>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="email">
                    Correo Electrónico
                </label>
                <input
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                    id="email"
                    type="email"
                    name="email"
                    placeholder="admin@caritaspq.com"
                    required
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1" htmlFor="password">
                    Contraseña
                </label>
                <input
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                    id="password"
                    type="password"
                    name="password"
                    placeholder="••••••"
                    required
                    minLength={6}
                />
            </div>
            <div className="flex items-end space-x-1" aria-live="polite" aria-atomic="true">
                {errorMessage && (
                    <p className="text-sm text-red-500 font-bold bg-red-50 px-3 py-1 rounded-lg w-full text-center">
                        ⚠️ {errorMessage}
                    </p>
                )}
            </div>
            <LoginButton />
        </form>
    );
}

function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <button
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            aria-disabled={pending}
        >
            {pending ? 'Ingresando...' : 'Ingresar al Sistema'}
        </button>
    );
}
