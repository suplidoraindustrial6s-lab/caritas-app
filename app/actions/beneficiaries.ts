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
    birthDate: Date
    placeOfBirth: string
    gender: string
    address: string
    chronicIllness?: string
    photoUrl?: string
    hasChildren: boolean
    observations?: string
    groupId?: number
    children?: ChildInput[]
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
        return { success: false, error: error.message || 'Error desconocido al registrar beneficiario.' };
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
    } catch (error) {
        console.error('Error updating beneficiary:', error);
        return { success: false, error: 'Error al actualizar beneficiario' };
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

export async function getBeneficiaries(filters?: { groupId?: number, search?: string }) {
    try {
        const where: any = {};
        if (filters?.groupId !== undefined) {
            where.groupId = filters.groupId;
        }
        if (filters?.search) {
            where.OR = [
                { fullName: { contains: filters.search } },
                { nationalId: { contains: filters.search } }
            ];
        }

        const beneficiaries = await prisma.beneficiary.findMany({
            where,
            orderBy: { fullName: 'asc' },
            include: { group: true }
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
