
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration...');

    const filePath = path.resolve('Base de datos Caritas.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Get all beneficiaries from DB
    const beneficiaries = await prisma.beneficiary.findMany({
        select: { id: true, nationalId: true, fullName: true }
    });

    console.log(`Found ${beneficiaries.length} beneficiaries in DB.`);

    let updatedCount = 0;
    let notFoundCount = 0;

    // Start from row 4 (index 4)
    for (let i = 4; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const excelId = row[6]; // Col 6: Cédula
        const phone = row[8];   // Col 8: Telefono

        if (!excelId) continue;

        // Normalize Excel ID (remove dots, clean string)
        const normalizedExcelId = String(excelId).replace(/\./g, '').trim();

        if (!phone || String(phone).includes('___') || String(phone).trim() === '') continue;

        // Find in DB
        const match = beneficiaries.find(b => {
            const dbId = b.nationalId.replace(/\./g, '').trim();
            return dbId === normalizedExcelId;
        });

        if (match) {
            console.log(`Updating ${match.fullName} (${match.nationalId}) with phone: ${phone}`);
            await prisma.beneficiary.update({
                where: { id: match.id },
                data: { phoneNumber: String(phone) }
            });
            updatedCount++;
        } else {
            // Try searching by name similarity? No, simpler to stick to ID.
            // console.log(`Beneficiary not found for ID: ${excelId} (${row[2]})`);
            notFoundCount++;
        }
    }

    console.log('Migration finished.');
    console.log(`Updated: ${updatedCount}`);
    console.log(`Not Found/Skipped: ${notFoundCount}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
