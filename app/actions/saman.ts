'use server';

import prisma from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
    calcularEdadMeses,
    calcularRangoEdad,
    clasificarPbNino,
    clasificarZScoreNino,
    calcularImcMel,
    clasificarImcMel,
    clasificarPbMel,
} from '@/app/lib/saman-calculations';

/**
 * Calcula los 11 indicadores institucionales en vivo de una jornada SAMÁN
 */
function calcularIndicadoresJornada(ninos: any[], embarazadas: any[]) {
    let totalNinos = ninos.length;
    let totalAdecuados = 0;
    let totalRN = 0;
    let totalDAM = 0;
    let totalDAS = 0;

    let totalMicronutrientes = 0;
    let totalPlumpyAmarillo = 0;
    let totalPlumpyRojo = 0;
    let totalPlumpyMum = 0;

    for (const n of ninos) {
        const z = Number(n.zScore);
        const meses = Number(n.edadMeses);

        // Clasificación estricta según lineamientos Cáritas:
        // DAS: <= -3.01
        // DAM: de -2.01 a -3
        // RN: de -1 a -2 y menores de 2 años (< 24 meses)
        // Adecuados: >= -0.99 (o entre -1 y -2 con >= 24 meses)
        if (z <= -3.01 || n.estadoNutricional === 'Desnutrición aguda severa') {
            totalDAS++;
        } else if ((z <= -2.01 && z >= -3.0) || n.estadoNutricional === 'Desnutrición aguda moderada') {
            totalDAM++;
        } else if ((z <= -1.0 && z >= -2.0 && meses < 24) || n.estadoNutricional === 'Riesgo Nutricional') {
            totalRN++;
        } else {
            totalAdecuados++;
        }

        // Contabilizar insumos entregados (sobres / unidades y entregas)
        if (n.micronutrientes) {
            totalMicronutrientes += n.cantMicronutrientes > 0 ? n.cantMicronutrientes : 1;
        }
        if (n.plumpyAmarillo) {
            totalPlumpyAmarillo += n.cantPlumpyAmarillo > 0 ? n.cantPlumpyAmarillo : 1;
        }
        if (n.plumpyRojo) {
            totalPlumpyRojo += n.cantPlumpyRojo > 0 ? n.cantPlumpyRojo : 1;
        }
        if (n.plumpyMum) {
            totalPlumpyMum += n.cantPlumpyMum > 0 ? n.cantPlumpyMum : 1;
        }
    }

    let totalMel = embarazadas.length;
    let totalMelBajoPeso = 0;

    for (const m of embarazadas) {
        const pb = Number(m.cBrazoCm);
        const imc = Number(m.imc);
        const esBajoPeso =
            (pb > 0 && pb <= 22.1) ||
            (imc > 0 && imc < 18.5) ||
            (m.clasificacionPb && m.clasificacionPb.toLowerCase().includes('bajo')) ||
            (m.clasificacionNutricional && m.clasificacionNutricional.toLowerCase().includes('bajo'));

        if (esBajoPeso) {
            totalMelBajoPeso++;
        }

        if (m.plumpyMum || (m.tratamiento && m.tratamiento.toLowerCase().includes('plumpy'))) {
            totalPlumpyMum += m.cantPlumpyMum > 0 ? m.cantPlumpyMum : m.cantidad > 0 ? m.cantidad : 1;
        }
        if (m.micronutrientes || (m.tratamiento && (m.tratamiento.toLowerCase().includes('hierro') || m.tratamiento.toLowerCase().includes('vitamin') || m.tratamiento.toLowerCase().includes('prenatal')))) {
            totalMicronutrientes += m.cantMicronutrientes > 0 ? m.cantMicronutrientes : m.cantidad > 0 ? m.cantidad : 1;
        }
    }

    return {
        totalNinos,
        totalAdecuados,
        totalRN,
        totalDAM,
        totalDAS,
        totalMicronutrientes,
        totalPlumpyAmarillo,
        totalPlumpyRojo,
        totalPlumpyMum,
        totalMel,
        totalMelBajoPeso,
    };
}

