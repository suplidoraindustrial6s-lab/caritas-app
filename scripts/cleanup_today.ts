
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const serviceDay = await prisma.serviceDay.findFirst({
        where: { date: today }
    });

    if (serviceDay) {
        // Delete all attendances for today
        await prisma.attendance.deleteMany({
            where: { serviceDayId: serviceDay.id }
        });

        // Reset service day if needed, or just let user restart it
        console.log('Cleared attendances for today');
        // Delete the service day itself so user can "start" fresh
        await prisma.serviceDay.delete({
            where: { id: serviceDay.id }
        });
        console.log('Deleted service day for today');
    } else {
        console.log('No service day found for today');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
