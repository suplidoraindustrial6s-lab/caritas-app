
import Link from 'next/link';
import { getDashboardStats } from '@/app/actions/dashboard';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import DashboardCalendar from './components/DashboardCalendar';
import { Users, Sparkles, Sprout, HeartHandshake, Heart, ArrowUpRight, Clock, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const { data: stats } = await getDashboardStats();

    if (!stats) return <div className="p-8 text-center text-muted-foreground">Cargando métricas...</div>;

    return (
        <div className="flex flex-col gap-6 p-2 md:h-[calc(100vh-2rem)] md:overflow-hidden">
            {/* 1. Header & Quick Stats Row */}
            <div className="flex-none space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Panel Principal</h1>
                        <p className="text-slate-500 font-medium">Resumen general</p>
                    </div>
                    {/* Quick Action Button - Floating Style */}
                    <a href="/dashboard/beneficiaries/new" className="bg-slate-900 text-white px-6 py-3 rounded-full font-semibold shadow-lg shadow-slate-900/20 hover:scale-105 transition-transform flex items-center gap-2 self-start md:self-auto">
                        <span>+</span> Nuevo Registro
                    </a>
                </div>

                {/* Premium Cards Row - Responsive Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
                    {/* Total Summary */}
                    <Link href="/dashboard/beneficiaries" className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-32 md:h-40 hover:shadow-md transition-all hover:scale-105 group relative overflow-hidden col-span-2 md:col-span-1 cursor-pointer">
                        <div className="flex justify-between items-start relative z-10">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Users className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <span className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-lg">Total</span>
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-800">{stats.totalBeneficiaries}</h2>
                            <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">Beneficiarios Activos</p>
                        </div>
                        <Users className="absolute -bottom-4 -right-4 w-20 h-20 md:w-24 md:h-24 text-amber-500/10 -rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-0" />
                    </Link>

                    {/* Group Cards */}
                    {stats.groups.map((group: any) => {
                        const isWaiting = group.name === 'Lista de Espera';

                        // Icon and Color mapping
                        let Icon = FileText; // Default
                        let bgClass = 'bg-slate-50';
                        let textClass = 'text-slate-600';
                        let borderClass = 'border-slate-100';
                        let shadowColor = 'shadow-slate-200';

                        if (group.name === 'Fe') {
                            Icon = Sparkles;
                            bgClass = 'bg-blue-50';
                            textClass = 'text-blue-600';
                            borderClass = 'border-blue-100';
                            shadowColor = 'shadow-blue-200';
                        }
                        if (group.name === 'Esperanza') {
                            Icon = Sprout;
                            bgClass = 'bg-emerald-50';
                            textClass = 'text-emerald-600';
                            borderClass = 'border-emerald-100';
                            shadowColor = 'shadow-emerald-200';
                        }
                        if (group.name === 'Caridad') {
                            Icon = HeartHandshake;
                            bgClass = 'bg-purple-50';
                            textClass = 'text-purple-600';
                            borderClass = 'border-purple-100';
                            shadowColor = 'shadow-purple-200';
                        }
                        if (group.name === 'Amor') {
                            Icon = Heart;
                            bgClass = 'bg-red-50';
                            textClass = 'text-red-600';
                            borderClass = 'border-red-100';
                            shadowColor = 'shadow-red-200';
                        }

                        if (isWaiting) return (
                            <Link key={group.id} href={`/dashboard/beneficiaries?groupId=${group.id}`} className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-32 md:h-40 hover:shadow-md transition-all hover:scale-105 group relative overflow-hidden col-span-2 md:col-span-1 cursor-pointer">
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Clock className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <span className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-lg">Espera</span>
                                </div>
                                <div className="relative z-10">
                                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800">{group._count.beneficiaries}</h2>
                                    <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">{group.name}</p>
                                </div>
                                <Clock className="absolute -bottom-4 -right-4 w-20 h-20 md:w-24 md:h-24 text-amber-500/10 -rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-0" />
                            </Link>
                        );

                        return (
                            <Link key={group.id} href={`/dashboard/beneficiaries?groupId=${group.id}`} className={`bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border ${borderClass} flex flex-col justify-between h-32 md:h-40 hover:shadow-lg hover:${shadowColor} transition-all hover:scale-105 group cursor-pointer relative overflow-hidden`}>
                                <div className="flex justify-between items-start relative z-10">
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center ${bgClass} ${textClass}`}>
                                        <Icon className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center ${bgClass} ${textClass} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                        <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
                                    </div>
                                </div>
                                <div className="relative z-10">
                                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800">{group._count.beneficiaries}</h2>
                                    <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">{group.name}</p>
                                </div>

                                {/* Big Background Icon */}
                                <Icon className={`absolute -bottom-4 -right-4 w-20 h-20 md:w-24 md:h-24 ${textClass} opacity-10 -rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-0`} />
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* 2. Main Content - Responsive Grid */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 md:pb-2">

                {/* Calendar Widget */}
                <div className="lg:col-span-8 h-[400px] md:h-full min-h-0">
                    <DashboardCalendar groups={stats.groups} />
                </div>

                {/* Right Side: Activity & Other Widgets */}
                <div className="lg:col-span-4 h-full min-h-0 flex flex-col gap-4">

                    {/* Activity Feed */}
                    <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex flex-col min-h-[300px]">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span>📡</span> Actividad Reciente
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                            {stats.recentActivity.length > 0 ? (
                                stats.recentActivity.map((activity: any) => (
                                    <div key={activity.id} className="flex gap-3 items-start p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-lg shadow-sm font-bold text-slate-700">
                                            {activity.beneficiary.fullName.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{activity.beneficiary.fullName}</p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(activity.date).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end">
                                            {activity.receivedFood && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Alimentos"></span>}
                                            {activity.receivedMedical && <span className="w-2 h-2 rounded-full bg-amber-500" title="Medicinas"></span>}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                    <span className="text-4xl mb-2">📭</span>
                                    <p className="text-sm">Sin movimientos</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Access - Minimal */}
                    <div className="flex-none grid grid-cols-2 gap-3">
                        <a href="/dashboard/service" className="bg-indigo-600 text-white p-4 rounded-3xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-colors flex flex-col items-center justify-center gap-2 group">
                            <span className="text-2xl group-hover:scale-110 transition-transform">🎁</span>
                            <span className="font-bold text-sm">Iniciar Jornada</span>
                        </a>
                        <a href="/dashboard/reports" className="bg-white text-slate-600 border border-slate-200 p-4 rounded-3xl hover:bg-slate-50 transition-colors flex flex-col items-center justify-center gap-2 group">
                            <span className="text-2xl group-hover:scale-110 transition-transform">📊</span>
                            <span className="font-bold text-sm">Ver Reportes</span>
                        </a>
                    </div>

                </div>
            </div>
        </div>
    );
}
