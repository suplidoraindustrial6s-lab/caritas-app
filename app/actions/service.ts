'use server';

import prisma from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getServiceStatus() {
    try {
        // Buscar si hay una jornada abierta HOY (o la última abierta si no se cerró)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeService = await prisma.serviceDay.findFirst({
            where: {
                status: 'OPEN',
            },
            include: {
                group: true,
                _count: {
                    select: { attendances: true }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        if (activeService) {
            return {
                isOpen: true,
                service: activeService,
                totalAttendees: activeService._count.attendances
            };
        }

        return { isOpen: false };

    } catch (error) {
        console.error('Error getting service status:', error);
        return { isOpen: false, error: 'Error al obtener estado del servicio' };
    }
}

export async function startServiceDay(groupId: number) {
    try {
        // Verificar si ya hay una jornada abierta
        const current = await getServiceStatus();
        if (current.isOpen) {
            return { success: false, error: 'Ya hay una jornada en curso.' };
        }

        // Crear nueva jornada para HOY
        // Nota: Si ya existe una ServiceDay "planificada" (del seed) para hoy, la usamos.
        // Si no, la creamos.

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Buscar si existe registro para hoy
        let serviceDay = await prisma.serviceDay.findUnique({
            where: { date: today }
        });

        if (serviceDay) {
            // Si existe, actualizarla a OPEN y asignar grupo si es necesario
            await prisma.serviceDay.update({
                where: { id: serviceDay.id },
                data: {
                    status: 'OPEN',
                    groupId: groupId, // Forzamos el grupo seleccionado
                    closedAt: null,
                    summary: null
                }
            });
        } else {
            // Crear nueva
            await prisma.serviceDay.create({
                data: {
                    date: today,
                    groupId: groupId,
                    status: 'OPEN'
                }
            });
        }

        revalidatePath('/dashboard/service');
        return { success: true };

    } catch (error) {
        console.error('Error starting service day:', error);
        return { success: false, error: 'Error al iniciar la jornada.' };
    }
}

export async function closeServiceDay(serviceId: number) {
    try {
        // Calcular métricas para congelar en summary
        const attendances = await prisma.attendance.findMany({
            where: { serviceDayId: serviceId }
        });

        const totalBeneficiaries = attendances.length;
        const totalFood = attendances.reduce((acc, curr) => acc + (curr.foodQuantity || 0), 0);
        const totalClothes = attendances.reduce((acc, curr) => acc + (curr.clothesQuantity || 0), 0);

        // Sumar medicinas (parseando la string JSON manual para SQLite)
        let totalMedicines = 0;
        attendances.forEach(a => {
            if (a.medicinesDetail) {
                try {
                    const meds = JSON.parse(a.medicinesDetail) as any[];
                    if (Array.isArray(meds)) {
                        totalMedicines += meds.reduce((sum, m) => sum + (parseInt(m.quantity) || 0), 0);
                    }
                } catch (e) { }
            }
        });

        const summary = JSON.stringify({
            totalBeneficiaries,
            totalFood,
            totalClothes,
            totalMedicines,
            closedAt: new Date().toISOString()
        });

        await prisma.serviceDay.update({
            where: { id: serviceId },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                summary: summary
            }
        });

        revalidatePath('/dashboard/service');
        return { success: true };

    } catch (error) {
        console.error('Error closing service day:', error);
        return { success: false, error: 'Error al cerrar la jornada.' };
    }
}

export async function getServiceDayReport(serviceId: number, dateStr?: string) {
    try {
        const serviceDay = await prisma.serviceDay.findUnique({
            where: { id: serviceId },
            include: {
                group: true,
                attendances: {
                    include: { beneficiary: true }
                }
            }
        });

        if (!serviceDay) {
            return { success: false, error: 'Jornada no encontrada' };
        }

        const beneficiaries = await prisma.beneficiary.findMany({
            where: { groupId: serviceDay.groupId },
            orderBy: { fullName: 'asc' }
        });

        const attendances = serviceDay.attendances;

        // Map all beneficiaries to report records
        const reportRecords = beneficiaries.map(ben => {
            const attendance = attendances.find(a => a.beneficiaryId === ben.id);
            if (attendance) {
                return {
                    ...attendance, // Original attendance object
                    beneficiary: ben,
                    status: 'Presente'
                };
            } else {
                return {
                    // Placeholder for absent beneficiary
                    id: 0, // Dummy ID
                    date: serviceDay.date,
                    beneficiaryId: ben.id,
                    serviceDayId: serviceDay.id,
                    receivedFood: false,
                    foodQuantity: 0,
                    receivedClothes: false,
                    clothesQuantity: 0,
                    receivedMedical: false,
                    medicinesReceived: '',
                    medicinesDetail: null,
                    signature: null,
                    status: 'Ausente',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    beneficiary: ben // Include beneficiary data
                };
            }
        });

        const totalBeneficiaries = beneficiaries.length;

        // Calcular estadísticas
        const stats = {
            present: attendances.filter(a => a.status === 'Presente').length,
            absent: totalBeneficiaries - attendances.filter(a => a.status === 'Presente').length,
            totalBeneficiaries,
            foodPacks: attendances.reduce((acc, curr) => acc + (curr.foodQuantity || 0), 0),
            clothesPieces: attendances.reduce((acc, curr) => acc + (curr.clothesQuantity || 0), 0),
            medicalAttention: attendances.filter(a => a.receivedMedical).length
        };

        return {
            success: true,
            records: reportRecords, // Return the full list including absent ones
            stats,
            groupName: serviceDay.group?.name || 'Agrupación',
            date: serviceDay.date
        };

    } catch (error) {
        console.error('Error getting service report:', error);
        return { success: false, error: 'Error al generar reporte' };
    }
}
