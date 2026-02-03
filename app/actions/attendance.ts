'use server'

import prisma from '@/app/lib/prisma'
import { revalidatePath } from 'next/cache'

type AttendanceInput = {
    beneficiaryId: number
    date: Date
    receivedFood: boolean
    foodQuantity: number
    receivedClothes: boolean
    clothesQuantity: number
    receivedMedical: boolean
    medicinesReceived?: string
    signature?: string
}

export async function matchAttendance(data: AttendanceInput) {
    return registerAttendance(data);
}

export async function registerAttendance(data: AttendanceInput) {
    try {
        const newAttendance = await prisma.attendance.create({
            data
        });

        revalidatePath(`/dashboard/beneficiaries/${data.beneficiaryId}`);
        return { success: true, data: newAttendance };
    } catch (error) {
        console.error('Error registering attendance:', error);
        return { success: false, error: 'Error al registrar asistencia' };
    }
}

export async function getGroupAttendanceForDate(groupId: number, date: Date) {
    try {
        // Definir rango del día
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const attendances = await prisma.attendance.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                beneficiary: {
                    groupId: groupId
                }
            },
            include: {
                beneficiary: true
            }
        });
        return { success: true, data: attendances };
    } catch (error) {
        console.error('Error fetching group attendance:', error);
        return { success: false, error: 'Error al obtener asistencia del grupo' };
    }
}