/**
 * Obtiene todas las jornadas SAMÁN registradas y el detalle completo de la jornada seleccionada
 */
export async function obtenerDatosModuloSaman(jornadaIdSeleccionada?: number) {
    try {
        let jornadas = await prisma.jornadasSAMAN.findMany({
            orderBy: { fecha: 'desc' },
            include: {
                _count: {
                    select: { ninos: true, embarazadas: true },
                },
            },
        });

        // Si no existe ninguna jornada aún, crear una jornada inicial por defecto
        if (jornadas.length === 0) {
            const nueva = await prisma.jornadasSAMAN.create({
                data: {
                    fecha: new Date(),
                    diocesis: 'MARACAY',
                    estado: 'ARAGUA',
                    municipio: 'MBI',
                    parroquiaCivil: 'EL LIMÓN',
                    parroquiaEclesial: 'LA MILAGROSA',
                    centro: 'MARACAY - EL LIMÓN',
                    comunidad: 'TEJERÍAS',
                    estatus: 'ABIERTA',
                },
                include: {
                    _count: {
                        select: { ninos: true, embarazadas: true },
                    },
                },
            });
            jornadas = [nueva];
        }

        const idActivo = jornadaIdSeleccionada || jornadas[0].id;

        const jornadaActiva = await prisma.jornadasSAMAN.findUnique({
            where: { id: idActivo },
            include: {
                ninos: {
                    orderBy: { id: 'asc' },
                },
                embarazadas: {
                    orderBy: { id: 'asc' },
                },
            },
        });

        if (!jornadaActiva) {
            return { success: false, error: 'Jornada no encontrada' };
        }

        const indicadores = calcularIndicadoresJornada(jornadaActiva.ninos, jornadaActiva.embarazadas);

        return {
            success: true,
            data: {
                jornadas,
                jornadaActiva,
                indicadores,
            },
        };
    } catch (error) {
        console.error('Error al obtener datos de SAMÁN:', error);
        return { success: false, error: 'Error al cargar datos del módulo SAMÁN' };
    }
}

/**
 * Crea una nueva jornada SAMÁN con los datos fijos parroquiales
 */
export async function crearJornadaSaman(datos: {
    fecha: string;
    diocesis?: string;
    estado?: string;
    municipio?: string;
    parroquiaCivil?: string;
    parroquiaEclesial?: string;
    centro?: string;
    comunidad?: string;
}) {
    try {
        const fechaParsed = datos.fecha ? new Date(datos.fecha + 'T12:00:00') : new Date();
        const nueva = await prisma.jornadasSAMAN.create({
            data: {
                fecha: fechaParsed,
                diocesis: (datos.diocesis || 'MARACAY').toUpperCase(),
                estado: (datos.estado || 'ARAGUA').toUpperCase(),
                municipio: (datos.municipio || 'MBI').toUpperCase(),
                parroquiaCivil: (datos.parroquiaCivil || 'EL LIMÓN').toUpperCase(),
                parroquiaEclesial: (datos.parroquiaEclesial || 'LA MILAGROSA').toUpperCase(),
                centro: (datos.centro || 'MARACAY - EL LIMÓN').toUpperCase(),
                comunidad: (datos.comunidad || 'TEJERÍAS').toUpperCase(),
                estatus: 'ABIERTA',
            },
        });

        revalidatePath('/dashboard/saman');
        return { success: true, data: nueva };
    } catch (error) {
        console.error('Error al crear jornada SAMÁN:', error);
        return { success: false, error: 'No se pudo crear la jornada SAMÁN' };
    }
}

/**
 * Busca el historial evolutivo de niños asociados a la cédula del representante
 */
