'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getServiceSchedule2026 } from '@/app/lib/schedule';

export default function SignatureListPage() {
    const searchParams = useSearchParams();
    const groupId = searchParams.get('groupId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const [group, setGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!groupId) {
            setLoading(false);
            return;
        }

        fetch(`/api/groups/${groupId}`)
            .then(res => res.json())
            .then(data => {
                setGroup(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [groupId]);

    if (loading) {
        return <div className="p-8 text-center">Cargando...</div>;
    }

    if (!groupId) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 font-bold">Error: Debe seleccionar un grupo para imprimir.</p>
            </div>
        );
    }

    if (!group || group.error) {
        return <div className="p-8 text-center text-red-500">Grupo no encontrado</div>;
    }

    // Get service schedule for this group
    const fullSchedule = getServiceSchedule2026();
    const groupSchedule = fullSchedule.filter(day => day.groupName === group.name);

    // Obtener 3 meses: mes actual y los 2 siguientes
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const startMonth = month ? parseInt(month) : currentDate.getMonth() + 1; // 1-indexed

    // Generar array de 3 meses consecutivos
    const monthsToShow: Array<{ month: number; year: number }> = [];
    for (let i = 0; i < 3; i++) {
        const monthNum = ((startMonth - 1 + i) % 12) + 1; // Wrap around to next year if needed
        const yearNum = targetYear + Math.floor((startMonth - 1 + i) / 12);
        monthsToShow.push({ month: monthNum, year: yearNum });
    }

    // Filtrar fechas para los 3 meses
    const monthlyDates = groupSchedule.filter(day => {
        const [y, m] = day.date.split('-').map(Number);
        return monthsToShow.some(period => period.year === y && period.month === m);
    });

    if (monthlyDates.length === 0) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 font-bold">
                    No hay fechas programadas para el grupo {group.name}
                </p>
            </div>
        );
    }

    // Helper to format date header - formato más compacto
    const formatDateHeader = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        const day = date.getDate();
        const month = date.getMonth() + 1;
        return `${day}/${month}`;
    };

    // Nombre del rango de meses
    const firstMonth = new Date(monthsToShow[0].year, monthsToShow[0].month - 1).toLocaleDateString('es-VE', { month: 'long' });
    const lastMonth = new Date(monthsToShow[2].year, monthsToShow[2].month - 1).toLocaleDateString('es-VE', { month: 'long' });
    const periodName = `${firstMonth} - ${lastMonth} ${targetYear}`;

    return (
        <div className="bg-white min-h-screen p-3 print:p-2 font-sans text-black">
            {/* Header for Print */}
            <div className="mb-3 border-b-2 border-black pb-2">
                <h1 className="text-center text-base font-bold uppercase">
                    Parroquia Nuestra Señora de la Medalla Milagrosa
                </h1>
                <h2 className="text-center text-sm font-semibold">Cáritas Parroquial</h2>
                <h3 className="text-center text-sm font-bold mt-1">
                    Relación entrega de bolsas de comida - {group.name}
                </h3>
                <p className="text-center text-xs mt-1">{periodName}</p>
            </div>

            {/* Signature Table - Landscape orientation */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                        <tr className="bg-purple-200 print:bg-purple-200">
                            <th className="border border-black px-2 py-1 text-left font-bold sticky left-0 bg-purple-200 z-10 min-w-[140px]">
                                Nombres y Apellidos
                            </th>
                            {monthlyDates.map((day, idx) => (
                                <th
                                    key={idx}
                                    className="border border-black px-1 py-1 text-center font-bold min-w-[45px] text-[11px]"
                                >
                                    {formatDateHeader(day.date)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {group.beneficiaries?.map((beneficiary: any, index: number) => (
                            <tr
                                key={beneficiary.id}
                                className={`break-inside-avoid ${index % 2 === 0 ? 'bg-yellow-100' : 'bg-white'}`}
                            >
                                <td className="border border-black px-2 py-1.5 font-semibold sticky left-0 bg-inherit z-10 text-[11px]">
                                    {beneficiary.fullName}
                                </td>
                                {monthlyDates.map((_, idx) => (
                                    <td
                                        key={idx}
                                        className="border border-black px-1 py-1.5 min-h-[28px]"
                                    >
                                        {/* Empty cell for signature */}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {/* Empty rows for extra beneficiaries */}
                        {Array.from({ length: 2 }).map((_, i) => (
                            <tr key={`empty-${i}`} className="break-inside-avoid bg-white">
                                <td className="border border-black px-2 py-1.5 text-gray-400 sticky left-0 bg-white z-10 text-[11px]">
                                    {/* Empty row */}
                                </td>
                                {monthlyDates.map((_, idx) => (
                                    <td key={idx} className="border border-black px-1 py-1.5"></td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer with signatures */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-center text-[10px] break-inside-avoid">
                <div className="pt-6 border-t border-black mx-2">
                    Coordinador de Grupo
                </div>
                <div className="pt-6 border-t border-black mx-2">
                    Pastoral Social
                </div>
                <div className="pt-6 border-t border-black mx-2">
                    Sello Parroquial
                </div>
            </div>

            {/* Print Button (Hidden when printing) */}
            <div className="fixed bottom-8 right-8 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                    🖨️ Imprimir
                </button>
            </div>
        </div>
    );
}
