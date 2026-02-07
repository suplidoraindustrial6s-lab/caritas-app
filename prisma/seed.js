const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    const dataPath = path.join(__dirname, 'data_backup.json');

    if (!fs.existsSync(dataPath)) {
        console.log('No seed data found (data_backup.json). Seeding default data...');
        // Default seed logic if needed
        return;
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log('Seeding data from backup...');

    // Clean existing data to avoid conflicts (optional, careful in prod!)
    // await prisma.attendance.deleteMany();
    // await prisma.child.deleteMany();
    // await prisma.beneficiary.deleteMany();
    // await prisma.group.deleteMany();
    // await prisma.serviceDay.deleteMany();

    // Import Groups
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
    }
    console.log(`Synced ${data.groups.length} groups`);

    // Import Beneficiaries
    for (const ben of data.beneficiaries) {
        // Check if group exists
        let groupId = ben.groupId;

        await prisma.beneficiary.upsert({
            where: { nationalId: ben.nationalId },
            update: {},
            create: {
                // id: ben.id, // Let Postgres handle ID or force it? Better force it to keep relations
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
                groupId: groupId,
                observations: ben.observations,
                status: ben.status,
                createdAt: new Date(ben.createdAt),
                updatedAt: new Date(ben.updatedAt)
            }
        });
    }
    console.log(`Synced ${data.beneficiaries.length} beneficiaries`);

    // Import Service Days
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
    }
    console.log(`Synced ${data.serviceDays.length} service days`);

    // Import Attendances
    for (const att of data.attendances) {
        // Find beneficiary by ID might be risky if IDs changed. 
        // Since we didn't force IDs for beneficiaries (autoincrement mismatch risk), we should find by nationalId if possible.
        // However, recreating exact state is hard without forcing IDs.
        // Let's try to match beneficiary by nationalId from the backup.

        // Find the original beneficiary in backup data to get nationalId
        const originalBen = data.beneficiaries.find(b => b.id === att.beneficiaryId);
        if (!originalBen) continue;

        const dbBen = await prisma.beneficiary.findUnique({
            where: { nationalId: originalBen.nationalId }
        });

        if (!dbBen) continue;

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
    }
    console.log(`Synced ${data.attendances.length} attendances`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
