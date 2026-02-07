'use client';

import { useState, useEffect } from 'react';
import { getSchedule, updateServiceDay } from '@/app/actions/schedule';
import { HOLIDAYS_2026 } from '@/app/lib/schedule';
import { useRouter } from 'next/navigation';
import { Sparkles, Sprout, HeartHandshake, Heart } from 'lucide-react';

const DAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

type ServiceDay = {
    date: Date;
    group?: { id: number, name: string };
    groupId: number | null;
    isHoliday: boolean;
    note: string | null;
};

// Stronger Colors for Calendar Cells
const GROUP_STYLES: Record<string, string> = {
    'Fe': 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20',
    'Esperanza': 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-500/20',
    'Caridad': 'bg-pink-600 text-white border-pink-700 shadow-md shadow-pink-500/20',
    'Amor': 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-500/20',
    'Feriado': 'bg-amber-500 text-white border-amber-600',
    'default': 'bg-white text-slate-700 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
};

const MODAL_COLORS: Record<string, string> = {
    'Fe': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
    'Esperanza': 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
    'Caridad': 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 hover:border-pink-300',
    'Amor': 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300'
};

export default function DashboardCalendar({ groups }: { groups: any[] }) {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<ServiceDay[]>([]);
    const [loading, setLoading] = useState(false);

    // Edit Modal State
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const fetchMonth = async () => {
        setLoading(true);
        try {
            const res = await getSchedule(year, month);
            if (res.success && res.data) {
                // Ensure dates are parsed correctly to local time for comparison or keep as ISO
                setEvents(res.data.map((d: any) => ({
                    ...d,
                    date: new Date(d.date)
                })));
            }
        } catch (error) {
            console.error("Failed to fetch schedule", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMonth();
    }, [year, month]);

    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const handleDayClick = (day: number) => {
        // Create date in local time for visual consistency
        const date = new Date(year, month, day);
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    const handleSaveAssignment = async (groupId: number | null) => {
        if (!selectedDate) return;
        setIsSaving(true);

        // Create a UTC date for the selected day (YYYY-MM-DDT00:00:00.000Z)
        // We constructed selectedDate as local midnight (year, month, day)
        // We want to send an ISO string that corresponds to that calendar date in UTC.
        const utcDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()));

        const note = groupId ? null : 'Manualmente asignado como libre';

        await updateServiceDay(utcDate.toISOString(), groupId, note || undefined);

        await fetchMonth(); // Refresh data
        router.refresh(); // Refresh server components
        setIsModalOpen(false);
        setIsSaving(false);
    };

    // Helper to find valid group for specific day
    const getEventForDay = (day: number) => {
        return events.find(e => {
            const eDate = new Date(e.date);
            // Use UTC methods to avoid timezone shift from server DB (stored as UTC midnight)
            return eDate.getUTCDate() === day &&
                eDate.getUTCMonth() === month &&
                eDate.getUTCFullYear() === year;
        });
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header Moderno */}
            <div className="flex-none px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        📅 Calendario de Servicios
                    </h2>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{MONTHS[month]} {year}</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1.5">
                    <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm text-slate-600 transition-all active:scale-90">&larr;</button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">Hoy</button>
                    <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm text-slate-600 transition-all active:scale-90">&rarr;</button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 p-4 flex flex-col min-h-0 bg-slate-50/50">
                <div className="grid grid-cols-7 mb-3 flex-none">
                    {DAYS.map(d => (
                        <div key={d} className="text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">
                            {d}
                        </div>
                    ))}
                </div>

                <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2 min-h-0">
                    {/* Empty slots */}
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const event = getEventForDay(day);
                        const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                        // Construct date string YYYY-MM-DD manually for holiday check
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isStaticHoliday = HOLIDAYS_2026.includes(dateStr);

                        let styleClass = GROUP_STYLES['default'];
                        let groupName = null;

                        if (event?.isHoliday || isStaticHoliday) {
                            styleClass = GROUP_STYLES['Feriado'];
                            groupName = "FERIADO";
                        } else if (event?.group) {
                            groupName = event.group.name;
                            styleClass = GROUP_STYLES[groupName] || GROUP_STYLES['default'];
                        }

                        // if today and no group assigned, highlight border
                        if (isToday && !event?.group) {
                            styleClass += " ring-2 ring-slate-900 ring-offset-2";
                        }

                        return (
                            <button
                                key={day}
                                onClick={() => handleDayClick(day)}
                                className={`
                                    relative rounded-xl border p-1 flex flex-col items-center justify-between cursor-pointer transition-all hover:scale-105 hover:z-10
                                    ${styleClass}
                                `}
                            >
                                <span className={`text-lg font-bold leading-none mt-1 ${!event?.group && !event?.isHoliday ? 'text-slate-700' : 'text-white'}`}>{day}</span>

                                {groupName && (
                                    <span className="mb-1 text-[10px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded-md bg-black/10 backdrop-blur-sm w-full truncate text-center">
                                        {groupName}
                                    </span>
                                )}

                                {!groupName && isToday && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mb-2"></span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && selectedDate && (
                <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-[2rem] shadow-2xl w-full max-w-sm transform transition-all scale-100">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-900">
                                {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium">Asignar grupo responsable</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {groups.filter(g => g.name !== 'Lista de Espera').map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => handleSaveAssignment(g.id)}
                                    disabled={isSaving}
                                    className={`
                                        p-4 rounded-2xl border-2 transition-all hover:scale-105 flex flex-col items-center gap-2 group
                                        ${MODAL_COLORS[g.name] || 'bg-slate-50 border-slate-200'}
                                    `}
                                >
                                    <span className="text-3xl group-hover:scale-110 transition-transform text-current">
                                        {g.name === 'Fe' && <Sparkles className="w-8 h-8" />}
                                        {g.name === 'Esperanza' && <Sprout className="w-8 h-8" />}
                                        {g.name === 'Caridad' && <HeartHandshake className="w-8 h-8" />}
                                        {g.name === 'Amor' && <Heart className="w-8 h-8" />}
                                    </span>
                                    <span className="font-bold text-sm text-slate-700">{g.name}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => handleSaveAssignment(null)}
                            disabled={isSaving}
                            className="w-full p-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 font-bold text-sm transition-all mb-4"
                        >
                            🚫  Desasignar / Día Libre
                        </button>

                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="w-full py-3 text-slate-400 font-bold hover:text-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Sticky Legend Footer */}
            <div className="flex-none p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 overflow-x-auto gap-4">
                <span className="uppercase tracking-wider opacity-60 flex-none hidden sm:block">Leyenda:</span>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-blue-600 shadow-sm border border-blue-200"></span>
                        <span className="text-slate-700">Fe</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-emerald-600 shadow-sm border border-emerald-200"></span>
                        <span className="text-slate-700">Esperanza</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-pink-600 shadow-sm border border-pink-200"></span>
                        <span className="text-slate-700">Caridad</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-rose-600 shadow-sm border border-rose-200"></span>
                        <span className="text-slate-700">Amor</span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                        <span className="text-slate-700">Feriado</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
