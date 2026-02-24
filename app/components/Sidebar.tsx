'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions/auth';

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Beneficiarios', href: '/dashboard/beneficiaries', icon: '👥' },
    { name: 'Grupos', href: '/dashboard/groups', icon: '📑' },
    { name: 'Jornada de Servicio', href: '/dashboard/service', icon: '🎁' },
    { name: 'Reportes', href: '/dashboard/reports', icon: '📊' },
    { name: 'Importar Datos', href: '/dashboard/import', icon: '📥' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-white/90 backdrop-blur-md border-r border-border h-screen fixed left-0 top-0 z-10 shadow-lg hidden md:flex flex-col">
            <div className="p-6 flex flex-col items-center border-b border-border/50 text-center">
                <div className="w-52 h-52 relative mb-4">
                    <Image
                        src="/logo.png"
                        alt="Escudo Milagrosa"
                        fill
                        className="object-contain drop-shadow-md"
                    />
                </div>
                <h1 className="text-lg font-bold text-primary tracking-tight leading-tight">
                    Parroquia Nuestra Señora de la Medalla Milagrosa
                </h1>
                <p className="text-sm text-muted-foreground mt-1">El Limón</p>
                <h2 className="text-xl font-bold text-secondary mt-2 mb-1">Cáritas Parroquial</h2>
                <div className="mt-2 pt-3 border-t border-border/40 w-full">
                    <p className="text-xs font-semibold text-primary/80">Pbro. Jim Alexander Gil</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Director</p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive
                                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:pl-5'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border/50">
                <div className="bg-gradient-to-br from-secondary/10 to-primary/5 p-4 rounded-xl border border-secondary/20 mb-3">
                    <p className="text-xs text-muted-foreground text-center">
                        "La caridad es el amor en acción"
                    </p>
                </div>

                <form action={logout}>
                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors border border-transparent hover:border-red-100"
                    >
                        <span>🚪</span>
                        <span>Cerrar Sesión</span>
                    </button>
                </form>
            </div>
        </aside>
    );
}
