// Script para simular exactamente lo que hace la página de service
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testServicePageData() {
    console.log('=== TEST: Simulando Service Page ===\n');

    // Simular exactamente lo que hace page.tsx
    const beneficiaries = await prisma.beneficiary.findMany({
        select: {
            id: true,
            fullName: true,
            nationalId: true,
            groupId: true,
            photoUrl: true,
            attendances: {
                orderBy: { date: 'desc' },
                take: 1
            }
        },
        orderBy: { fullName: 'asc' }
    });

    console.log(`Total beneficiarios: ${beneficiaries.length}\n`);

    // Mostrar los primeros 5 con foto
    const withPhotos = beneficiaries.filter(b => b.photoUrl);
    console.log(`Beneficiarios con foto: ${withPhotos.length}\n`);

    if (withPhotos.length > 0) {
        console.log('BENEFICIARIOS CON FOTO:');
        withPhotos.slice(0, 5).forEach((b, i) => {
            console.log(`${i + 1}. ${b.fullName}`);
            console.log(`   photoUrl: ${b.photoUrl}`);
            console.log(`   groupId: ${b.groupId}\n`);
        });
    }

    // Serializar como en la página
    const serialized = beneficiaries.map(b => ({
        id: b.id,
        fullName: b.fullName,
        nationalId: b.nationalId,
        groupId: b.groupId,
        photoUrl: b.photoUrl,
        attendances: b.attendances
    }));

    console.log('\n=== DATOS SERIALIZADOS ===');
    const serializedWithPhotos = serialized.filter(b => b.photoUrl);
    console.log(`Beneficiarios con photoUrl después de serializar: ${serializedWithPhotos.length}`);

    if (serializedWithPhotos.length > 0) {
        console.log('\nPrimer beneficiario serializado con foto:');
        console.log(JSON.stringify(serializedWithPhotos[0], null, 2));
    }

    await prisma.$disconnect();
}

testServicePageData().catch(console.error);
