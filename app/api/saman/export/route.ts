import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import prisma from '@/app/lib/prisma';

/**
 * Convierte un objeto Date a número de serie de fecha de Excel (base 1900)
 */
function dateToExcelSerial(dateInput: Date | string): number {
    const d = new Date(dateInput);
    const utcMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const excelEpoch = Date.UTC(1899, 11, 30);
    return Math.round((utcMs - excelEpoch) / (1000 * 60 * 60 * 24));
}

/**
 * Asigna un valor escalar en una celda de SheetJS conservando las fórmulas existentes si no se sobreescribe
 */
function setCellValue(sheet: XLSX.WorkSheet, r: number, c: number, val: any, isDate = false) {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (val === undefined || val === null || val === '') {
        return;
    }
    if (isDate) {
        const serial = dateToExcelSerial(val);
        sheet[addr] = { t: 'n', v: serial, z: 'dd/mm/yyyy' };
        return;
    }
    if (typeof val === 'number' && !isNaN(val)) {
        sheet[addr] = { t: 'n', v: val };
    } else {
        sheet[addr] = { t: 's', v: String(val) };
    }
}

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
        let workbook: XLSX.WorkBook;

        if (fs.existsSync(templatePath)) {
            const fileBuffer = fs.readFileSync(templatePath);
            workbook = XLSX.read(fileBuffer, { type: 'buffer', cellFormula: true, cellNF: true });
        } else {
            workbook = XLSX.utils.book_new();
        }

        // 1. Vaciar registros en la hoja "1. SAMAN NIÑOS"
        const sheetNinosName = '1. SAMAN NIÑOS';
        const sheetNinos = workbook.Sheets[sheetNinosName];

        if (sheetNinos) {
            jornada.ninos.forEach((nino, idx) => {
                const r = idx + 1; // Fila 2 en Excel es índice 1 (0-indexed)
                const rowNum = r + 1;

                setCellValue(sheetNinos, r, 0, idx + 1); // A: N°
                setCellValue(sheetNinos, r, 1, jornada.diocesis); // B: DIOCESIS
                setCellValue(sheetNinos, r, 2, jornada.estado); // C: ESTADO
                setCellValue(sheetNinos, r, 3, jornada.municipio); // D: MUNICIPIO
                setCellValue(sheetNinos, r, 4, jornada.parroquiaCivil); // E: PARROQUIA CIVIL
                setCellValue(sheetNinos, r, 5, jornada.parroquiaEclesial); // F: PARROQUIA ECLESIAL / CENTRO CENTINELA
                setCellValue(sheetNinos, r, 6, jornada.comunidad); // G: SECTOR O COMUNIDAD
                setCellValue(sheetNinos, r, 7, nino.grupoEtnico || 'Mestizo'); // H: GRUPO ETNICO
                setCellValue(
                    sheetNinos,
                    r,
                    8,
                    /^\d+$/.test(nino.cedulaRepresentante) ? Number(nino.cedulaRepresentante) : nino.cedulaRepresentante
                ); // I: CÉDULA DE IDENTIDAD
                setCellValue(sheetNinos, r, 9, nino.edadRepresentante || 'Entre 18 - 49 años'); // J: EDAD acompañante
                setCellValue(sheetNinos, r, 10, nino.parentesco || 'MADRE'); // K: PARENTESCO
                setCellValue(sheetNinos, r, 11, nino.tipoIngreso || 'DIAGNOSTICO INICIAL'); // L: TIPO DE INGRESO
                setCellValue(sheetNinos, r, 12, nino.nroControl ?? 0); // M: N° Control

                // N: N° de Historia (fórmula institucional preservada)
                sheetNinos[XLSX.utils.encode_cell({ r, c: 13 })] = {
                    t: 's',
                    f: `AU${rowNum}&R${rowNum}&A${rowNum}`,
                    v: nino.codigoHistoria || `D25MR${idx + 1}`,
                };

                setCellValue(sheetNinos, r, 14, nino.nombres); // O: Nombres
                setCellValue(sheetNinos, r, 15, nino.apellidos); // P: Apellidos
                setCellValue(sheetNinos, r, 16, nino.sexo); // Q: Sexo
                setCellValue(sheetNinos, r, 17, nino.fechaNacimiento, true); // R: Fecha de Nacimiento
                setCellValue(sheetNinos, r, 18, jornada.fecha, true); // S: Fecha de Medición

                // T: Edad (Años y Meses) - Fórmula preservada
                sheetNinos[XLSX.utils.encode_cell({ r, c: 19 })] = {
                    t: 'n',
                    f: `IF(R${rowNum}="","",(S${rowNum}-R${rowNum})/365)`,
                    v: Number((nino.edadMeses / 12).toFixed(4)),
                };

                // U: Rango de Edad - Fórmula preservada
                sheetNinos[XLSX.utils.encode_cell({ r, c: 20 })] = {
                    t: 's',
                    f: `IF(R${rowNum}="","",IF(T${rowNum}<=0.6,"0-6 meses",IF(T${rowNum}<=2,"7-23 meses",IF(T${rowNum}<=5,"24-59 meses",IF(T${rowNum}>5,"Mayor a 5 años")))))`,
                    v: nino.rangoEdad || '24-59 meses',
                };

                setCellValue(sheetNinos, r, 21, nino.discapacidad || 'NO'); // V: ¿Tiene condición de discapacidad?
                setCellValue(sheetNinos, r, 22, nino.detalleDiscapacidad || ''); // W: ¿Cuál?
                setCellValue(sheetNinos, r, 23, nino.edema || 'NO'); // X: Edema
                if (nino.hemoglobina) setCellValue(sheetNinos, r, 24, nino.hemoglobina); // Y: Hemoglobina
                setCellValue(sheetNinos, r, 25, nino.cBrazoCm); // Z: C. BRAZO (cm)

                // AA: Clasificación PB - Fórmula preservada
                sheetNinos[XLSX.utils.encode_cell({ r, c: 26 })] = {
                    t: 's',
                    f: `IF(ISBLANK(Z${rowNum}),"ERROR",IF(AND(Z${rowNum}>=12.5,Z${rowNum}<=35),"Adecuado",IF(AND(Z${rowNum}<11.5,Z${rowNum}>=9),"Desnutrición aguda severa",IF(AND(Z${rowNum}>=11.5,Z${rowNum}<12.5),"Desnutrición aguda moderada",IF(AND(Z${rowNum}>=6,Z${rowNum}<9),"Referencia valoración médica",IF(Z${rowNum}<6,"Dato inválido",IF(Z${rowNum}>35,"Dato inválido")))))))`,
                    v: nino.clasificacionPb || 'Adecuado',
                };

                setCellValue(sheetNinos, r, 27, nino.tallaCm); // AB: TALLA (cm)
                setCellValue(sheetNinos, r, 28, nino.pesoKg); // AC: PESO (kg)
                setCellValue(sheetNinos, r, 29, nino.zScore); // AD: Z-Score (ZPT)

                // AE: Estado Nutricional - Fórmula preservada
                sheetNinos[XLSX.utils.encode_cell({ r, c: 30 })] = {
                    t: 's',
                    f: `IF(ISBLANK(AD${rowNum}),"ERROR",IF(AND(AD${rowNum}>3,AD${rowNum}<5),"Obesidad",IF(AND(AD${rowNum}>2,AD${rowNum}<=3),"Sobrepeso",IF(AND(AD${rowNum}<=2,AD${rowNum}>=-2),"Adecuado",IF(AND(AD${rowNum}>=-3,AD${rowNum}<-2),"Desnutrición aguda moderada",IF(AND(AD${rowNum}<-3,AD${rowNum}>-5),"Desnutrición aguda severa",IF(AD${rowNum}<=-5,"Dato inválido",IF(AD${rowNum}>=5,"Dato inválido"))))))))`,
                    v: nino.estadoNutricional,
                };

                setCellValue(sheetNinos, r, 31, nino.desparasitado || 'NO'); // AF: Desparasitado en la jornada
                setCellValue(sheetNinos, r, 32, nino.tratamientoProtocolo || 'Sin Tratamiento'); // AG: Tratamiento suministrado
                if (nino.cantidadSuministrada > 0) {
                    setCellValue(sheetNinos, r, 33, nino.cantidadSuministrada); // AH: Cantidad Suministrada
                }
                if (nino.otrosComplementos) {
                    setCellValue(sheetNinos, r, 34, nino.otrosComplementos); // AI: Otros Complementos
                }
                if (nino.observaciones) {
                    setCellValue(sheetNinos, r, 42, nino.observaciones); // AQ: Observaciones
                }
            });
        }

        // 2. Vaciar registros en la hoja "2. SAMAN EMBARAZADAS"
        const sheetMelName = '2. SAMAN EMBARAZADAS';
        const sheetMel = workbook.Sheets[sheetMelName];

        if (sheetMel) {
            jornada.embarazadas.forEach((mel, idx) => {
                const r = idx + 1; // Fila 2 en Excel es índice 1
                const rowNum = r + 1;

                setCellValue(sheetMel, r, 0, idx + 1); // A: #
                setCellValue(sheetMel, r, 1, jornada.diocesis); // B: DIOCESIS
                setCellValue(sheetMel, r, 2, jornada.estado); // C: ESTADO
                setCellValue(sheetMel, r, 3, jornada.municipio); // D: MUNICIPIO
                setCellValue(sheetMel, r, 4, jornada.parroquiaCivil); // E: PARROQUIA CIVIL
                setCellValue(sheetMel, r, 5, jornada.parroquiaEclesial); // F: PARROQUIA ECLESIAL / CENTRO CENTINELA
                setCellValue(sheetMel, r, 6, jornada.comunidad); // G: SECTOR O COMUNIDAD
                setCellValue(sheetMel, r, 7, mel.grupoEtnico || 'Mestizo'); // H: GRUPO ETNICO
                setCellValue(sheetMel, r, 8, jornada.fecha, true); // I: Fecha de Medición
                setCellValue(sheetMel, r, 9, mel.tipoIngreso || 'DIAGNOSTICO INICIAL'); // J: TIPO DE INGRESO
                setCellValue(sheetMel, r, 10, mel.nombre); // K: NOMBRE
                setCellValue(sheetMel, r, 11, mel.apellido); // L: APELLIDO
                setCellValue(sheetMel, r, 12, /^\d+$/.test(mel.cedula) ? Number(mel.cedula) : mel.cedula); // M: CÉDULA
                setCellValue(sheetMel, r, 13, mel.fechaNacimiento, true); // N: Fecha de Nacimiento
                setCellValue(sheetMel, r, 14, mel.estadoEmbarazoLactancia || 'EMBARAZADA'); // O: EMBARAZADA ó LACTANTE
                if (mel.semanaGestacion) {
                    setCellValue(sheetMel, r, 15, mel.semanaGestacion); // P: SEMANA DE GESTACIÓN
                }

                // Q: EDAD (fórmula preservada)
                sheetMel[XLSX.utils.encode_cell({ r, c: 16 })] = {
                    t: 'n',
                    f: `IF(N${rowNum}="","",((YEAR(I${rowNum})-YEAR(N${rowNum}))*12+MONTH(I${rowNum})-MONTH(N${rowNum}))/12)`,
                };

                setCellValue(sheetMel, r, 17, mel.edema || 'No'); // R: EDEMA
                setCellValue(sheetMel, r, 18, mel.pesoKg); // S: PESO (kg)
                setCellValue(sheetMel, r, 19, mel.tallaCm); // T: TALLA (cm)

                // U: IMC (fórmula preservada)
                sheetMel[XLSX.utils.encode_cell({ r, c: 20 })] = {
                    t: 'n',
                    f: `(S${rowNum}/((T${rowNum}/100)*(T${rowNum}/100)))`,
                    v: mel.imc,
                };

                // V: CLASIFICACIÓN NUTRICIONAL (fórmula preservada)
                sheetMel[XLSX.utils.encode_cell({ r, c: 21 })] = {
                    t: 's',
                    f: `IF(U${rowNum}<18.5,"Bajo Peso ",IF(AND(U${rowNum}>=18.5,U${rowNum}<25),"Adecuado ",IF(AND(U${rowNum}>=25,U${rowNum}<30),"Sobrepeso  ",IF(U${rowNum}>=30,"Obesidad","Obesidad"))))`,
                    v: mel.clasificacionNutricional,
                };

                setCellValue(sheetMel, r, 22, mel.cBrazoCm); // W: BRAZO (CM)

                // X: CLASIFICACIÓN NUTRICIONAL PB (fórmula preservada)
                sheetMel[XLSX.utils.encode_cell({ r, c: 23 })] = {
                    t: 's',
                    f: `IF(ISBLANK(W${rowNum}),"ERROR",IF(AND(W${rowNum}>=23,W${rowNum}<=50),"Peso Normal",IF(AND(W${rowNum}<23,W${rowNum}>=15),"Bajo peso",IF(W${rowNum}<15,"Dato inválido",IF(W${rowNum}>50,"Dato inválido")))))`,
                    v: mel.clasificacionPb,
                };

                setCellValue(sheetMel, r, 24, mel.desparasitada || 'NO'); // Y: Desparasitada
                setCellValue(sheetMel, r, 25, mel.tratamiento || 'Hierro+Ácido Fólico'); // Z: Tratamiento
                if (mel.cantidad > 0) {
                    setCellValue(sheetMel, r, 26, mel.cantidad); // AA: CANTIDAD
                }
                if (mel.observaciones) {
                    setCellValue(sheetMel, r, 28, mel.observaciones); // AC: Observaciones
                }
            });
        }

        const outBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const fechaStr = new Date(jornada.fecha).toISOString().slice(0, 10);
        const filename = `REPORTE_SAMAN_${jornada.parroquiaEclesial.replace(/\s+/g, '_')}_${fechaStr}.xlsx`;

        return new NextResponse(outBuffer, {
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
