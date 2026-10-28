import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

function escapeXml(str: any): string {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function dateToExcelSerial(dateInput: Date | string): number {
    const d = new Date(dateInput);
    const utcMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const excelEpoch = Date.UTC(1899, 11, 30);
    return Math.round((utcMs - excelEpoch) / (1000 * 60 * 60 * 24));
}

function cellVal(col: string, row: number, val: any, styleId?: number, isDate = false): string {
    const sAttr = styleId ? ` s="${styleId}"` : '';
    if (val === null || val === undefined || val === '') {
        return `<c r="${col}${row}"${sAttr}/>`;
    }
    if (isDate) {
        const serial = dateToExcelSerial(val);
        return `<c r="${col}${row}"${sAttr}><v>${serial}</v></c>`;
    }
    if (typeof val === 'number') {
        return `<c r="${col}${row}"${sAttr}><v>${val}</v></c>`;
    }
    return `<c r="${col}${row}"${sAttr} t="inlineStr"><is><t>${escapeXml(String(val).toUpperCase().trim())}</t></is></c>`;
}

function cellFormula(col: string, row: number, f: string, v: string = '', styleId?: number): string {
    const sAttr = styleId ? ` s="${styleId}"` : '';
    const vTag = v ? `<v>${escapeXml(v)}</v>` : '<v/>';
    return `<c r="${col}${row}"${sAttr} t="str"><f>${escapeXml(f)}</f>${vTag}</c>`;
}

export function buildNinoRowXml(nino: any, idx: number, jornada: any): string {
    const r = idx + 2;
    const c: string[] = [];

    c.push(`<c r="A${r}" s="812"><v>${idx + 1}</v></c>`);
    c.push(cellVal('B', r, jornada.diocesis || 'MARACAY', 123));
    c.push(cellVal('C', r, jornada.estado || 'ARAGUA', 131));
    c.push(cellVal('D', r, jornada.municipio || 'MBI', 124));
    c.push(cellVal('E', r, jornada.parroquiaCivil || 'EL LIMÓN', 543));
    c.push(cellVal('F', r, jornada.parroquiaEclesial || 'LA MILAGROSA', 124));
    c.push(cellVal('G', r, jornada.comunidad || 'TEJERÍAS', 681));
    c.push(cellVal('H', r, nino.grupoEtnico || 'Mestizo', 125));
    c.push(cellVal('I', r, nino.cedulaRepresentante, 742));
    c.push(cellVal('J', r, nino.edadRepresentante || 'Entre 18 - 49 años', 126));
    c.push(cellVal('K', r, nino.parentesco || 'MADRE', 701));
    c.push(cellVal('L', r, nino.tipoIngreso || 'DIAGNOSTICO INICIAL', 126));
    c.push(cellVal('M', r, nino.nroControl ?? 0, 125));
    c.push(cellFormula('N', r, `AU${r}&R${r}&A${r}`, nino.codigoHistoria || `D25MR${idx + 1}`, 132));
    c.push(cellVal('O', r, nino.nombres, 478));
    c.push(cellVal('P', r, nino.apellidos, 478));
    c.push(cellVal('Q', r, nino.sexo, 125));
    c.push(cellVal('R', r, nino.fechaNacimiento, 127, true));
    c.push(cellVal('S', r, jornada.fecha, 127, true));
    const edadAnios = nino.edadMeses ? Number((nino.edadMeses / 12).toFixed(4)) : '';
    const rangoEdad = nino.rangoEdad || '';

    c.push(cellFormula('T', r, `IF(R${r}="","",(S${r}-R${r})/365)`, edadAnios ? String(edadAnios) : '', 133));
    c.push(cellFormula('U', r, `IF(R${r}="","",IF(T${r}<=0.6,"0-6 meses",IF(T${r}<=2,"7-23 meses",IF(T${r}<=5,"24-59 meses",IF(T${r}>5,"Mayor a 5 años")))))`, rangoEdad, 134));
    c.push(cellVal('V', r, nino.discapacidad || 'NO', 125));
    c.push(cellVal('W', r, nino.detalleDiscapacidad || '', 125));
    c.push(cellVal('X', r, nino.edema || 'NO', 125));
    c.push(cellVal('Y', r, nino.hemoglobina || '', 125));
    c.push(cellVal('Z', r, nino.cBrazoCm, 128));
    c.push(cellFormula('AA', r, `IF(ISBLANK(Z${r}),"ERROR",IF(AND(Z${r}>=12.5,Z${r}<=35),"Adecuado",IF(AND(Z${r}<11.5,Z${r}>=9),"Desnutrición aguda severa",IF(AND(Z${r}>=11.5,Z${r}<12.5),"Desnutrición aguda moderada",IF(AND(Z${r}>=6,Z${r}<9),"Referencia valoración médica",IF(Z${r}<6,"Dato inválido",IF(Z${r}>35,"Dato inválido")))))))`, nino.clasificacionPb || 'Adecuado', 692));
    c.push(cellVal('AB', r, nino.tallaCm, 128));
    c.push(cellVal('AC', r, nino.pesoKg, 128));
    c.push(cellVal('AD', r, nino.zScore, 635));
    c.push(cellFormula('AE', r, `IF(ISBLANK(AD${r}),"ERROR",IF(AND(AD${r}>3,AD${r}<5),"Obesidad",IF(AND(AD${r}>2,AD${r}<=3),"Sobrepeso",IF(AND(AD${r}<=2,AD${r}>=-2),"Adecuado",IF(AND(AD${r}>=-3,AD${r}<-2),"Desnutrición aguda moderada",IF(AND(AD${r}<3,AD${r}>-5),"Desnutrición aguda severa",IF(AD${r}<=-5,"Dato inválido",IF(AD${r}>=5,"Dato inválido"))))))))`, nino.estadoNutricional || 'Adecuado', 131));
    c.push(cellVal('AF', r, nino.desparasitado || 'NO', 479));
    c.push(cellVal('AG', r, nino.tratamientoProtocolo || 'Sin Tratamiento', 690));
    c.push(cellVal('AH', r, nino.cantidadSuministrada > 0 ? nino.cantidadSuministrada : '', 481));
    c.push(cellVal('AI', r, nino.otrosComplementos || 'Ninguno', 689));

    // Columnas AJ a AO (Exclusivas Salida de Vivero)
    if (nino.tipoIngreso === 'SALIDA DE VIVERO') {
        c.push(cellVal('AJ', r, nino.fechaInicioVivero, 480, true));
        c.push(cellVal('AK', r, nino.fechaSalidaVivero || jornada.fecha, 127, true));
        c.push(cellVal('AL', r, nino.zScoreEntrada !== null ? nino.zScoreEntrada : '', 125));
        c.push(cellVal('AM', r, nino.zScoreSalida !== null ? nino.zScoreSalida : nino.zScore, 125));
        c.push(cellVal('AN', r, nino.semanasVivero || '', 128));
        c.push(cellVal('AO', r, nino.situacionSalida || 'RECUPERADO', 128));
    } else {
        c.push(`<c r="AJ${r}" s="480"/>`);
        c.push(`<c r="AK${r}" s="127"/>`);
        c.push(`<c r="AL${r}" s="125"/>`);
        c.push(`<c r="AM${r}" s="125"/>`);
        c.push(`<c r="AN${r}" s="128"/>`);
        c.push(`<c r="AO${r}" s="128"/>`);
    }

    c.push(cellVal('AP', r, nino.referidoMedico || 'NO', 125));
    c.push(cellVal('AQ', r, nino.observaciones || '', 705));
    c.push(cellFormula('AR', r, `IF(D${r}="","",TEXT(S${r},"MMMM"))`, '', 96));
    c.push(cellFormula('AS', r, `IF(F${r}="","",TEXT(S${r},"YYYY"))`, '', 96));
    c.push(cellFormula('AT', r, `B${r}&" - "&E${r}`, '', 132));
    c.push(cellFormula('AU', r, `IFERROR(VLOOKUP(B${r},adm!$C$2:$E$36,3,FALSE),"")`, '', 477));
    c.push(cellVal('AV', r, nino.proyectoTengo || 'NO', 258));

    return `<row r="${r}" spans="1:53" ht="15" customHeight="1" x14ac:dyDescent="0.25">${c.join('')}</row>`;
}

export function buildMelRowXml(mel: any, idx: number, jornada: any): string {
    const r = idx + 2;
    const c: string[] = [];

    c.push(`<c r="A${r}" s="424"><v>${idx + 1}</v></c>`);
    c.push(cellVal('B', r, jornada.diocesis || 'MARACAY', 678));
    c.push(cellVal('C', r, jornada.estado || 'ARAGUA', 138));
    c.push(cellVal('D', r, jornada.municipio || 'MBI', 137));
    c.push(cellVal('E', r, jornada.parroquiaCivil || 'EL LIMÓN', 137));
    c.push(cellVal('F', r, jornada.parroquiaEclesial || 'LA MILAGROSA', 129));
    c.push(cellVal('G', r, jornada.comunidad || 'TEJERÍAS', 138));
    c.push(cellVal('H', r, mel.grupoEtnico || 'Mestizo', 138));
    c.push(cellVal('I', r, jornada.fecha, 127, true));
    c.push(cellVal('J', r, mel.tipoIngreso || 'DIAGNOSTICO INICIAL', 138));
    c.push(cellVal('K', r, mel.nombre, 137));
    c.push(cellVal('L', r, mel.apellido, 709));
    c.push(cellVal('M', r, mel.cedula, 743));
    c.push(cellVal('N', r, mel.fechaNacimiento, 480, true));
    c.push(cellVal('O', r, mel.estadoEmbarazoLactancia || 'EMBARAZADA', 137));
    c.push(cellVal('P', r, mel.semanaGestacion || '', 139));
    const fechaMedicion = new Date(jornada.fecha);
    const fechaNac = mel.fechaNacimiento ? new Date(mel.fechaNacimiento) : null;
    let edadMel = '';
    if (fechaNac) {
        edadMel = String(
            Number(
                (
                    ((fechaMedicion.getFullYear() - fechaNac.getFullYear()) * 12 +
                        fechaMedicion.getMonth() -
                        fechaNac.getMonth()) /
                    12
                ).toFixed(1)
            )
        );
    }

    c.push(cellFormula('Q', r, `IF(N${r}="","",((YEAR(I${r})-YEAR(N${r}))*12+MONTH(I${r})-MONTH(N${r}))/12)`, edadMel, 145));
    c.push(cellVal('R', r, mel.edema || 'No', 140));
    c.push(cellVal('S', r, mel.pesoKg, 141));
    c.push(cellVal('T', r, mel.tallaCm, 141));
    c.push(cellFormula('U', r, `(S${r}/((T${r}/100)*(T${r}/100)))`, String(mel.imc || ''), 683));
    c.push(cellFormula('V', r, `IF(U${r}<18.5,"Bajo Peso ",IF(AND(U${r}>=18.5,U${r}<25),"Adecuado ",IF(AND(U${r}>=25,U${r}<30),"Sobrepeso  ",IF(U${r}>=30,"Obesidad","Obesidad"))))`, mel.clasificacionNutricional || 'Adecuado', 740));
    c.push(cellVal('W', r, mel.cBrazoCm, 141));
    c.push(cellFormula('X', r, `IF(ISBLANK(W${r}),"ERROR",IF(AND(W${r}>=23,W${r}<=50),"Peso Normal",IF(AND(W${r}<23,W${r}>=15),"Bajo peso",IF(W${r}<15,"Dato inválido",IF(W${r}>50,"Dato inválido")))))`, mel.clasificacionPb || 'Peso Normal', 146));
    c.push(cellVal('Y', r, mel.desparasitada || 'NO', 128));
    c.push(cellVal('Z', r, mel.tratamiento || 'Hierro+Ácido Fólico', 141));
    c.push(cellVal('AA', r, mel.cantidad > 0 ? mel.cantidad : '', 141));
    c.push(cellVal('AB', r, mel.situacionSalida || '', 141));
    c.push(cellVal('AC', r, mel.observaciones || '', 258));
    c.push(cellFormula('AD', r, `IF(I${r}="","",TEXT(I${r},"MMMM"))`, '', 473));
    c.push(cellFormula('AE', r, `IF(I${r}="","",TEXT(I${r},"YYYY"))`, '', 473));
    c.push(cellFormula('AF', r, `Tabla3[[#This Row],[DIOCESIS]]&" "&"-"&" "&Tabla3[[#This Row],[PARROQUIA ECLESIAL / CENTRO CENTINELA]]`, '', 474));

    return `<row r="${r}" spans="1:35" x14ac:dyDescent="0.25">${c.join('')}</row>`;
}

export function patchWorksheetXml(originalXml: string, generatedRowsXml: string[]): string {
    const sheetDataStart = originalXml.indexOf('<sheetData');
    const sheetDataEnd = originalXml.indexOf('</sheetData>');
    if (sheetDataStart === -1 || sheetDataEnd === -1) return originalXml;

    const openTagEnd = originalXml.indexOf('>', sheetDataStart) + 1;
    const sheetDataContent = originalXml.substring(openTagEnd, sheetDataEnd);

    // Conservar la fila 1 (los encabezados con sus colores oficiales exactos)
    const row1Match = sheetDataContent.match(/<row [^>]*r="1"[^>]*>[\s\S]*?<\/row>/);
    const row1 = row1Match ? row1Match[0] : '';

    const newSheetData = `<sheetData>${row1}${generatedRowsXml.join('')}</sheetData>`;
    return originalXml.substring(0, sheetDataStart) + newSheetData + originalXml.substring(sheetDataEnd + 12);
}

export async function exportSamanOficialZip(jornada: any, templatePath: string): Promise<Buffer> {
    const templateBuffer = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(templateBuffer);

    const ninosRowsXml = (jornada.ninos || []).map((n: any, idx: number) => buildNinoRowXml(n, idx, jornada));
    const melRowsXml = (jornada.embarazadas || []).map((m: any, idx: number) => buildMelRowXml(m, idx, jornada));

    // Modificar 1. SAMAN NIÑOS (sheet6.xml)
    const sheet6File = zip.file('xl/worksheets/sheet6.xml');
    if (sheet6File) {
        const sheet6Xml = await sheet6File.async('string');
        const patched6 = patchWorksheetXml(sheet6Xml, ninosRowsXml);
        zip.file('xl/worksheets/sheet6.xml', patched6);
    }

    // Modificar 2. SAMAN EMBARAZADAS (sheet7.xml)
    const sheet7File = zip.file('xl/worksheets/sheet7.xml');
    if (sheet7File) {
        const sheet7Xml = await sheet7File.async('string');
        const patched7 = patchWorksheetXml(sheet7Xml, melRowsXml);
        zip.file('xl/worksheets/sheet7.xml', patched7);
    }

    // Forzar en workbook.xml el recálculo automático completo al abrir en Excel
    const wbFile = zip.file('xl/workbook.xml');
    if (wbFile) {
        let wbXml = await wbFile.async('string');
        if (wbXml.includes('<calcPr ')) {
            wbXml = wbXml.replace(/<calcPr [^>]*\/>/, '<calcPr fullCalcOnLoad="1" forceFullCalc="1"/>');
        } else {
            wbXml = wbXml.replace('</workbook>', '<calcPr fullCalcOnLoad="1" forceFullCalc="1"/></workbook>');
        }
        zip.file('xl/workbook.xml', wbXml);
    }

    return await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });
}
