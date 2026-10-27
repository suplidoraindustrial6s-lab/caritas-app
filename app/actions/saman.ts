'use server';

import prisma from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';
import { asegurarJornadasOficiales } from '@/app/lib/saman-initial-sync';
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
        // Asegurar que las jornadas oficiales (19 sept con 18 niños y 1 embarazada, y 15 oct) existan y limpiar pruebas
        await asegurarJornadasOficiales();

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

        // Agrupar por nombre completo del niño para obtener su historial y calcular evolución
        const mapaNino = new Map<string, { registros: any[]; ultimo: any }>();
        for (const reg of registros) {
            const clave = `${reg.nombres.trim().toUpperCase()} ${reg.apellidos.trim().toUpperCase()}`;
            if (!mapaNino.has(clave)) {
                mapaNino.set(clave, { registros: [reg], ultimo: reg });
            } else {
                mapaNino.get(clave)!.registros.push(reg);
            }
        }

        const data: any[] = [];
        for (const { registros: histList, ultimo } of mapaNino.values()) {
            const totalReingresos = histList.filter((r) => r.tipoIngreso === 'REINGRESO').length;
            const ultimoTipo = ultimo.tipoIngreso || 'DIAGNOSTICO INICIAL';
            const ultimoControl = Number(ultimo.nroControl) || 0;
            const ultimoEstado = ultimo.estadoNutricional || '';
            const ultimoZ = Number(ultimo.zScore) || 0;

            // Encontrar el registro inicial (Diagnóstico Inicial) o el más antiguo en la lista cronológica
            const registrosOrdenados = [...histList].sort(
                (a, b) => new Date(a.jornada.fecha).getTime() - new Date(b.jornada.fecha).getTime()
            );
            const registroInicial =
                registrosOrdenados.find((r) => r.tipoIngreso === 'DIAGNOSTICO INICIAL') || registrosOrdenados[0];

            const fechaInicioVivero = registroInicial?.jornada?.fecha || null;
            const zScoreEntrada = registroInicial ? Number(registroInicial.zScore) : null;

            // Determinar tipo sugerido y número de control según las 4 premisas de Cáritas:
            // 1. Diagnóstico Inicial -> Control 0
            // 2. Monitoreo regular -> Control + 1
            // 3. Salida de Vivero (recuperado) -> Control 0
            // 4. Reingreso (tras salida o interrupción) -> Control 0 (o nro de reingresos previos)
            let sugeridoTipo = 'MONITOREO';
            let sugeridoControl = ultimoControl + 1;

            if (ultimoTipo === 'SALIDA DE VIVERO') {
                sugeridoTipo = 'REINGRESO';
                sugeridoControl = totalReingresos;
            } else if (ultimoTipo === 'REINGRESO') {
                sugeridoTipo = 'MONITOREO';
                sugeridoControl = 1;
            } else if (ultimoControl >= 1 && (ultimoEstado === 'Adecuado' || ultimoZ >= -1.0)) {
                // Si el niño ya avanzó bien en sus monitoreos, sugerir salida de vivero
                sugeridoTipo = 'SALIDA DE VIVERO';
                sugeridoControl = 0;
            }

            data.push({
                id: ultimo.id,
                cedulaRepresentante: ultimo.cedulaRepresentante,
                edadRepresentante: ultimo.edadRepresentante,
                parentesco: ultimo.parentesco,
                grupoEtnico: ultimo.grupoEtnico,
                nombres: ultimo.nombres,
                apellidos: ultimo.apellidos,
                sexo: ultimo.sexo,
                fechaNacimiento: ultimo.fechaNacimiento,
                discapacidad: ultimo.discapacidad,
                detalleDiscapacidad: ultimo.detalleDiscapacidad,
                ultimaFechaMedicion: ultimo.jornada.fecha,
                cBrazoCm: ultimo.cBrazoCm,
                tallaCm: ultimo.tallaCm,
                pesoKg: ultimo.pesoKg,
                zScore: ultimo.zScore,
                estadoNutricional: ultimo.estadoNutricional,
                clasificacionPb: ultimo.clasificacionPb,
                ultimoTipoIngreso: ultimoTipo,
                nroControlPrevio: ultimoControl,
                totalReingresos,
                totalVisitasPrevias: histList.length,
                sugeridoTipo,
                sugeridoControl,
                fechaInicioVivero,
                zScoreEntrada,
            });
        }

        return {
            success: true,
            data,
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
                fechaInicioVivero: datos.fechaInicioVivero ? new Date(datos.fechaInicioVivero + 'T12:00:00') : null,
                fechaSalidaVivero: datos.fechaSalidaVivero ? new Date(datos.fechaSalidaVivero + 'T12:00:00') : null,
                zScoreEntrada: datos.zScoreEntrada !== undefined && datos.zScoreEntrada !== null && datos.zScoreEntrada !== '' ? Number(datos.zScoreEntrada) : null,
                zScoreSalida: datos.zScoreSalida !== undefined && datos.zScoreSalida !== null && datos.zScoreSalida !== '' ? Number(datos.zScoreSalida) : null,
                semanasVivero: datos.semanasVivero !== undefined && datos.semanasVivero !== null && datos.semanasVivero !== '' ? Number(datos.semanasVivero) : null,
                situacionSalida: datos.situacionSalida || null,
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
export async function actualizarSamanNino(id: number, datos: any) {
    try {
        const registroExistente = await prisma.registroSamanNinos.findUnique({
            where: { id },
            include: { jornada: true },
        });
        if (!registroExistente) {
            return { success: false, error: 'Registro de niño/a no encontrado' };
        }

        const fechaJornada = registroExistente.jornada?.fecha || new Date();
        const pesoKg = Number(datos.pesoKg) || 0;
        const tallaCm = Number(datos.tallaCm) || 0;
        const cBrazoCm = Number(datos.cBrazoCm) || 0;
        const zScore = Number(datos.zScore) || 0;
        const fechaNac = new Date(datos.fechaNacimiento + 'T12:00:00');
        const edadMeses = calcularEdadMeses(fechaNac, fechaJornada);
        const rangoEdad = calcularRangoEdad(edadMeses);
        const clasificacionPb = clasificarPbNino(cBrazoCm);
        const estadoNutricional = datos.estadoNutricional || clasificarZScoreNino(zScore, edadMeses);

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

        const actualizado = await prisma.registroSamanNinos.update({
            where: { id },
            data: {
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
                fechaInicioVivero: datos.fechaInicioVivero ? new Date(datos.fechaInicioVivero + 'T12:00:00') : null,
                fechaSalidaVivero: datos.fechaSalidaVivero ? new Date(datos.fechaSalidaVivero + 'T12:00:00') : null,
                zScoreEntrada: datos.zScoreEntrada !== undefined && datos.zScoreEntrada !== null && datos.zScoreEntrada !== '' ? Number(datos.zScoreEntrada) : null,
                zScoreSalida: datos.zScoreSalida !== undefined && datos.zScoreSalida !== null && datos.zScoreSalida !== '' ? Number(datos.zScoreSalida) : null,
                semanasVivero: datos.semanasVivero !== undefined && datos.semanasVivero !== null && datos.semanasVivero !== '' ? Number(datos.semanasVivero) : null,
                situacionSalida: datos.situacionSalida || null,
                observaciones: datos.observaciones ? String(datos.observaciones).toUpperCase() : null,
            },
        });

        revalidatePath('/dashboard/saman');
        return { success: true, data: actualizado };
    } catch (error) {
        console.error('Error al actualizar niño en SAMÁN:', error);
        return { success: false, error: 'Error al actualizar el registro del niño/a' };
    }
}

/**
 * Actualiza una evaluación nutricional de Mujer Embarazada / Lactante (MEL)
 */
export async function actualizarSamanEmbarazada(id: number, datos: any) {
    try {
        const registroExistente = await prisma.registroSamanEmbarazadas.findUnique({
            where: { id },
        });
        if (!registroExistente) {
            return { success: false, error: 'Registro MEL no encontrado' };
        }

        const pesoKg = Number(datos.pesoKg) || 0;
        const tallaCm = Number(datos.tallaCm) || 0;
        const cBrazoCm = Number(datos.cBrazoCm) || 0;
        const imc = calcularImcMel(pesoKg, tallaCm);
        const clasificacionNutricional = datos.clasificacionNutricional || clasificarImcMel(imc);
        const clasificacionPb = datos.clasificacionPb || clasificarPbMel(cBrazoCm);
        const fechaNac = new Date(datos.fechaNacimiento + 'T12:00:00');

        const actualizado = await prisma.registroSamanEmbarazadas.update({
            where: { id },
            data: {
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
        return { success: true, data: actualizado };
    } catch (error) {
        console.error('Error al actualizar MEL en SAMÁN:', error);
        return { success: false, error: 'Error al actualizar el registro de la paciente MEL' };
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
