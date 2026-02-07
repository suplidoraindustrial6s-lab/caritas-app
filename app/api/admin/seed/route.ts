import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const prisma = new PrismaClient();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('key');

    if (secret !== 'CaritasSegura2026$$') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // AUTO-HEAL: Ensure DB Schema exists
        try {
            console.log('Pushing DB schema...');
            // Use global prisma installed in Dockerfile
            await execAsync('prisma db push --accept-data-loss');
            console.log('DB schema pushed successfully.');
        } catch (e: any) {
            console.error('DB Push failed:', e);
            // Continue anyway, maybe it worked partially or tables exist
        }

        const dataPath = path.join(process.cwd(), 'prisma', 'data_backup.json');
        if (!fs.existsSync(dataPath)) {
            return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
        }

        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const results = {
            groups: 0,
            beneficiaries: 0,
            serviceDays: 0,
            attendances: 0
        };

        // 1. Groups
        for (const group of data.groups) {
            await prisma.group.upsert({
                where: { name: group.name },
                update: {},
                create: {
                    id: group.id,
                    name: group.name,
                    description: group.description,
                    createdAt: new Date(group.createdAt),
                    updatedAt: new Date(group.updatedAt)
                }
            });
            results.groups++;
        }

        // 2. Beneficiaries
        for (const ben of data.beneficiaries) {
            await prisma.beneficiary.upsert({
                where: { nationalId: ben.nationalId },
                update: {},
                create: {
                    fullName: ben.fullName,
                    nationalId: ben.nationalId,
                    phoneNumber: ben.phoneNumber,
                    birthDate: new Date(ben.birthDate),
                    placeOfBirth: ben.placeOfBirth,
                    gender: ben.gender,
                    address: ben.address,
                    zone: ben.zone,
                    photoUrl: ben.photoUrl,
                    chronicIllness: ben.chronicIllness,
                    hasChildren: ben.hasChildren,
                    groupId: ben.groupId,
                    observations: ben.observations,
                    status: ben.status,
                    createdAt: new Date(ben.createdAt),
                    updatedAt: new Date(ben.updatedAt)
                }
            });
            results.beneficiaries++;
        }

        // 3. Service Days
        for (const day of data.serviceDays) {
            await prisma.serviceDay.upsert({
                where: { date: new Date(day.date) },
                update: {},
                create: {
                    date: new Date(day.date),
                    groupId: day.groupId,
                    note: day.note,
                    isHoliday: day.isHoliday,
                    createdAt: new Date(day.createdAt),
                    updatedAt: new Date(day.updatedAt)
                }
            });
            results.serviceDays++;
        }

        // 4. Attendances
        // Need to map by nationalId because IDs might differ if auto-increment skipped (though unlikely with fresh DB)
        // But safely we look up beneficiary first
        for (const att of data.attendances) {
            // Find original beneficiary to get cedula
            const originalBen = data.beneficiaries.find((b: any) => b.id === att.beneficiaryId);
            if (!originalBen) continue;

            const dbBen = await prisma.beneficiary.findUnique({
                where: { nationalId: originalBen.nationalId }
            });

            if (!dbBen) continue;

            // Check if attendance exists to avoid duplicates
            const existing = await prisma.attendance.findFirst({
                where: {
                    date: new Date(att.date),
                    beneficiaryId: dbBen.id
                }
            });

            if (!existing) {
                await prisma.attendance.create({
                    data: {
                        date: new Date(att.date),
                        beneficiaryId: dbBen.id,
                        receivedFood: att.receivedFood,
                        foodQuantity: att.foodQuantity,
                        receivedClothes: att.receivedClothes,
                        clothesQuantity: att.clothesQuantity,
                        receivedMedical: att.receivedMedical,
                        medicinesReceived: att.medicinesReceived,
                        signature: att.signature,
                        status: att.status,
                        createdAt: new Date(att.createdAt)
                    }
                });
                results.attendances++;
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('Seed error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
