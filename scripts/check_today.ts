
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const serviceDay = await prisma.serviceDay.findFirst({
        where: { date: today },
        include: { attendances: true, group: true }
    });

    console.log('Service Day Today:', JSON.stringify(serviceDay, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
