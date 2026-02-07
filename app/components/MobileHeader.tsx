'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileHeader() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
        { name: 'Beneficiarios', href: '/dashboard/beneficiaries', icon: '👥' },
        { name: 'Grupos', href: '/dashboard/groups', icon: '📑' },
        { name: 'Jornada de Servicio', href: '/dashboard/service', icon: '🎁' },
        { name: 'Reportes', href: '/dashboard/reports', icon: '📊' },
        { name: 'Importar Datos', href: '/dashboard/import', icon: '📥' },
    ];

    return (
        <div className="md:hidden bg-white border-b border-border sticky top-0 z-50">
            <div className="flex items-center justify-between p-4 gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative w-12 h-12 flex-none">
                        <img
                            src="/logo.png"
                            alt="Logo Parroquia"
                            className="object-contain w-full h-full drop-shadow-sm"
                        />
                    </div>
                    <div className="flex flex-col min-w-0 leading-tight">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-tight truncate">Parroquia Ntra. Sra. de la Medalla Milagrosa</span>
                        <span className="font-bold text-primary text-base truncate">Cáritas Parroquial</span>
                        <span className="text-[10px] text-slate-500 font-medium truncate">Pbro. Jin Alexander Gil - Director</span>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 rounded-lg hover:bg-muted focus:outline-none flex-none"
                    aria-label="Menu"
                >
                    <span className="text-2xl text-primary">{isOpen ? '✕' : '☰'}</span>
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div className="absolute top-full left-0 w-full bg-white border-b border-border shadow-xl animate-in slide-in-from-top-2">
                    <nav className="flex flex-col p-4 space-y-2 max-h-[80vh] overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                        ? 'bg-primary text-primary-foreground shadow-md'
                                        : 'text-muted-foreground hover:bg-muted'
                                        }`}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            )}
        </div>
    );
}
