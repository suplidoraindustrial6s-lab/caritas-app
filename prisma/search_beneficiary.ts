
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const term = 'Jesús'; // Searching for "Jesús" broadly, or "Nino"

    console.log('Searching for beneficiaries...');

    const results = await prisma.beneficiary.findMany({
        where: {
            OR: [
                { fullName: { contains: 'Nino' } },
                { fullName: { contains: 'Niño' } },
                { fullName: { contains: 'Jesus' } },
                { fullName: { contains: 'Jesús' } },
                { zone: { contains: 'Niño' } },
                { zone: { contains: 'Nino' } }
            ]
        },
        include: {
            group: true,
            children: true
        }
    });

    const children = await prisma.child.findMany({
        where: {
            OR: [
                { fullName: { contains: 'Nino' } },
                { fullName: { contains: 'Niño' } },
                { fullName: { contains: 'Jesus' } },
                { fullName: { contains: 'Jesús' } }
            ]
        },
        include: {
            beneficiary: true
        }
    });

    console.log('Beneficiaries:', JSON.stringify(results, null, 2));
    console.log('Children:', JSON.stringify(children, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
