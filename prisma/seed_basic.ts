import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const groups = [
        { name: 'Fe', description: 'Grupo de Fe' },
        { name: 'Esperanza', description: 'Grupo de Esperanza' },
        { name: 'Caridad', description: 'Grupo de Caridad' },
        { name: 'Amor', description: 'Grupo de Amor' },
        { name: 'Lista de Espera', description: 'Beneficiarios en espera' },
    ]

    for (const group of groups) {
        await prisma.group.upsert({
            where: { name: group.name },
            update: {},
            create: group,
        })
    }

    console.log('Grupos sembrados correctamente.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
