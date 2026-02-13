import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const group = await prisma.group.findUnique({
            where: { id: Number(id) },
            include: {
                beneficiaries: {
                    where: { status: 'Activo' },
                    orderBy: { fullName: 'asc' }
                }
            }
        });

        if (!group) {
            return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
        }

        return NextResponse.json(group);
    } catch (error) {
        console.error('Error fetching group:', error);
        return NextResponse.json({ error: 'Error al obtener el grupo' }, { status: 500 });
    }
}
