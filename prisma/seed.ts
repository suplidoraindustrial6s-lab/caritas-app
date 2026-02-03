import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const groupNames = ['Fe', 'Esperanza', 'Caridad', 'Amor', 'Lista de Espera']

    console.log('Start seeding...')
    for (const name of groupNames) {
        const group = await prisma.group.upsert({
            where: { name },
            update: {},
            create: {
                name,
                description: name === 'Lista de Espera' ? 'Beneficiarios en espera de asignación' : `Grupo de atención ${name}`
            },
        })
        console.log(`Created group with id: ${group.id}`)
    }
    console.log('Seeding finished.')
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
