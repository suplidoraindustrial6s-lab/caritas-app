'use server'

import prisma from '@/app/lib/prisma'

export async function getDashboardStats() {
    try {
        const totalBeneficiaries = await prisma.beneficiary.count();

        let groups = await prisma.group.findMany({
            include: {
                _count: {
                    select: { beneficiaries: true }
                }
            }
        });

        // Auto-crear los 5 grupos estándar si la base de datos está vacía
        if (groups.length === 0) {
            const defaultGroups = [
                { name: 'Fe', description: 'Grupo de Fe' },
                { name: 'Esperanza', description: 'Grupo de Esperanza' },
                { name: 'Caridad', description: 'Grupo de Caridad' },
                { name: 'Amor', description: 'Grupo de Amor' },
                { name: 'Lista de Espera', description: 'Beneficiarios en espera' },
            ];
            for (const g of defaultGroups) {
                await prisma.group.upsert({
                    where: { name: g.name },
                    update: {},
                    create: g,
                });
            }
            groups = await prisma.group.findMany({
                include: {
                    _count: {
                        select: { beneficiaries: true }
                    }
                }
            });
        }

        const recentActivity = await prisma.attendance.findMany({
            take: 5,
            orderBy: { date: 'desc' },
            include: { beneficiary: true }
        });

        return {
            success: true,
            data: {
                totalBeneficiaries,
                groups,
                recentActivity
            }
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return { success: false, error: 'Error al obtener estadísticas' };
    }
}
