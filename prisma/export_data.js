const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('Exportando datos...');

    const groups = await prisma.group.findMany();
    const beneficiaries = await prisma.beneficiary.findMany();
    const children = await prisma.child.findMany();
    const attendances = await prisma.attendance.findMany();
    const serviceDays = await prisma.serviceDay.findMany();

    const data = {
        groups,
        beneficiaries,
        children,
        attendances,
        serviceDays
    };

    fs.writeFileSync(
        path.join(__dirname, 'data_backup.json'),
        JSON.stringify(data, null, 2)
    );

    console.log(`Datos exportados:
  - Grupos: ${groups.length}
  - Beneficiarios: ${beneficiaries.length}
  - Hijos: ${children.length}
  - Asistencias: ${attendances.length}
  - Días de servicio: ${serviceDays.length}
  `);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
