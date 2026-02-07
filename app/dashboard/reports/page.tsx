'use client';

import { useEffect, useState } from 'react';
import { getReportsData } from '@/app/actions/reports';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, LineChart, Line
} from 'recharts';
import { Button } from '@/app/components/ui/Button';

const COLORS = ['#2563EB', '#059669', '#9333EA', '#DC2626', '#8884d8']; // Blue (Fe), Emerald (Esperanza), Purple (Caridad), Red (Amor)
const DEMO_COLORS = ['#2563EB', '#9333EA', '#059669']; // Blue, Purple, Emerald

export default function ReportsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: '',
        end: '' // YYYY-MM-DD
    });

    const fetchData = () => {
        setLoading(true);
        getReportsData(
            dateRange.start || undefined,
            dateRange.end || undefined
        ).then(res => {
            if (res.success) setData(res.data);
            setLoading(false);
        });
    }

    useEffect(() => {
        fetchData();
    }, []); // Initial load

    // Aggregate trends data by month
    const getTrendsData = () => {
        if (!data?.trends) return [];
        const monthlyData: any = {};

        data.trends.forEach((t: any) => {
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[key]) {
                monthlyData[key] = { name: key, food: 0, clothes: 0, medical: 0 };
            }
            if (t.receivedFood) monthlyData[key].food++;
            if (t.receivedMedical) monthlyData[key].medical++;
            monthlyData[key].clothes += t.clothesQuantity;
        });

        return Object.values(monthlyData).sort((a: any, b: any) => a.name.localeCompare(b.name));
    };

    if (loading && !data) return <div className="p-8 text-center">Cargando reportes...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Error al cargar datos</div>;

    const { general, zones, groups, demographics } = data;
    const trendsData = getTrendsData();

    const demographicData = [
        { name: 'Hombres', value: demographics.men },
        { name: 'Mujeres', value: demographics.women },
        { name: 'Niños', value: demographics.children }
    ];

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col gap-6 overflow-hidden p-2">
            {/* Header */}
            <div className="flex-none flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reportes y Estadísticas</h1>
                    <p className="text-slate-500 font-medium">Resumen de impacto social y ayuda humanitaria</p>
                </div>

                {/* Date Filters & Actions */}
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                    <input
                        type="date"
                        className="px-3 py-2 rounded-xl border-none bg-slate-50 text-sm font-medium focus:ring-0 text-slate-600 outline-none"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                    <span className="text-slate-300">-</span>
                    <input
                        type="date"
                        className="px-3 py-2 rounded-xl border-none bg-slate-50 text-sm font-medium focus:ring-0 text-slate-600 outline-none"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-black transition-colors"
                    >
                        {loading ? '...' : 'Filtrar'}
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pb-6 pr-2">

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center text-center hover:scale-105 transition-transform">
                        <div className="text-3xl font-bold text-slate-800">{general.beneficiaries}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Padrón Total</div>
                    </div>
                    <div className="bg-emerald-500 p-5 rounded-3xl shadow-lg shadow-emerald-500/20 text-white flex flex-col justify-center text-center hover:scale-105 transition-transform relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="text-4xl font-bold">{general.attended}</div>
                            <div className="text-xs font-bold opacity-80 uppercase tracking-wider mt-1">Atendidos</div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center text-center hover:scale-105 transition-transform">
                        <div className="text-3xl font-bold text-blue-600">{general.food}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Alimentos</div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center text-center hover:scale-105 transition-transform">
                        <div className="text-3xl font-bold text-pink-600">{general.clothes}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Prendas de ropa</div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center text-center hover:scale-105 transition-transform">
                        <div className="text-3xl font-bold text-amber-600">{general.medical}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Medicinas</div>
                    </div>
                </div>

                {/* Print Section */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-3xl shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">🖨️ Hoja de Control de Asistencia</h3>
                        <p className="text-slate-300 text-sm mt-1">Genere los listados para la recolección de firmas en físico.</p>
                    </div>
                    <div className="flex gap-4 items-center bg-white/10 p-2 rounded-2xl backdrop-blur-sm">
                        <select
                            id="groupSelector"
                            className="px-4 py-2 bg-transparent text-white border-none text-sm font-medium outline-none cursor-pointer"
                            onChange={(e) => {
                                if (e.target.value) {
                                    window.open(`/dashboard/reports/signatures?groupId=${e.target.value}`, '_blank');
                                    e.target.value = "";
                                }
                            }}
                        >
                            <option value="" className="text-slate-900">🖨️ Imprimir Grupo...</option>
                            {groups.map((g: any) => (
                                <option key={g.name} value={g.id || ''} className="text-slate-900">{g.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* DEMOGRAFÍA */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Distribución Demográfica</h3>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={demographicData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, value }: any) => `${name}`}
                                    >
                                        {demographicData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={DEMO_COLORS[index % DEMO_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* TENDENCIAS */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Tendencia de Ayudas</h3>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendsData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="food" name="Alimentos" stroke={COLORS[0]} strokeWidth={3} dot={false} />
                                    <Line type="monotone" dataKey="clothes" name="Ropa" stroke={COLORS[2]} strokeWidth={3} dot={false} />
                                    <Line type="monotone" dataKey="medical" name="Salud" stroke={COLORS[1]} strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* ZONAS */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Zonas de Residencia</h3>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={zones}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name }: any) => name}
                                    >
                                        {zones.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* GRUPOS */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Impacto por Grupo</h3>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={groups}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />

                                    <Bar dataKey="food" name="Alimentos" fill={COLORS[0]} radius={[4, 4, 4, 4]} barSize={20} />
                                    <Bar dataKey="clothesItems" name="Prendas" fill={COLORS[2]} radius={[4, 4, 4, 4]} barSize={20} />
                                    <Bar dataKey="medical" name="Salud" fill={COLORS[1]} radius={[4, 4, 4, 4]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
