'use server'

import prisma from '@/app/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Definir tipos para los datos de entrada
type ChildInput = {
    fullName: string
    gender: string
    nationalId?: string
    birthDate: Date
    isStudying: boolean
    observations?: string
}

type BeneficiaryInput = {
    fullName: string
    nationalId: string
    phoneNumber?: string
    birthDate: Date
    placeOfBirth: string
    gender: string
    address: string
    zone?: string
    chronicIllness?: string
    photoUrl?: string
    hasChildren: boolean
    observations?: string
    groupId?: number
    children?: ChildInput[]
    status?: string
}

export async function createBeneficiary(data: BeneficiaryInput) {
    try {
        const { children, ...beneficiaryData } = data;

        const newBeneficiary = await prisma.beneficiary.create({
            data: {
                ...beneficiaryData,
                children: {
                    create: children || []
                }
            }
        });
        revalidatePath('/dashboard/beneficiaries');
        return { success: true, data: newBeneficiary };
    } catch (error: any) {
        console.error('Error creating beneficiary:', error);
        if (error.code === 'P2002') {
            return { success: false, error: 'Ya existe un beneficiario registrado con esta Cédula de Identidad.' };
        }
        return { success: false, error: 'Error al registrar beneficiario. Por favor verifique los datos.' };
    }
}

export async function updateBeneficiary(id: number, data: Partial<BeneficiaryInput>) {
    try {
        const { children, ...rest } = data;

        // Explicit cast/cleaning of beneficiary data to ensure types match Prisma's expectactions
        const beneficiaryData: any = { ...rest };

        // Transaction to update beneficiary and handle children
        const updated = await prisma.$transaction(async (tx: any) => {
            const b = await tx.beneficiary.update({
                where: { id },
                data: beneficiaryData
            });

            if (children !== undefined) {
                // Delete existing
                await tx.child.deleteMany({
                    where: { beneficiaryId: id }
                });

                // Create new one by one to avoid any createMany limitation in certain adapters/versions
                if (children.length > 0) {
                    for (const child of children) {
                        await tx.child.create({
                            data: {
                                ...child,
                                beneficiaryId: id
                            }
                        });
                    }
                }
            }

            return b;
        });

        revalidatePath(`/dashboard/beneficiaries/${id}`);
        revalidatePath('/dashboard/beneficiaries');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('Error updating beneficiary:', error);
        if (error.code === 'P2002') {
            return { success: false, error: 'Ya existe otro beneficiario registrado con esta Cédula de Identidad.' };
        }
        return { success: false, error: 'Error al actualizar beneficiario. Por favor intente nuevamente.' };
    }
}

export async function moveBeneficiary(id: number, targetGroupId: number | null) {
    try {
        const updated = await prisma.beneficiary.update({
            where: { id },
            data: { groupId: targetGroupId }
        });
        revalidatePath('/dashboard/beneficiaries');
        revalidatePath('/dashboard/groups');
        return { success: true, data: updated };
    } catch (error) {
        console.error('Error moving beneficiary:', error);
        return { success: false, error: 'Error al mover beneficiario' };
    }
}


export async function updateBeneficiaryStatus(id: number, status: string) {
    try {
        const updated = await prisma.beneficiary.update({
            where: { id },
            data: { status }
        });
        revalidatePath('/dashboard/beneficiaries');
        return { success: true, data: updated };
    } catch (error) {
        console.error('Error updating status:', error);
        return { success: false, error: 'Error al actualizar estatus' };
    }
}

export async function getBeneficiaries(filters?: { groupId?: number, search?: string }) {
    try {
        const where: any = {};
        if (filters?.groupId !== undefined) {
            where.groupId = filters.groupId;
        }
        if (filters?.search) {
            where.OR = [
                { fullName: { contains: filters.search } },
                { nationalId: { contains: filters.search } },
                { phoneNumber: { contains: filters.search } }
            ];
        }

        const beneficiaries = await prisma.beneficiary.findMany({
            where,
            orderBy: { fullName: 'asc' },
            include: {
                group: true,
                attendances: {
                    take: 1,
                    orderBy: { date: 'desc' },
                    select: { date: true }
                }
            }
        });
        return { success: true, data: beneficiaries };
    } catch (error) {
        console.error('Error fetching beneficiaries:', error);
        return { success: false, error: 'Error al obtener beneficiarios' };
    }
}

export async function getBeneficiaryById(id: number) {
    try {
        const beneficiary = await prisma.beneficiary.findUnique({
            where: { id },
            include: {
                group: true,
                children: true,
                attendances: {
                    orderBy: { date: 'desc' },
                    take: 10
                }
            }
        });
        return { success: true, data: beneficiary };
    } catch (error) {
        console.error('Error fetching beneficiary:', error);
        return { success: false, error: 'Error al obtener detalles del beneficiario' };
    }
}

export async function deleteBeneficiary(id: number) {
    try {
        await prisma.beneficiary.delete({
            where: { id }
        });
        revalidatePath('/dashboard/beneficiaries');
        revalidatePath('/dashboard/groups');
        return { success: true };
    } catch (error) {
        console.error('Error deleting beneficiary:', error);
        return { success: false, error: 'Error al eliminar beneficiario' };
    }
}
