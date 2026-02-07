'use client';

import { useState } from 'react';
import { getServiceSchedule2026, ServiceDay, HOLIDAYS_2026 } from '@/app/lib/schedule';

const DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function SidebarCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)); // Start Feb 2026
    const schedule = getServiceSchedule2026();

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    return (
        <div className="mx-4 mb-4 bg-white/50 rounded-xl p-3 border border-border/50 text-xs shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <button onClick={prevMonth} className="p-1 hover:bg-slate-200 rounded">&lt;</button>
                <span className="font-bold text-slate-700">{MONTHS[month]} {year}</span>
                <button onClick={nextMonth} className="p-1 hover:bg-slate-200 rounded">&gt;</button>
            </div>
            <div className="grid grid-cols-7 text-center mb-1 text-slate-400 font-semibold" style={{ fontSize: '0.65rem' }}>
                {DAYS.map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const event = schedule.find(s => s.date === dateStr);
                    const isHoliday = HOLIDAYS_2026.includes(dateStr);

                    let bgClass = "hover:bg-slate-100 text-slate-600";
                    if (isHoliday) {
                        bgClass = "bg-amber-100 text-amber-700 font-bold border border-amber-200";
                    } else if (event) {
                        if (event.groupName === 'Fe') bgClass = "bg-blue-100 text-blue-700 font-bold border border-blue-200";
                        if (event.groupName === 'Esperanza') bgClass = "bg-green-100 text-green-700 font-bold border border-green-200";
                        if (event.groupName === 'Caridad') bgClass = "bg-pink-100 text-pink-700 font-bold border border-pink-200";
                        if (event.groupName === 'Amor') bgClass = "bg-red-100 text-red-700 font-bold border border-red-200";
                    }

                    return (
                        <div
                            key={day}
                            className={`h-6 w-6 flex items-center justify-center rounded-full cursor-pointer transition-colors ${bgClass}`}
                            title={isHoliday ? 'Feriado Nacional' : event ? `Jornada: ${event.groupName}` : ''}
                        >
                            {day}
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 justify-center" style={{ fontSize: '0.6rem' }}>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Fe</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div>Esp</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-pink-500"></div>Car</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div>Amr</div>
            </div>
        </div>
    );
}
