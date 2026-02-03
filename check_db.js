const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.beneficiary.count();
    const beneficiaries = await prisma.beneficiary.findMany();
    console.log(`Total beneficiaries: ${count}`);
    console.log('Beneficiaries:', JSON.stringify(beneficiaries, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