export async function buscarHistorialNinoPorCedula(cedula: string) {
    try {
        const limpia = cedula.replace(/\D/g, '').trim();
        if (!limpia || limpia.length < 4) {
            return { success: true, data: [] };
        }

        const registros = await prisma.registroSamanNinos.findMany({
            where: {
                cedulaRepresentante: {
                    contains: limpia,
                },
            },
            include: {
                jornada: true,
            },
            orderBy: [
                { jornada: { fecha: 'desc' } },
                { id: 'desc' },
            ],
            take: 15,
        });

        // Agrupar por nombre completo del niño para mostrar la última medición de cada hijo del representante
        const mapaUltimaMedicion = new Map<string, any>();
        for (const reg of registros) {
            const clave = `${reg.nombres.trim().toUpperCase()} ${reg.apellidos.trim().toUpperCase()}`;
            if (!mapaUltimaMedicion.has(clave)) {
                mapaUltimaMedicion.set(clave, {
                    id: reg.id,
                    cedulaRepresentante: reg.cedulaRepresentante,
                    edadRepresentante: reg.edadRepresentante,
                    parentesco: reg.parentesco,
                    grupoEtnico: reg.grupoEtnico,
                    nombres: reg.nombres,
                    apellidos: reg.apellidos,
                    sexo: reg.sexo,
                    fechaNacimiento: reg.fechaNacimiento,
                    discapacidad: reg.discapacidad,
                    detalleDiscapacidad: reg.detalleDiscapacidad,
                    ultimaFechaMedicion: reg.jornada.fecha,
                    cBrazoCm: reg.cBrazoCm,
                    tallaCm: reg.tallaCm,
                    pesoKg: reg.pesoKg,
                    zScore: reg.zScore,
                    estadoNutricional: reg.estadoNutricional,
                    clasificacionPb: reg.clasificacionPb,
                    nroControlPrevio: reg.nroControl,
                });
            }
        }

        return {
            success: true,
            data: Array.from(mapaUltimaMedicion.values()),
        };
    } catch (error) {
        console.error('Error buscando historial de niño:', error);
        return { success: false, error: 'Error al consultar historial' };
    }
}

/**
 * Busca el historial evolutivo de una Mujer Embarazada o Lactante (MEL) por su cédula
 */
export async function buscarHistorialMelPorCedula(cedula: string) {
    try {
        const limpia = cedula.replace(/\D/g, '').trim();
        if (!limpia || limpia.length < 4) {
            return { success: true, data: null };
        }

        const ultimo = await prisma.registroSamanEmbarazadas.findFirst({
            where: {
                cedula: {
                    contains: limpia,
                },
            },
            include: {
                jornada: true,
            },
            orderBy: [
                { jornada: { fecha: 'desc' } },
                { id: 'desc' },
            ],
        });

        if (!ultimo) return { success: true, data: null };

        return {
            success: true,
            data: {
                id: ultimo.id,
                cedula: ultimo.cedula,
                nombre: ultimo.nombre,
                apellido: ultimo.apellido,
                fechaNacimiento: ultimo.fechaNacimiento,
                grupoEtnico: ultimo.grupoEtnico,
                estadoEmbarazoLactancia: ultimo.estadoEmbarazoLactancia,
                semanaGestacion: ultimo.semanaGestacion,
                ultimaFechaMedicion: ultimo.jornada.fecha,
                cBrazoCm: ultimo.cBrazoCm,
                tallaCm: ultimo.tallaCm,
                pesoKg: ultimo.pesoKg,
                imc: ultimo.imc,
                clasificacionNutricional: ultimo.clasificacionNutricional,
                clasificacionPb: ultimo.clasificacionPb,
            },
        };
    } catch (error) {
        console.error('Error buscando historial MEL:', error);
        return { success: false, error: 'Error al consultar historial MEL' };
    }
}

/**
 * Registra una evaluación nutricional de Niño/a en la jornada SAMÁN activa
 */
