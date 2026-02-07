'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

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
                <div className="w-40 h-40 relative mb-4">
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
                <div className="mt-3 pt-3 border-t border-border/40 w-full">
                    <p className="text-xs font-semibold text-primary/80">Pbro. Jin Alexander Gil</p>
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
                <div className="bg-gradient-to-br from-secondary/10 to-primary/5 p-4 rounded-xl border border-secondary/20">
                    <p className="text-xs text-muted-foreground text-center">
                        "La caridad es el amor en acción"
                    </p>
                </div>
            </div>
        </aside>
    );
}
