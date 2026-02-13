import { getGroups } from '@/app/actions/groups';
import { getBeneficiaries } from '@/app/actions/beneficiaries';
import ServiceManager from './components/ServiceManager';
import prisma from '@/app/lib/prisma'; // Direct access for specialized query if needed or re-use actions

export const dynamic = 'force-dynamic';

export default async function ServicePage() {
    const [{ data: groups }] = await Promise.all([
        getGroups()
    ]);

    // Fetch all beneficiaries with their latest attendance to determine status
    const beneficiaries = await prisma.beneficiary.findMany({
        select: {
            id: true,
            fullName: true,
            nationalId: true,
            groupId: true,
            photoUrl: true,
            attendances: {
                orderBy: { date: 'desc' },
                take: 1
            }
        },
        orderBy: { fullName: 'asc' }
    });

    // Serializar datos para el componente cliente
    const serializedBeneficiaries = beneficiaries.map(b => ({
        id: b.id,
        fullName: b.fullName,
        nationalId: b.nationalId,
        groupId: b.groupId,
        photoUrl: b.photoUrl, // Asegurar que photoUrl se incluya
        attendances: b.attendances
    }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Jornada de Servicio</h1>
                    <p className="text-muted-foreground mt-1">Gestión de entregas y asistencia del día</p>
                </div>
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-bold">
                    {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
            </div>

            <ServiceManager groups={groups || []} initialData={serializedBeneficiaries} />
        </div>
    );
}