export async function registrarSamanNino(datos: any) {
    try {
        const jornada = await prisma.jornadasSAMAN.findUnique({
            where: { id: Number(datos.jornadaId) },
        });
        if (!jornada) {
            return { success: false, error: 'Jornada SAMÁN no encontrada' };
        }

        const pesoKg = Number(datos.pesoKg) || 0;
        const tallaCm = Number(datos.tallaCm) || 0;
        const cBrazoCm = Number(datos.cBrazoCm) || 0;
        const zScore = Number(datos.zScore) || 0;
        const fechaNac = new Date(datos.fechaNacimiento + 'T12:00:00');
        const edadMeses = calcularEdadMeses(fechaNac, jornada.fecha);
        const rangoEdad = calcularRangoEdad(edadMeses);
        const clasificacionPb = clasificarPbNino(cBrazoCm);
        const estadoNutricional = datos.estadoNutricional || clasificarZScoreNino(zScore, edadMeses);

        // Determinar texto oficial de protocolo Cáritas para la hoja de Excel
        let tratamientoProtocolo = datos.tratamientoProtocolo || 'Sin Tratamiento';
        let cantidadSuministrada = Number(datos.cantidadSuministrada) || 0;

        if (datos.plumpyRojo) {
            tratamientoProtocolo = zScore <= -3.01
                ? 'Plumply NUT- sobre Rojo (DAS- Severa)'
                : 'Plumply NUT- sobre Rojo (DAM-Moderada)';
            cantidadSuministrada = Number(datos.cantPlumpyRojo) || 30;
        } else if (datos.plumpyAmarillo) {
            tratamientoProtocolo = 'Plumply DOZ- sobre Amarillo (6 a 23 meses)';
            cantidadSuministrada = Number(datos.cantPlumpyAmarillo) || 30;
        } else if (datos.micronutrientes) {
            tratamientoProtocolo = 'Suplementación con micronutrientes (Vitaminas)';
            cantidadSuministrada = Number(datos.cantMicronutrientes) || 30;
        }

        const nuevo = await prisma.registroSamanNinos.create({
            data: {
                jornadaId: jornada.id,
                cedulaRepresentante: String(datos.cedulaRepresentante).replace(/\D/g, '').trim(),
                edadRepresentante: datos.edadRepresentante || 'Entre 18 - 49 años',
                parentesco: (datos.parentesco || 'MADRE').toUpperCase(),
                grupoEtnico: datos.grupoEtnico || 'Mestizo',
                nombres: String(datos.nombres).trim().toUpperCase(),
                apellidos: String(datos.apellidos).trim().toUpperCase(),
                sexo: (datos.sexo || 'FEMENINO').toUpperCase(),
                fechaNacimiento: fechaNac,
                tipoIngreso: datos.tipoIngreso || 'DIAGNOSTICO INICIAL',
                nroControl: Number(datos.nroControl) || 0,
                discapacidad: datos.discapacidad || 'NO',
                detalleDiscapacidad: datos.detalleDiscapacidad || null,
                hemoglobina: datos.hemoglobina ? Number(datos.hemoglobina) : null,
                desparasitado: datos.desparasitado || 'NO',
                referidoMedico: datos.referidoMedico || 'NO',
                proyectoTengo: datos.proyectoTengo || null,
                pesoKg,
                tallaCm,
                posicionMedida: datos.posicionMedida || 'AUTO',
                longitudCabezaCm: datos.longitudCabezaCm ? Number(datos.longitudCabezaCm) : 27.0,
                cBrazoCm,
                edema: datos.edema || 'NO',
                edadMeses,
                rangoEdad,
                clasificacionPb,
                zScore,
                estadoNutricional,
                micronutrientes: Boolean(datos.micronutrientes),
                cantMicronutrientes: datos.micronutrientes ? (Number(datos.cantMicronutrientes) || 30) : 0,
                plumpyAmarillo: Boolean(datos.plumpyAmarillo),
                cantPlumpyAmarillo: datos.plumpyAmarillo ? (Number(datos.cantPlumpyAmarillo) || 30) : 0,
                plumpyRojo: Boolean(datos.plumpyRojo),
                cantPlumpyRojo: datos.plumpyRojo ? (Number(datos.cantPlumpyRojo) || 30) : 0,
                plumpyMum: Boolean(datos.plumpyMum),
                cantPlumpyMum: datos.plumpyMum ? (Number(datos.cantPlumpyMum) || 30) : 0,
                tratamientoProtocolo,
                cantidadSuministrada,
                otrosComplementos: datos.otrosComplementos || null,
                observaciones: datos.observaciones ? String(datos.observaciones).toUpperCase() : null,
            },
        });

        revalidatePath('/dashboard/saman');
        return { success: true, data: nuevo };
    } catch (error) {
        console.error('Error al registrar niño en SAMÁN:', error);
        return { success: false, error: 'Error al guardar el registro del niño/a' };
    }
}

