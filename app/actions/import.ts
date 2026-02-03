'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/app/lib/prisma';
import * as XLSX from 'xlsx';

export async function processImportFile(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, error: 'No se recibió ningún archivo.' };
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        const stats = {
            beneficiaries: 0,
            attendances: 0
        };

        // 1. Procesar Beneficiarios
        const beneficarySheet = workbook.Sheets['Beneficiarios'];
        if (beneficarySheet) {
            const records: any[] = XLSX.utils.sheet_to_json(beneficarySheet);

            // Garantizar grupos primero (opcional, si queremos asignar grupos por nombre)
            // Por simplicidad, asumiremos grupos existentes o Default

            for (const row of records) {
                // Mapeo flexible de columnas
                const nationalId = String(row['Cédula'] || row['cedula'] || row['ID'] || '').trim();
                const fullName = (row['Nombre'] || row['nombre'] || row['Nombres'] || '').trim();
                const groupName = (row['Grupo'] || row['grupo'] || '').toString().trim();
                const zone = (row['Zona'] || row['zona'] || '').toString().trim();
                const address = (row['Dirección'] || row['Direccion'] || '').toString().trim() || 'No registrada';

                if (!nationalId || !fullName) continue;

                // Buscar o crear grupo si se especifica
                let groupId = null;
                if (groupName) {
                    const group = await prisma.group.upsert({
                        where: { name: groupName },
                        update: {},
                        create: { name: groupName }
                    });
                    groupId = group.id;
                }

                // Upsert Beneficiario
                await prisma.beneficiary.upsert({
                    where: { nationalId },
                    update: {
                        fullName,
                        zone: zone || undefined,
                        address: address !== 'No registrada' ? address : undefined,
                        groupId: groupId || undefined
                    },
                    create: {
                        nationalId,
                        fullName,
                        birthDate: new Date(), // Placeholder si no viene fecha
                        placeOfBirth: 'Importado',
                        gender: 'U', // Undefined por defecto
                        address: address,
                        zone: zone,
                        groupId
                    }
                });
                stats.beneficiaries++;
            }
        }

        // 2. Procesar Asistencias
        const attendanceSheet = workbook.Sheets['Asistencia'];
        if (attendanceSheet) {
            const records: any[] = XLSX.utils.sheet_to_json(attendanceSheet);

            for (const row of records) {
                const nationalId = String(row['Cédula'] || row['cedula'] || '').trim();
                // Manejo de fechas en Excel a JS Date
                let dateStr = row['Fecha'] || row['fecha'];
                let date = new Date();

                // Si es número serial de Excel
                if (typeof dateStr === 'number') {
                    date = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
                } else if (dateStr) {
                    // Intento parsing seguro
                    // Asumimos DD/MM/YYYY si es string
                    const parts = String(dateStr).split('/');
                    if (parts.length === 3) {
                        date = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                    }
                }

                if (!nationalId) continue;

                // Encontrar beneficiario
                const ben = await prisma.beneficiary.findUnique({ where: { nationalId } });
                if (!ben) continue;

                const receivedFood = String(row['Comida'] || '').toLowerCase().includes('si');
                const receivedMedical = String(row['Medicina'] || '').toLowerCase().includes('si');
                const clothesQuantity = Number(row['Ropa'] || row['ropa'] || 0);

                await prisma.attendance.create({
                    data: {
                        beneficiaryId: ben.id,
                        date: date,
                        receivedFood,
                        receivedMedical,
                        clothesQuantity,
                        signature: 'Importado'
                    }
                });
                stats.attendances++;
            }
        }

        revalidatePath('/dashboard');
        revalidatePath('/dashboard/beneficiaries');
        revalidatePath('/dashboard/reports');

        return { success: true, stats };

    } catch (error: any) {
        console.error('Error in import:', error);
        return { success: false, error: 'Error al procesar archivo: ' + error.message };
    }
}
