'use server'

import prisma from '@/app/lib/prisma'

export async function getDashboardStats() {
    try {
        const totalBeneficiaries = await prisma.beneficiary.count();

        const groups = await prisma.group.findMany({
            include: {
                _count: {
                    select: { beneficiaries: true }
                }
            }
        });

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
