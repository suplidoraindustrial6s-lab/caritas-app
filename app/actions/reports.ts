'use server';

import prisma from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';

export async function getReportsData(startDate?: string, endDate?: string) {
    try {
        // Construct date filter
        const dateFilter: Prisma.DateTimeFilter = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) {
            // Adjust end date to include the whole day
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.lte = end;
        }

        const hasDateFilter = startDate || endDate;
        const attendanceWhere = hasDateFilter ? { date: dateFilter } : {};

        // 1. Demographics (Snapshot of current database state, usually ignoring date range for registration unless requested)
        // User asked for "men, women, children registered". This is usually total stock.
        const totalBeneficiaries = await prisma.beneficiary.count();
        const menCount = await prisma.beneficiary.count({ where: { gender: 'M' } });
        const womenCount = await prisma.beneficiary.count({ where: { gender: 'F' } });
        const childrenCount = await prisma.child.count(); // Total children registered

        // 2. Benefits Delivered (Filtered by date)
        const clothesAgg = await prisma.attendance.aggregate({
            where: attendanceWhere,
            _sum: { clothesQuantity: true }
        });

        const foodAgg = await prisma.attendance.aggregate({
            where: { ...attendanceWhere, receivedFood: true },
            _sum: { foodQuantity: true }
        });
        const foodCount = foodAgg._sum.foodQuantity || 0;

        const medicalCount = await prisma.attendance.count({
            where: { ...attendanceWhere, receivedMedical: true }
        });

        // Count total attendances (Services delivered) instead of unique people
        // This ensures the counter increments with every service provided
        const peopleAttendedCount = await prisma.attendance.count({
            where: attendanceWhere
        });

        // 3. Demographics by Zone (Total stock)
        const zoneStats = await prisma.beneficiary.groupBy({
            by: ['zone'],
            _count: { id: true }
        });

        // 4. Delivery Trends (By Month) - For the chart
        // We need raw data to group by month in JS (Prisma doesn't do date truncation group by easily in SQLite)
        const allAttendances = await prisma.attendance.findMany({
            where: attendanceWhere,
            select: {
                date: true,
                receivedFood: true,
                foodQuantity: true, // Added
                receivedMedical: true,
                clothesQuantity: true
            },
            orderBy: { date: 'asc' }
        });

        // 5. Group Stats (Filtered)
        const groups = await prisma.group.findMany({
            include: {
                beneficiaries: {
                    select: {
                        attendances: {
                            where: hasDateFilter ? { date: dateFilter } : undefined,
                            select: {
                                receivedFood: true,
                                foodQuantity: true, // Added
                                receivedMedical: true,
                                clothesQuantity: true
                            }
                        }
                    }
                }
            }
        });

        const groupStats = groups.map((g) => {
            let food = 0;
            let medical = 0;
            let clothesItems = 0;

            g.beneficiaries.forEach((b) => {
                b.attendances.forEach((a) => {
                    if (a.receivedFood) food += (a.foodQuantity || 1);
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
                    beneficiaries: totalBeneficiaries, // Total registry
                    attended: peopleAttendedCount,     // Active in period
                    food: foodCount,
                    medical: medicalCount,
                    clothes: clothesAgg._sum.clothesQuantity || 0
                },
                demographics: {
                    men: menCount,
                    women: womenCount,
                    children: childrenCount
                },
                zones: zoneStats.map((z) => ({ name: z.zone || 'Sin Zona', value: z._count?.id || 0 })),
                groups: groupStats,
                trends: allAttendances // Send raw for frontend grouping
            }
        };

    } catch (error) {
        console.error('Error fetching reports:', error);
        return { success: false, error: 'Error al generar reportes' };
    }
}
