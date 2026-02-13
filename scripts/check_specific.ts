// Verificar beneficiarios específicos que el usuario mostró con fotos
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSpecificBeneficiaries() {
    const names = ['Elizabeth Rubio', 'Nohely Magdaleno', 'Wilfredy Ramirez'];

    console.log('=== VERIFICANDO BENEFICIARIOS ESPECÍFICOS ===\n');

    for (const name of names) {
        const ben = await prisma.beneficiary.findFirst({
            where: { fullName: name },
            select: { id: true, fullName: true, photoUrl: true, groupId: true }
        });

        if (ben) {
            console.log(`✓ ${ben.fullName}`);
            console.log(`  ID: ${ben.id}, GroupID: ${ben.groupId}`);
            console.log(`  photoUrl: ${ben.photoUrl || 'NULL (sin foto)'}`);
            console.log('');
        } else {
            console.log(`✗ No se encontró: ${name}\n`);
        }
    }

    await prisma.$disconnect();
}

checkSpecificBeneficiaries().catch(console.error);
