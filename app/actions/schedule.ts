'use server'

import prisma from '@/app/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getSchedule(year: number, month: number) {
    try {
        // Use UTC dates to ensure we cover the full month regardless of server timezone
        const start = new Date(Date.UTC(year, month, 1));
        const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

        const days = await prisma.serviceDay.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                group: true
            }
        });
        return { success: true, data: days };
    } catch (error) {
        console.error('Error fetching schedule:', error);
        return { success: false, error: 'Error al cargar calendario' };
    }
}

export async function updateServiceDay(dateStr: string, groupId: number | null, note?: string) {
    try {
        const date = new Date(dateStr);
        // Upsert because users might click on a day that wasn't seeded (e.g. Wednesday to substitute)
        // Robustly find existing record for this logical day (ignore time)
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        // Check if exists
        const existing = await prisma.serviceDay.findFirst({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        let updated;
        if (existing) {
            updated = await prisma.serviceDay.update({
                where: { id: existing.id },
                data: {
                    groupId,
                    note,
                    isHoliday: false,
                    // Optionally normalize date to pure UTC midnight if needed, but keeping ID is key
                    date: startOfDay
                }
            });
        } else {
            updated = await prisma.serviceDay.create({
                data: {
                    date: startOfDay,
                    groupId,
                    note,
                    isHoliday: false
                }
            });
        }
        revalidatePath('/dashboard');
        return { success: true, data: updated };
    } catch (error) {
        console.error('Error updating service day:', error);
        return { success: false, error: 'Error al actualizar día' };
    }
}
