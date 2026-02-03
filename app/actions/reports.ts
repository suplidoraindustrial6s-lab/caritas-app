'use server';

import prisma from '@/app/lib/prisma';

export async function getReportsData() {
    try {
        // 1. Estadísticas Generales
        const totalBeneficiaries = await prisma.beneficiary.count();
        const clothesAgg = await prisma.attendance.aggregate({ _sum: { clothesQuantity: true } });
        const foodCount = await prisma.attendance.count({ where: { receivedFood: true } });
        const medicalCount = await prisma.attendance.count({ where: { receivedMedical: true } });

        // 2. Por Zona (Demografía)
        const zoneStats = await prisma.beneficiary.groupBy({
            by: ['zone'],
            _count: { id: true }
        });

        // 3. Por Grupo (Atenciones)
        const groups = await prisma.group.findMany({
            include: {
                beneficiaries: {
                    select: {
                        attendances: {
                            select: {
                                receivedFood: true,
                                receivedMedical: true,
                                clothesQuantity: true
                            }
                        }
                    }
                }
            }
        });

        const groupStats = groups.map((g: any) => {
            let food = 0;
            let medical = 0;
            let clothesItems = 0;

            g.beneficiaries.forEach((b: any) => {
                b.attendances.forEach((a: any) => {
                    if (a.receivedFood) food++;
                    if (a.receivedMedical) medical++;
                    clothesItems += a.clothesQuantity;
                });
            });

            return {
                id: g.id,
                name: g.name,
                food,
                medical,
                clothesItems
            };
        });

        return {
            success: true,
            data: {
                general: {
                    beneficiaries: totalBeneficiaries,
                    food: foodCount,
                    medical: medicalCount,
                    clothes: clothesAgg._sum.clothesQuantity || 0
                },
                zones: zoneStats.map((z: any) => ({ name: z.zone || 'Sin Zona', value: z._count?.id || 0 })),
                groups: groupStats
            }
        };

    } catch (error) {
        console.error('Error fetching reports:', error);
        return { success: false, error: 'Error al generar reportes' };
    }
}
