import { getGroups } from '@/app/actions/groups';
import { Card } from '@/app/components/ui/Card';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
    const { data: groups } = await getGroups();

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Grupos de Atención</h1>
                    <p className="text-muted-foreground mt-1">Gestión y organización de beneficiarios por grupos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {groups?.map((group: any) => {
                    // Color mapping Logic
                    let theme = {
                        bg: "bg-white",
                        border: "border-slate-200",
                        text: "text-slate-700",
                        iconBg: "bg-slate-100",
                        accent: "bg-slate-500",
                        light: "bg-slate-50",
                        button: "hover:bg-slate-50 text-slate-600"
                    };

                    if (group.name === 'Fe') {
                        theme = {
                            bg: "bg-white",
                            border: "border-blue-100",
                            text: "text-blue-700",
                            iconBg: "bg-blue-50",
                            accent: "bg-blue-500",
                            light: "bg-blue-50/50",
                            button: "hover:bg-blue-50 text-blue-600"
                        };
                    } else if (group.name === 'Esperanza') {
                        theme = {
                            bg: "bg-white",
                            border: "border-emerald-100",
                            text: "text-emerald-700",
                            iconBg: "bg-emerald-50",
                            accent: "bg-emerald-500",
                            light: "bg-emerald-50/50",
                            button: "hover:bg-emerald-50 text-emerald-600"
                        };
                    } else if (group.name === 'Caridad') {
                        theme = {
                            bg: "bg-white",
                            border: "border-purple-100",
                            text: "text-purple-700",
                            iconBg: "bg-purple-50",
                            accent: "bg-purple-500",
                            light: "bg-purple-50/50",
                            button: "hover:bg-purple-50 text-purple-600"
                        };
                    } else if (group.name === 'Amor') {
                        theme = {
                            bg: "bg-white",
                            border: "border-red-100",
                            text: "text-red-700",
                            iconBg: "bg-red-50",
                            accent: "bg-red-500",
                            light: "bg-red-50/50",
                            button: "hover:bg-red-50 text-red-600"
                        };
                    } else if (group.name === 'Lista de Espera') {
                        theme = {
                            bg: "bg-white",
                            border: "border-amber-100",
                            text: "text-amber-700",
                            iconBg: "bg-amber-50",
                            accent: "bg-amber-500",
                            light: "bg-amber-50/50",
                            button: "hover:bg-amber-50 text-amber-600"
                        };
                    }

                    return (
                        <Link href={`/dashboard/beneficiaries?groupId=${group.id}`} key={group.id} className="block h-full">
                            <Card
                                className={`
                                    h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden
                                    ${theme.bg} border ${theme.border}
                                `}
                            >
                                <div className={`absolute top-0 left-0 w-full h-1.5 ${theme.accent}`} />

                                <div className="p-6 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`w-14 h-14 rounded-2xl ${theme.iconBg} flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                            {group.name === 'Fe' && '🙏'}
                                            {group.name === 'Esperanza' && '🕊️'}
                                            {group.name === 'Caridad' && '💖'}
                                            {group.name === 'Amor' && '❤️'}
                                            {group.name === 'Lista de Espera' && '⏳'}
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${theme.light} ${theme.text}`}>
                                            {group.name === 'Lista de Espera' ? 'En cola' : 'Activo'}
                                        </span>
                                    </div>

                                    <div className="mb-4">
                                        <h3 className={`text-xl font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors`}>{group.name}</h3>
                                        <p className="text-sm text-slate-500 font-medium">
                                            {group.name === 'Fe' && 'Atención: Martes I'}
                                            {group.name === 'Esperanza' && 'Atención: Jueves I'}
                                            {group.name === 'Caridad' && 'Atención: Martes II'}
                                            {group.name === 'Amor' && 'Atención: Jueves II'}
                                            {group.name === 'Lista de Espera' && 'Sin asignación fija'}
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-2xl font-bold text-slate-900">{group._count.beneficiaries}</span>
                                            <span className="text-xs text-slate-400 font-medium uppercase">Beneficiarios</span>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme.light} ${theme.text} group-hover:translate-x-1 transition-transform`}>
                                            →
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
