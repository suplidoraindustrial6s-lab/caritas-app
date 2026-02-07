
import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Helper to format National ID (e.g. 12345678 -> 12.345.678)
function formatNationalId(id: string): string {
    const digits = id.replace(/\D/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Helper to infer gender
function inferGender(fullName: string): string {
    if (!fullName) return 'U';
    const firstWord = fullName.split(' ')[0].toLowerCase().trim();
    if (['jose', 'juan', 'manuel', 'miguel', 'angel', 'luis', 'carlos', 'jesus', 'pedro', 'raul', 'victor', 'julio', 'cesar', 'felix', 'adrian', 'ruben', 'david', 'jorge', 'francisco', 'wilfredy', 'orlando', 'omar', 'aristides', 'giovanni', 'balinger', 'efrain', 'homero', 'guillermo', 'claro', 'edaldo', 'ricky', 'rodolfo', 'delio', 'mauro', 'oscar'].includes(firstWord)) return 'M';
    if (['maria', 'ana', 'carmen', 'rosa', 'luisa', 'elena', 'isabel', 'laura', 'julia', 'paula', 'andrea', 'diana', 'sofia', 'lucia', 'valentina', 'teresa', 'nancy', 'eneida', 'magaly', 'niurka', 'beatriz', 'calixta', 'dayerlin', 'raiza', 'delia', 'elizabeth', 'nicolasa', 'marbelis', 'yolanda', 'trina', 'reimara', 'nohely', 'yoisimar', 'yinoska', 'wendy', 'nicola', 'clara', 'yackeline', 'anelis', 'genni', 'monica', 'migdalia'].includes(firstWord)) return 'F';

    if (firstWord.endsWith('a')) return 'F';
    if (firstWord.endsWith('o')) return 'M';
    return 'U';
}

// Helper to detect illness
function extractIllness(obs: string): string | undefined {
    if (!obs) return undefined;
    const lower = obs.toLowerCase();
    const keywords = ['diabet', 'hiperten', 'asma', 'cardiac', 'renal', 'cancer', 'neoplasia', 'artritis', 'discapaci', 'acv', 'trombosis', 'lupus', 'parkinson', 'alzheimer'];
    const found = keywords.find(k => lower.includes(k));
    if (found) {
        if (obs.length < 60) return obs;
        return `Posible: ${found.charAt(0).toUpperCase() + found.slice(1)}`;
    }
    return undefined;
}

// Helper to parse dates
function parseExcelDate(val: any): Date {
    if (val instanceof Date) return val;
    if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000));
    if (typeof val === 'string') {
        const cleaned = val.trim();
        const parts = cleaned.split('/');
        if (parts.length === 3 && parts[2].length === 4) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        const partsDash = cleaned.split('-');
        if (partsDash.length === 3) return new Date(parseInt(partsDash[0]), parseInt(partsDash[1]) - 1, parseInt(partsDash[2]));
        const parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
}

// Transcribed lists from images
const groupAssignments: Record<string, string[]> = {
    'Fe': [
        'Luis Parra', 'Edaldo Abreu', 'Claro Bañez', 'Ricky Ferreira', 'Genni Hernandez',
        'Eneida Lopez', 'Monica Garcia', 'Rodolfo Franco', 'Delio Baute', 'Mauro Zamora',
        'Migdalia Torres', 'Carmen León', 'Luis Arias', 'Juan Zarate', 'Carmen Querales',
        'Mary Carmen Alvis'
    ],
    'Esperanza': [
        'Wilfredy Ramirez', 'Orlando Mendoza', 'Eneida Rojas', 'Nancy Abarca', 'Nancy Tortoledo',
        'Magaly Rodriguez', 'Juan Rodriguez', 'Niurka Rivero', 'Beatriz Alvarez', 'Calixta Esequiel',
        'Omar Cardenas', 'Maria Laguna', 'Adrian Amaro', 'Dayerlin Barillas'
    ],
    'Caridad': [
        'Reverse Maican', 'Raiza Rendón', 'Delia Linares', 'Oscar Vivas', 'Elizabeth Rubio',
        'Nicolasa Medina', 'Marbelis Medina', 'Yolanda Timaure', 'Trina Duque', 'Guillermo Albarran',
        'Reimara Luna', 'Nohely Magdaleno'
    ],
    'Amor': [
        'Aristides Blanco', 'Giovanni Noguera', 'Balinger Quiñones', 'Yoisimar Silva', 'Yinoska Machado',
        'Wendy Salazar', 'Nicola Valvalle', 'Efrain Perez', 'Elizabeth Maican', 'Clara Montero',
        'Homero Contreras', 'Yackeline Piñango', 'Anelis Veliz'
    ]
};

function findGroupForPerson(name: string): string {
    const lowerName = name.toLowerCase().trim();
    for (const [group, members] of Object.entries(groupAssignments)) {
        for (const member of members) {
            const lowerMember = member.toLowerCase();
            // Partial match logic
            if (lowerName.includes(lowerMember) || lowerMember.includes(lowerName)) return group;
        }
    }
    return 'Lista de Espera';
}

async function main() {
    const filePath = path.join(process.cwd(), 'Base de datos Caritas.xlsx');

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    console.log(`Reading file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Read headers
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i];
        const rowStr = JSON.stringify(row).toLowerCase();
        if (rowStr.includes('nombre') || rowStr.includes('beneficiario') || rowStr.includes('cédula')) {
            headerRowIndex = i;
            break;
        }
    }

    const range = headerRowIndex !== -1 ? headerRowIndex : 0;
    const records: any[] = XLSX.utils.sheet_to_json(sheet, { range: range });

    console.log(`Processing ${records.length} records...`);

    // Ensure all groups exist
    const groupsMap: Record<string, number> = {};
    const groupNames = ['Lista de Espera', 'Fe', 'Esperanza', 'Caridad', 'Amor'];

    for (const gName of groupNames) {
        const g = await prisma.group.upsert({
            where: { name: gName },
            update: {},
            create: { name: gName, description: 'Grupo creado automáticamente' }
        });
        groupsMap[gName] = g.id;
    }

    let successCount = 0;

    for (const row of records) {
        try {
            const getValue = (keyPart: string) => {
                const key = Object.keys(row).find(k => k.toLowerCase().includes(keyPart.toLowerCase()));
                return key ? row[key] : undefined;
            }

            const fullName = (getValue('Nombre') || getValue('Beneficiario') || getValue('Nombres') || '').trim();
            let rawNationalId = String(getValue('Cédula') || getValue('Cedula') || getValue('ID') || '').trim();
            const rawAddress = (getValue('Direccion') || getValue('Dirección') || '').trim();
            const rawRegDate = getValue('Fecha') || getValue('Registro');
            const rawBirthDate = getValue('Nacimento') || getValue('Nacimiento');
            const rawPlaceOfBirth = (getValue('Lugar') || getValue('Nacimiento Lugar') || '').trim();
            const rawObs = (getValue('Observacion') || getValue('Observación') || '').trim();

            if (!fullName || fullName.length < 3) continue;

            const formattedId = formatNationalId(rawNationalId);
            let finalNationalId = formattedId;
            if (!finalNationalId || finalNationalId.length < 4) {
                finalNationalId = `NO-ID-${fullName.replace(/\s+/g, '-').toUpperCase().slice(0, 15)}-${Math.floor(Math.random() * 1000)}`;
            }

            let zone = 'Sin Zona';
            if (rawAddress) {
                const parts = rawAddress.split(',');
                if (parts.length > 0) zone = parts[parts.length - 1].trim();
            }

            let regDateStr = '';
            if (rawRegDate) {
                const d = parseExcelDate(rawRegDate);
                if (!isNaN(d.getTime())) regDateStr = d.toLocaleDateString('es-ES');
            }

            let birthDate = new Date();
            if (rawBirthDate) {
                const parsedBD = parseExcelDate(rawBirthDate);
                if (!isNaN(parsedBD.getTime()) && parsedBD.getFullYear() > 1900) birthDate = parsedBD;
            }

            const gender = inferGender(fullName);
            const chronicIllness = extractIllness(rawObs);
            const combinedObservations = `${rawObs ? rawObs + '. ' : ''}Fecha Registro Original: ${regDateStr}`.trim();

            // Assign Group
            const targetGroupName = findGroupForPerson(fullName);
            const targetGroupId = groupsMap[targetGroupName];

            // Use column place of birth or fallback
            const placeOfBirth = rawPlaceOfBirth || 'Importado';

            await prisma.beneficiary.upsert({
                where: { nationalId: finalNationalId },
                update: {
                    fullName,
                    address: rawAddress,
                    zone,
                    observations: combinedObservations,
                    birthDate: birthDate,
                    gender: gender,
                    chronicIllness: chronicIllness,
                    groupId: targetGroupId,
                    placeOfBirth: placeOfBirth
                },
                create: {
                    fullName,
                    nationalId: finalNationalId,
                    birthDate: birthDate,
                    gender: gender,
                    placeOfBirth: placeOfBirth,
                    address: rawAddress,
                    zone,
                    observations: combinedObservations,
                    chronicIllness: chronicIllness,
                    hasChildren: false,
                    groupId: targetGroupId
                }
            });

            successCount++;
            if (successCount % 10 === 0) process.stdout.write('.');

        } catch (error) {
            console.error(error);
        }
    }

    console.log(`\nUpgrade completed. ${successCount} records processed.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
