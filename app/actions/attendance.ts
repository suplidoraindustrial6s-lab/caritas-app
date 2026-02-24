'use server'

import prisma from '@/app/lib/prisma'
import { revalidatePath } from 'next/cache'

type AttendanceInput = {
    beneficiaryId: number
    date?: Date
    receivedFood: boolean
    foodQuantity: number
    receivedClothes: boolean
    clothesQuantity: number
    receivedMedical: boolean
    medicinesReceived?: string
    medicinesDetail?: string // JSON stringificado
    signature?: string
    serviceDayId?: number
}

export async function matchAttendance(data: AttendanceInput) {
    return registerAttendance(data);
}

export async function registerAttendance(data: AttendanceInput) {
    console.log('registerAttendance input:', JSON.stringify(data, null, 2));
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Buscar si ya existe una asistencia para este beneficiario HOY (o en el ServiceDay específico)
        // Priorizar serviceDayId si viene, sino usar rango de fecha hoy
        let existingAttendance = null;

        if (data.serviceDayId) {
            console.log('Checking existing attendance by serviceDayId:', data.serviceDayId);
            existingAttendance = await prisma.attendance.findFirst({
                where: {
                    beneficiaryId: data.beneficiaryId,
                    serviceDayId: data.serviceDayId
                }
            });
        } else {
            console.log('Checking existing attendance by DATE');
            // Fallback por fecha
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            existingAttendance = await prisma.attendance.findFirst({
                where: {
                    beneficiaryId: data.beneficiaryId,
                    date: {
                        gte: today,
                        lt: tomorrow
                    }
                }
            });
        }

        console.log('Existing attendance:', existingAttendance);

        if (existingAttendance) {
            // --- UPSERT LOGIC (ACTUALIZAR) ---
            console.log('Updating existing attendance...');

            // Calcular nuevas cantidades
            const newFoodQty = (existingAttendance.foodQuantity || 0) + (data.foodQuantity || 0);
            const newClothesQty = (existingAttendance.clothesQuantity || 0) + (data.clothesQuantity || 0);

            // Combinar medicinas (JSON Array)
            let combinedMeds: any[] = [];

            // Parsear existentes
            if (existingAttendance.medicinesDetail) {
                try {
                    const parsed = JSON.parse(existingAttendance.medicinesDetail as string);
                    if (Array.isArray(parsed)) combinedMeds = [...parsed];
                } catch (e) {
                    console.error('Error parsing existing medicinesDetail:', e);
                }
            }

            // Parsear nuevas
            if (data.medicinesDetail) {
                try {
                    const parsed = JSON.parse(data.medicinesDetail);
                    if (Array.isArray(parsed)) combinedMeds = [...combinedMeds, ...parsed];
                } catch (e) {
                    console.error('Error parsing new medicinesDetail:', e);
                }
            }

            const updatedAttendance = await prisma.attendance.update({
                where: { id: existingAttendance.id },
                data: {
                    receivedFood: existingAttendance.receivedFood || data.receivedFood,
                    foodQuantity: newFoodQty,
                    receivedClothes: existingAttendance.receivedClothes || data.receivedClothes,
                    clothesQuantity: newClothesQty,
                    receivedMedical: existingAttendance.receivedMedical || data.receivedMedical,
                    medicinesDetail: JSON.stringify(combinedMeds), // Guardar como string
                    status: 'Presente',
                    // No cambiamos la fecha original ni el serviceDayId original
                }
            });

            console.log('Attendance updated:', updatedAttendance);

            revalidatePath(`/dashboard/beneficiaries/${data.beneficiaryId}`);
            return { success: true, data: updatedAttendance, isUpdate: true };

        } else {
            // --- CREATE LOGIC (NUEVO) ---
            console.log('Creating new attendance...');

            // Clean data for create (remove potentially undefined fields if they cause issues, though optional ones shouldn't)
            // But let's be explicit

            const newAttendance = await prisma.attendance.create({
                data: {
                    beneficiaryId: data.beneficiaryId,
                    date: data.date || new Date(),
                    serviceDayId: data.serviceDayId,
                    receivedFood: data.receivedFood,
                    foodQuantity: data.foodQuantity,
                    receivedClothes: data.receivedClothes,
                    clothesQuantity: data.clothesQuantity,
                    receivedMedical: data.receivedMedical,
                    medicinesReceived: data.medicinesReceived,
                    medicinesDetail: data.medicinesDetail || '[]',
                    signature: data.signature,
                    status: 'Presente'
                }
            });
            console.log('Attendance created:', newAttendance);

            revalidatePath(`/dashboard/beneficiaries/${data.beneficiaryId}`);
            return { success: true, data: newAttendance, isUpdate: false };
        }

    } catch (error) {
        console.error('Error registering attendance (FULL ERROR):', error);
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
