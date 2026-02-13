// Script para verificar si los beneficiarios tienen photoUrl en la base de datos
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPhotos() {
    const beneficiaries = await prisma.beneficiary.findMany({
        select: {
            id: true,
            fullName: true,
            photoUrl: true
        },
        take: 10 // Solo primeros 10
    });

    console.log('=== VERIFICACIÓN DE FOTOS ===');
    console.log(`Total beneficiarios revisados: ${beneficiaries.length}`);
    console.log('\\n');

    beneficiaries.forEach(b => {
        const hasPhoto = b.photoUrl ? '✅ SÍ' : '❌ NO';
        console.log(`${hasPhoto} - ${b.fullName}`);
        if (b.photoUrl) {
            console.log(`    URL: ${b.photoUrl}`);
        }
    });

    const withPhotos = beneficiaries.filter(b => b.photoUrl).length;
    console.log(`\\n${withPhotos} de ${beneficiaries.length} beneficiarios tienen foto`);

    await prisma.$disconnect();
}

checkPhotos().catch(console.error);
