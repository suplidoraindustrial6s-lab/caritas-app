import { getDashboardStats } from '@/app/actions/dashboard';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const { data: stats } = await getDashboardStats();

    if (!stats) return <div>Cargando...</div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Panel Principal</h1>
                <p className="text-muted-foreground mt-1">Resumen de actividad parroquial</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-l-4 border-l-primary bg-gradient-to-br from-white to-blue-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary text-2xl">👥</div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Beneficiarios</p>
                            <p className="text-3xl font-bold text-foreground">{stats.totalBeneficiaries}</p>
                        </div>
                    </div>
                </Card>

                {stats.groups.map((group: any) => (
                    <Card key={group.id} className="border-l-4 border-l-secondary bg-white">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-secondary/10 rounded-xl text-secondary text-xl">🙌</div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Grupo {group.name}</p>
                                <p className="text-2xl font-bold text-foreground">{group._count.beneficiaries}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card title="Actividad Reciente">
                        {stats.recentActivity.length > 0 ? (
                            <div className="space-y-4">
                                {stats.recentActivity.map((activity: any) => (
                                    <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {activity.beneficiary.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{activity.beneficiary.fullName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(activity.date).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {activity.receivedFood && <Badge variant="success">Comida</Badge>}
                                            {activity.receivedMedical && <Badge variant="warning">Medicina</Badge>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">No hay actividad reciente registrada.</p>
                        )}
                    </Card>
                </div>

                <div>
                    <Card title="Accesos Rápidos" className="h-full">
                        <div className="grid gap-4">
                            <a href="/dashboard/beneficiaries/new" className="block p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group">
                                <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">👤</span>
                                <h4 className="font-semibold text-foreground">Nuevo Beneficiario</h4>
                                <p className="text-xs text-muted-foreground mt-1">Registrar una nueva persona en el sistema</p>
                            </a>
                            <a href="/dashboard/service" className="block p-4 rounded-xl border border-border hover:border-secondary/50 hover:bg-secondary/5 transition-all group">
                                <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">🎁</span>
                                <h4 className="font-semibold text-foreground">Iniciar Jornada</h4>
                                <p className="text-xs text-muted-foreground mt-1">Registrar entregas y asistencias de hoy</p>
                            </a>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
