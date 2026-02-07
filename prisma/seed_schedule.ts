
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const HOLIDAYS_2026 = [
    '2026-01-01', // Año Nuevo
    '2026-02-16', // Carnaval
    '2026-02-17', // Carnaval
    '2026-03-19', // San José
    '2026-04-02', // Jueves Santo
    '2026-04-03', // Viernes Santo
    '2026-04-19', // Declaración Independencia
    '2026-05-01', // Día del Trabajo
    '2026-06-24', // Batalla de Carabobo
    '2026-07-05', // Independencia
    '2026-07-24', // Natalicio Bolívar
    '2026-10-12', // Resistencia Indígena
    '2026-12-24', // Navidad
    '2026-12-25', // Navidad
    '2026-12-31', // Fin de Año
];

async function main() {
    console.log('Seeding Service Days for 2026...');

    // Get Groups IDs
    const groups = await prisma.group.findMany();
    const groupMap: Record<string, number> = {};
    groups.forEach(g => groupMap[g.name] = g.id);

    // Basic validation
    if (!groupMap['Fe'] || !groupMap['Esperanza']) {
        console.error('Groups not found. Run basic seed first?');
        return;
    }

    const startDate = new Date(2026, 0, 1);
    const endDate = new Date(2026, 11, 31);
    const anchorDate = new Date(2026, 1, 3); // Feb 3 (Tuesday) -> Fe
    const oneDay = 24 * 60 * 60 * 1000;

    let currentDate = new Date(startDate);
    let count = 0;

    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0Sun, 1Mon, 2Tue, 3Wed, 4Thu, 5Fri, 6Sat
        const dateStr = currentDate.toISOString().split('T')[0];

        let targetGroup: string | null = null;
        let isHoliday = false;
        let note: string | null = null;

        if (HOLIDAYS_2026.includes(dateStr)) {
            isHoliday = true;
            note = 'Feriado Nacional';
        }

        // Logic for Tue/Thu
        if ((dayOfWeek === 2 || dayOfWeek === 4) && !isHoliday) {
            const diffTime = currentDate.getTime() - anchorDate.getTime();
            const diffWeeks = Math.floor(Math.round(diffTime / oneDay) / 7);
            const isCycleA = diffWeeks % 2 === 0;

            if (dayOfWeek === 2) {
                targetGroup = isCycleA ? 'Fe' : 'Caridad';
            } else {
                targetGroup = isCycleA ? 'Esperanza' : 'Amor';
            }
        }

        // We act on existing records or create new
        // Only insert if it is a service day OR holiday on a potential service day?
        // User wants to see holidays too to substitute.
        // Let's seed ALL Tuesdays and Thursdays as records, even holidays.

        if (dayOfWeek === 2 || dayOfWeek === 4) {
            const groupId = targetGroup ? groupMap[targetGroup] : null;

            await prisma.serviceDay.upsert({
                where: { date: currentDate },
                update: {
                    groupId: groupId,
                    isHoliday: isHoliday,
                    note: note || undefined
                },
                create: {
                    date: currentDate,
                    groupId: groupId,
                    isHoliday: isHoliday,
                    note: note
                }
            });
            count++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }
    console.log(`Seeded ${count} service days.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
