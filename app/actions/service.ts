'use server';

import prisma from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function closeServiceDay(groupId: number, dateStr?: string) {
    try {
        // Use provided date or today
        const targetDate = dateStr ? new Date(dateStr) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // 1. Get all beneficiaries in the group
        const beneficiaries = await prisma.beneficiary.findMany({
            where: {
                groupId,
                status: 'Activo' // Only active beneficiaries count for attendance
            }
        });

        // 2. Get attendance records for today
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                beneficiary: { groupId },
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            select: { beneficiaryId: true }
        });

        const attendedIds = new Set(attendanceRecords.map(a => a.beneficiaryId));

        // 3. Identify absentees
        const absentees = beneficiaries.filter(b => !attendedIds.has(b.id));

        // 4. Create "Absent" records
        if (absentees.length > 0) {
            for (const b of absentees) {
                await prisma.attendance.create({
                    data: {
                        beneficiaryId: b.id,
                        date: targetDate,
                        status: 'Ausente',
                        receivedFood: false,
                        foodQuantity: 0,
                        receivedClothes: false,
                        clothesQuantity: 0,
                        receivedMedical: false,
                        medicinesReceived: ''
                    }
                });
            }
        }

        revalidatePath('/dashboard/service');
        revalidatePath('/dashboard/beneficiaries');

        return {
            success: true,
            stats: {
                total: beneficiaries.length,
                present: attendedIds.size,
                absent: absentees.length
            }
        };

    } catch (error) {
        console.error('Error closing service day:', error);
        return { success: false, error: 'Error al cerrar la jornada' };
    }
}

export async function getServiceDayReport(groupId: number, dateStr: string) {
    try {
        const startOfDay = new Date(dateStr);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateStr);
        endOfDay.setHours(23, 59, 59, 999);

        const group = await prisma.group.findUnique({
            where: { id: groupId },
            select: { name: true }
        });

        const records = await prisma.attendance.findMany({
            where: {
                beneficiary: { groupId },
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                beneficiary: {
                    select: {
                        fullName: true,
                        nationalId: true,
                        phoneNumber: true
                    }
                }
            },
            orderBy: {
                beneficiary: { fullName: 'asc' }
            }
        });

        const stats = {
            totalBeneficiaries: records.length,
            present: records.filter(r => r.status !== 'Ausente').length,
            absent: records.filter(r => r.status === 'Ausente').length,
            foodPacks: records.reduce((sum, r) => sum + r.foodQuantity, 0),
            clothesPieces: records.reduce((sum, r) => sum + r.clothesQuantity, 0),
            medicalAttention: records.filter(r => r.receivedMedical).length
        };

        return { success: true, groupName: group?.name, date: dateStr, records, stats };

    } catch (error) {
        console.error('Error fetching report:', error);
        return { success: false, error: 'Error obteniendo datos del reporte' };
    }
}
