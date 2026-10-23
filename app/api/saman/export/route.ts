import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import prisma from '@/app/lib/prisma';
import { exportSamanOficialZip } from '@/app/lib/saman-excel-preserver';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const jornadaIdParam = searchParams.get('jornadaId');

        let jornada = null;
        if (jornadaIdParam) {
            jornada = await prisma.jornadasSAMAN.findUnique({
                where: { id: Number(jornadaIdParam) },
                include: {
                    ninos: { orderBy: { id: 'asc' } },
                    embarazadas: { orderBy: { id: 'asc' } },
                },
            });
        } else {
            jornada = await prisma.jornadasSAMAN.findFirst({
                orderBy: { fecha: 'desc' },
                include: {
                    ninos: { orderBy: { id: 'asc' } },
                    embarazadas: { orderBy: { id: 'asc' } },
                },
            });
        }

        if (!jornada) {
            return NextResponse.json({ error: 'No se encontró la jornada SAMÁN para exportar' }, { status: 404 });
        }

        const templatePath = path.join(process.cwd(), 'plantilla_saman_oficial.xlsx');
        if (!fs.existsSync(templatePath)) {
            return NextResponse.json({ error: 'No se encontró la plantilla oficial plantilla_saman_oficial.xlsx' }, { status: 500 });
        }

        // Genera el archivo Excel inyectando los datos sobre el ZIP binario oficial intacto
        const outBuffer = await exportSamanOficialZip(jornada, templatePath);

        const fechaStr = new Date(jornada.fecha).toISOString().slice(0, 10);
        const filename = `REPORTE_SAMAN_${jornada.parroquiaEclesial.replace(/\s+/g, '_')}_${fechaStr}.xlsx`;

        return new NextResponse(outBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Error exportando Excel SAMÁN:', error);
        return NextResponse.json({ error: 'Error al generar el archivo Excel de SAMÁN' }, { status: 500 });
    }
}
