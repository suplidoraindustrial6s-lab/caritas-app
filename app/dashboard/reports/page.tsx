'use client';

import { useEffect, useState } from 'react';
import { getReportsData } from '@/app/actions/reports';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ReportsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getReportsData().then(res => {
            if (res.success) setData(res.data);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="p-8 text-center">Cargando reportes...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Error al cargar datos</div>;

    const { general, zones, groups } = data;

    return (
        <div className="space-y-8 pb-12">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-8 rounded-2xl shadow-xl">
                <h1 className="text-3xl font-bold mb-2">Reportes y Estadísticas</h1>
                <p className="opacity-80">Resumen histórico de atención y distribución de ayuda</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                    <div className="bg-white/10 p-4 rounded-xl text-center backdrop-blur-sm">
                        <div className="text-3xl font-bold">{general.beneficiaries}</div>
                        <div className="text-sm opacity-80">Beneficiarios</div>
                    </div>
                    <div className="bg-white/10 p-4 rounded-xl text-center backdrop-blur-sm">
                        <div className="text-3xl font-bold">{general.food}</div>
                        <div className="text-sm opacity-80">Bolsas Entregadas</div>
                    </div>
                    <div className="bg-white/10 p-4 rounded-xl text-center backdrop-blur-sm">
                        <div className="text-3xl font-bold">{general.clothes}</div>
                        <div className="text-sm opacity-80">Prendas de Ropa</div>
                    </div>
                    <div className="bg-white/10 p-4 rounded-xl text-center backdrop-blur-sm">
                        <div className="text-3xl font-bold">{general.medical}</div>
                        <div className="text-sm opacity-80">Atenciones Médicas</div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN IMPRESIÓN */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Hoja de Control de Asistencia</h3>
                    <p className="text-slate-500 text-sm">Genere los listados para la recolección de firmas en físico.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <select
                        id="groupSelector"
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50"
                        onChange={(e) => {
                            if (e.target.value) {
                                window.open(`/dashboard/reports/signatures?groupId=${e.target.value}`, '_blank');
                                e.target.value = ""; // Reset
                            }
                        }}
                    >
                        <option value="">Seleccionar Grupo para Imprimir...</option>
                        {groups.map((g: any) => ( // Note: groups comes from reports data which has nested implementation
                            // Actually groups in reports data from getReportsData might not have IDs if mapped poorly
                            // Let's check getReportsData. It maps to { name, food... }. It DOES NOT return IDs.
                            // I need to fetch groups separately or modify getReportsData to include IDs.
                            // Quick fix: Add ID to getReportsData output.
                            <option key={g.name} value={g.id || ''}>{g.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* ZONAS */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Demografía por Zonas</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={zones}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {zones.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* GRUPOS */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Atención por Grupos</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={groups}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="food" name="Alimentos" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="clothesItems" name="Prendas" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="medical" name="Salud" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