/**
 * Registra una evaluación nutricional de Mujer Embarazada / Lactante (MEL)
 */
export async function registrarSamanEmbarazada(datos: any) {
    try {
        const jornada = await prisma.jornadasSAMAN.findUnique({
            where: { id: Number(datos.jornadaId) },
        });
        if (!jornada) {
            return { success: false, error: 'Jornada SAMÁN no encontrada' };
        }

        const pesoKg = Number(datos.pesoKg) || 0;
        const tallaCm = Number(datos.tallaCm) || 0;
        const cBrazoCm = Number(datos.cBrazoCm) || 0;
        const imc = calcularImcMel(pesoKg, tallaCm);
        const clasificacionNutricional = datos.clasificacionNutricional || clasificarImcMel(imc);
        const clasificacionPb = datos.clasificacionPb || clasificarPbMel(cBrazoCm);
        const fechaNac = new Date(datos.fechaNacimiento + 'T12:00:00');

        const nuevo = await prisma.registroSamanEmbarazadas.create({
            data: {
                jornadaId: jornada.id,
                nombre: String(datos.nombre).trim().toUpperCase(),
                apellido: String(datos.apellido).trim().toUpperCase(),
                cedula: String(datos.cedula).replace(/\D/g, '').trim(),
                fechaNacimiento: fechaNac,
                grupoEtnico: datos.grupoEtnico || 'Mestizo',
                tipoIngreso: datos.tipoIngreso || 'DIAGNOSTICO INICIAL',
                estadoEmbarazoLactancia: datos.estadoEmbarazoLactancia || 'EMBARAZADA',
                semanaGestacion: datos.semanaGestacion ? Number(datos.semanaGestacion) : null,
                edema: datos.edema || 'No',
                pesoKg,
                tallaCm,
                imc,
                clasificacionNutricional,
                cBrazoCm,
                clasificacionPb,
                desparasitada: datos.desparasitada || 'NO',
                tratamiento: datos.tratamiento || 'Hierro+Ácido Fólico',
                cantidad: Number(datos.cantidad) || 30,
                plumpyMum: Boolean(datos.plumpyMum),
                cantPlumpyMum: datos.plumpyMum ? (Number(datos.cantPlumpyMum) || 30) : 0,
                micronutrientes: Boolean(datos.micronutrientes),
                cantMicronutrientes: datos.micronutrientes ? (Number(datos.cantMicronutrientes) || 30) : 0,
                observaciones: datos.observaciones ? String(datos.observaciones).toUpperCase() : null,
            },
        });

        revalidatePath('/dashboard/saman');
        return { success: true, data: nuevo };
    } catch (error) {
        console.error('Error al registrar MEL en SAMÁN:', error);
        return { success: false, error: 'Error al guardar el registro de la paciente MEL' };
    }
}

/**
 * Elimina un registro de niño/a de la jornada
 */
export async function eliminarRegistroSamanNino(id: number) {
    try {
        await prisma.registroSamanNinos.delete({ where: { id } });
        revalidatePath('/dashboard/saman');
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar registro niño:', error);
        return { success: false, error: 'No se pudo eliminar el registro' };
    }
}

/**
 * Elimina un registro de embarazada/lactante de la jornada
 */
export async function eliminarRegistroSamanEmbarazada(id: number) {
    try {
        await prisma.registroSamanEmbarazadas.delete({ where: { id } });
        revalidatePath('/dashboard/saman');
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar registro MEL:', error);
        return { success: false, error: 'No se pudo eliminar el registro' };
    }
}

/**
 * Elimina una jornada SAMÁN por su ID
 */
export async function eliminarJornadaSaman(id: number) {
    try {
        await prisma.jornadasSAMAN.delete({ where: { id } });
        revalidatePath('/dashboard/saman');
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar jornada SAMÁN:', error);
        return { success: false, error: 'No se pudo eliminar la jornada' };
    }
}
