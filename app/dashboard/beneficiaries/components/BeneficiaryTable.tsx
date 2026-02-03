'use client';

import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Link from 'next/link';

interface Beneficiary {
    id: number;
    fullName: string;
    nationalId: string;
    group?: { name: string } | null;
    hasChildren: boolean;
}

export default function BeneficiaryTable({ beneficiaries }: { beneficiaries: Beneficiary[] }) {
    if (beneficiaries.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-border">
                <p className="text-muted-foreground">No se encontraron beneficiarios.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                        <tr>
                            <th className="px-6 py-4">Nombre</th>
                            <th className="px-6 py-4">Cédula</th>
                            <th className="px-6 py-4">Grupo</th>
                            <th className="px-6 py-4 text-center">Hijos</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {beneficiaries.map((b) => (
                            <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 font-medium text-foreground">{b.fullName}</td>
                                <td className="px-6 py-4 text-muted-foreground">{b.nationalId}</td>
                                <td className="px-6 py-4">
                                    {b.group ? (
                                        <Badge variant={b.group.name === 'Lista de Espera' ? 'warning' : 'default'}>
                                            {b.group.name}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground italic">Sin grupo</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {b.hasChildren ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link href={`/dashboard/beneficiaries/${b.id}`}>
                                        <Button variant="ghost" size="sm">Ver / Editar</Button>
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
