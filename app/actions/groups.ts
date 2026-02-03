'use server'

import prisma from '@/app/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getGroups() {
    try {
        const groups = await prisma.group.findMany({
            include: {
                _count: {
                    select: { beneficiaries: true }
                }
            }
        });
        return { success: true, data: groups };
    } catch (error) {
        console.error('Error fetching groups:', error);
        return { success: false, error: 'Error al obtener los grupos' };
    }
}

export async function seedGroups() {
    const groupNames = ['Fe', 'Esperanza', 'Caridad', 'Amor'];

    try {
        for (const name of groupNames) {
            await prisma.group.upsert({
                where: { name },
                update: {},
                create: {
                    name,
                    description: `Grupo de atención ${name}`
                }
            });
        }
        return { success: true, message: 'Grupos inicializados correctamente' };
    } catch (error) {
        console.error('Error seeding groups:', error);
        return { success: false, error: 'Error al inicializar grupos' };
    }
}
