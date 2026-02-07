'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Link from 'next/link';
import Image from 'next/image';
import { updateBeneficiaryStatus, deleteBeneficiary } from '@/app/actions/beneficiaries';

interface Beneficiary {
    id: number;
    fullName: string;
    nationalId: string;
    photoUrl?: string | null;
    status?: string;
    group?: { name: string } | null;
    hasChildren: boolean;
    attendances?: { date: Date }[];
}

const VIEW_MODES = [
    { id: 'list', icon: '📝', label: 'Lista' },
    { id: 'grid', icon: '🪪', label: 'Tarjetas' },
    { id: 'compact', icon: '📄', label: 'Detalles' },
];

export default function BeneficiaryTable({ beneficiaries }: { beneficiaries: Beneficiary[] }) {
    const [viewMode, setViewMode] = useState('list');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleStatusChange = async (id: number, newStatus: string) => {
        await updateBeneficiaryStatus(id, newStatus);
    };

    const handleDelete = async (id: number) => {
        if (confirm('¿Estás seguro de que deseas eliminar este beneficiario? Esta acción no se puede deshacer.')) {
            setIsDeleting(true);
            await deleteBeneficiary(id);
            setIsDeleting(false);
        }
    };

    const getGroupStyles = (name: string | undefined) => {
        switch (name) {
            case 'Fe':
                return {
                    row: "hover:bg-blue-50/50 border-l-4 border-l-blue-500",
                    card: "border-blue-100 shadow-sm hover:shadow-blue-200/50 hover:border-blue-200",
                    header: "bg-blue-50/50 border-b border-blue-50",
                    badge: "bg-blue-100 text-blue-700 border-blue-200",
                    decoration: "bg-blue-500"
                };
            case 'Esperanza':
                return {
                    row: "hover:bg-emerald-50/50 border-l-4 border-l-emerald-500",
                    card: "border-emerald-100 shadow-sm hover:shadow-emerald-200/50 hover:border-emerald-200",
                    header: "bg-emerald-50/50 border-b border-emerald-50",
                    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
                    decoration: "bg-emerald-500"
                };
            case 'Caridad':
                return {
                    row: "hover:bg-purple-50/50 border-l-4 border-l-purple-500",
                    card: "border-purple-100 shadow-sm hover:shadow-purple-200/50 hover:border-purple-200",
                    header: "bg-purple-50/50 border-b border-purple-50",
                    badge: "bg-purple-100 text-purple-700 border-purple-200",
                    decoration: "bg-purple-500"
                };
            case 'Amor':
                return {
                    row: "hover:bg-red-50/50 border-l-4 border-l-red-500",
                    card: "border-red-100 shadow-sm hover:shadow-red-200/50 hover:border-red-200",
                    header: "bg-red-50/50 border-b border-red-50",
                    badge: "bg-red-100 text-red-700 border-red-200",
                    decoration: "bg-red-500"
                };
            default:
                return {
                    row: "hover:bg-slate-50 border-l-4 border-l-slate-200",
                    card: "border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200",
                    header: "bg-slate-50 border-b border-slate-100",
                    badge: "bg-slate-100 text-slate-600 border-slate-200",
                    decoration: "bg-slate-400"
                };
        }
    };

    if (beneficiaries.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <span className="text-4xl">👥</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800">No se encontraron beneficiarios</h3>
                <p className="text-slate-400 mt-2">Intenta ajustar tu búsqueda o crea uno nuevo.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* View Toggle */}
            <div className="flex justify-end">
                <div className="bg-white p-1.5 rounded-2xl border border-slate-100 inline-flex shadow-sm">
                    {VIEW_MODES.map(mode => (
                        <button
                            key={mode.id}
                            onClick={() => setViewMode(mode.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === mode.id
                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <span className="mr-2 opacity-70">{mode.icon}</span>
                            {mode.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div className="space-y-3">
                    {beneficiaries.map((b) => {
                        const styles = getGroupStyles(b.group?.name);
                        return (
                            <div
                                key={b.id}
                                className={`flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-[1.5rem] border transition-all hover:scale-[1.005] relative overflow-hidden bg-white hover:shadow-md
                                    ${styles.card}
                                `}
                            >
                                {/* Indicador lateral */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 md:w-1.5 ${styles.decoration}`}></div>

                                <div className="flex items-center gap-3 md:gap-4 pl-2 md:pl-3 overflow-hidden flex-1">
                                    <div className={`flex-none w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center font-bold text-base md:text-xl bg-white/80 ${styles.badge} shadow-sm backdrop-blur-sm relative overflow-hidden`}>
                                        {b.photoUrl ? (
                                            <Image src={b.photoUrl} alt={b.fullName} fill className="object-cover" />
                                        ) : (
                                            b.fullName.charAt(0)
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className={`text-sm md:text-lg font-bold text-slate-900 truncate`}>{b.fullName}</h4>
                                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-0.5 md:mt-1">
                                            <span className="text-[10px] md:text-sm font-bold font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-md border border-slate-200/50">{b.nationalId}</span>
                                            <span className={`text-[9px] md:text-xs font-bold px-2 py-0.5 rounded-lg border ${styles.badge}`}>
                                                {b.group?.name || 'Sin Grupo'}
                                            </span>
                                            <span className={`hidden md:inline-block text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-lg border ${b.status === 'Activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                {b.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 md:gap-2 pl-2">
                                    <Link href={`/dashboard/beneficiaries/${b.id}`}>
                                        <button className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Editar">
                                            ✏️
                                        </button>
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(b.id)}
                                        className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        title="Eliminar"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* GRID VIEW (CARDS) */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                    {beneficiaries.map((b) => {
                        const styles = getGroupStyles(b.group?.name);
                        // Force colorful background logic
                        let bgClass = "bg-white";
                        if (b.group?.name === 'Fe') bgClass = "bg-blue-50";
                        else if (b.group?.name === 'Esperanza') bgClass = "bg-emerald-50";
                        else if (b.group?.name === 'Caridad') bgClass = "bg-purple-50";
                        else if (b.group?.name === 'Amor') bgClass = "bg-red-50";

                        return (
                            <div key={b.id} className={`rounded-[1.5rem] border transition-all hover:scale-[1.02] relative group overflow-hidden ${styles.card} ${bgClass}`}>
                                {/* Header Colorido - Compacto */}
                                <div className={`px-3 pt-3 flex justify-between items-start`}>
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider bg-white/60 ${styles.badge}`}>
                                        {b.group?.name || 'N/A'}
                                    </span>
                                    <div className="flex gap-1">
                                        <Link href={`/dashboard/beneficiaries/${b.id}`} className="w-6 h-6 flex items-center justify-center bg-white/50 hover:bg-white rounded-full text-xs">✏️</Link>
                                    </div>
                                </div>

                                <div className="p-3 text-center flex flex-col items-center">
                                    <div className="relative w-14 h-14 md:w-20 md:h-20 rounded-2xl overflow-hidden shadow-sm bg-white mb-2 border-2 border-white ring-1 ring-black/5">
                                        {b.photoUrl ? (
                                            <Image src={b.photoUrl} alt={b.fullName} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xl md:text-3xl bg-slate-50">
                                                {b.fullName.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-xs md:text-base leading-tight mb-1 line-clamp-2 min-h-[2.5em]">{b.fullName}</h3>
                                    <p className="text-[10px] text-slate-500 font-mono bg-white/50 px-2 py-0.5 rounded-md">{b.nationalId}</p>
                                </div>

                                <div className="px-3 pb-3 mt-auto">
                                    <div className="pt-2 border-t border-black/5 flex justify-between items-center text-[10px] md:text-xs text-slate-500 font-medium">
                                        <span>Visita:</span>
                                        <span className="text-slate-700 font-bold">{b.attendances?.[0] ? new Date(b.attendances[0].date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : '-'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* COMPACT/DETAILS VIEW */}
            {viewMode === 'compact' && (
                <div className="grid gap-2">
                    {beneficiaries.map((b) => {
                        const styles = getGroupStyles(b.group?.name);
                        let bgClass = "bg-white";
                        if (b.group?.name === 'Fe') bgClass = "bg-blue-50/80";
                        else if (b.group?.name === 'Esperanza') bgClass = "bg-emerald-50/80";
                        else if (b.group?.name === 'Caridad') bgClass = "bg-purple-50/80";
                        else if (b.group?.name === 'Amor') bgClass = "bg-red-50/80";

                        return (
                            <div key={b.id} className={`p-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 hover:shadow-md transition-all relative overflow-hidden ${bgClass}`}>
                                {/* Indicador lateral */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.decoration}`}></div>

                                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white flex-none border border-white shadow-sm">
                                    {b.photoUrl ? (
                                        <Image src={b.photoUrl} alt={b.fullName} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">
                                            {b.fullName.charAt(0)}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-slate-800 truncate text-sm leading-tight">{b.fullName}</h4>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border bg-white/50 ${styles.badge}`}>
                                            {b.group?.name || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 items-center mt-0.5 text-[10px] text-slate-500">
                                        <span className="font-mono bg-white/40 px-1 rounded">{b.nationalId}</span>
                                        <span>•</span>
                                        <span>{b.status}</span>
                                    </div>
                                </div>

                                <div className="flex-none flex gap-1">
                                    <Link href={`/dashboard/beneficiaries/${b.id}`} className="w-7 h-7 flex items-center justify-center bg-white/60 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-colors text-xs">
                                        ✏️
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
