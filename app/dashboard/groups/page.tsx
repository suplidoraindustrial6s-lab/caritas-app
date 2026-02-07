import { getGroups } from '@/app/actions/groups';
import { Card } from '@/app/components/ui/Card';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
    const { data: groups } = await getGroups();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Grupos de Atención</h1>
                    <p className="text-muted-foreground mt-1">Gestión de beneficiarios por grupos</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {groups?.map((group: any) => {
                    // Color mapping Logic
                    let mobileBg = "bg-white";
                    let mobileBorder = "border-slate-200";
                    let mobileText = "text-slate-700";
                    let iconBg = "bg-primary/10";

                    if (group.name === 'Fe') {
                        mobileBg = "bg-blue-50";
                        mobileBorder = "border-blue-200";
                        mobileText = "text-blue-700";
                        iconBg = "bg-blue-100/50";
                    } else if (group.name === 'Esperanza') {
                        mobileBg = "bg-emerald-50";
                        mobileBorder = "border-emerald-200";
                        mobileText = "text-emerald-700";
                        iconBg = "bg-emerald-100/50";
                    } else if (group.name === 'Caridad') {
                        mobileBg = "bg-purple-50";
                        mobileBorder = "border-purple-200";
                        mobileText = "text-purple-700";
                        iconBg = "bg-purple-100/50";
                    } else if (group.name === 'Amor') {
                        mobileBg = "bg-red-50";
                        mobileBorder = "border-red-200";
                        mobileText = "text-red-700";
                        iconBg = "bg-red-100/50";
                    } else if (group.name === 'Lista de Espera') {
                        mobileBg = "bg-amber-50";
                        mobileBorder = "border-amber-200";
                        mobileText = "text-amber-700";
                        iconBg = "bg-amber-100/50";
                    }

                    return (
                        <Card
                            key={group.id}
                            className={`
                                hover:shadow-md transition-shadow duration-200
                                ${mobileBg} border ${mobileBorder} md:bg-white md:border-border
                            `}
                        >
                            <div className="text-center p-3 md:p-4">
                                <div className={`w-10 h-10 md:w-16 md:h-16 mx-auto ${iconBg} md:bg-primary/10 rounded-full flex items-center justify-center text-xl md:text-3xl mb-2 md:mb-4`}>
                                    {group.name === 'Fe' && '🙏'}
                                    {group.name === 'Esperanza' && '🕊️'}
                                    {group.name === 'Caridad' && '💖'}
                                    {group.name === 'Amor' && '❤️'}
                                    {group.name === 'Lista de Espera' && '⏳'}
                                </div>
                                <h3 className={`text-sm md:text-xl font-bold ${mobileText} md:text-foreground mb-1`}>{group.name}</h3>
                                <p className="text-[10px] md:text-sm text-foreground/80 font-medium mb-2 md:mb-4 line-clamp-1">
                                    {group.name === 'Fe' && 'Martes I'}
                                    {group.name === 'Esperanza' && 'Jueves I'}
                                    {group.name === 'Caridad' && 'Martes II'}
                                    {group.name === 'Amor' && 'Jueves II'}
                                    {group.name === 'Lista de Espera' && 'Cola'}
                                </p>

                                <div className="bg-white/50 md:bg-muted rounded-lg p-2 md:p-3">
                                    <span className={`text-lg md:text-2xl font-bold ${mobileText} md:text-primary block`}>{group._count.beneficiaries}</span>
                                    <span className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-wider">Beneficiarios</span>
                                </div>

                                <div className="mt-2 md:mt-4 pt-2 md:pt-4 border-t border-black/5 md:border-border">
                                    <a
                                        href={`/dashboard/beneficiaries?groupId=${group.id}`}
                                        className={`text-xs md:text-sm font-medium ${mobileText} md:text-primary hover:opacity-80 transition-colors`}
                                    >
                                        Ver listado &rarr;
                                    </a>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
