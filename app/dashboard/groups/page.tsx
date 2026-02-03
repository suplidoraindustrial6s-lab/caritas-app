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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {groups?.map((group: any) => (
                    <Card key={group.id} className="hover:shadow-md transition-shadow duration-200">
                        <div className="text-center p-4">
                            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-3xl mb-4">
                                {group.name === 'Fe' && '🙏'}
                                {group.name === 'Esperanza' && '🕊️'}
                                {group.name === 'Caridad' && '💖'}
                                {group.name === 'Amor' && '❤️'}
                                {group.name === 'Lista de Espera' && '⏳'}
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-1">{group.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{group.description}</p>

                            <div className="bg-muted rounded-lg p-3">
                                <span className="text-2xl font-bold text-primary block">{group._count.beneficiaries}</span>
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Beneficiarios</span>
                            </div>

                            <div className="mt-4 pt-4 border-t border-border">
                                <a
                                    href={`/dashboard/beneficiaries?groupId=${group.id}`}
                                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                >
                                    Ver listado &rarr;
                                </a>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
