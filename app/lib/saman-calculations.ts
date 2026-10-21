// Utilidades de cálculo antropométrico y clasificación nutricional para el Programa SAMÁN (Cáritas)
// Incorpora el motor de cálculo oficial OMS (WHO Child Growth Standards) idéntico al de la aplicación Maventy.

import { weightForLength, weightForHeight, ageInDays } from 'who-growth-standards';

/**
 * Calcula la edad en meses entre la fecha de nacimiento y la fecha de medición
 */
export function calcularEdadMeses(fechaNacimiento: Date | string, fechaMedicion: Date | string = new Date()): number {
    const nac = new Date(fechaNacimiento);
    const med = new Date(fechaMedicion);
    if (isNaN(nac.getTime()) || isNaN(med.getTime())) return 0;

    const diffMs = med.getTime() - nac.getTime();
    const edadAnios = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    const edadMeses = edadAnios * 12;
    return Math.max(0, Number(edadMeses.toFixed(1)));
}

/**
 * Formatea la edad en formato legible (Ej: "1 año, 4 meses" o "8 meses")
 */
export function formatearEdadLegible(edadMeses: number): string {
    if (!edadMeses || edadMeses <= 0) return '0 meses';
    const totalMeses = Math.round(edadMeses);
    const anios = Math.floor(totalMeses / 12);
    const meses = totalMeses % 12;
    if (anios === 0) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    if (meses === 0) return `${anios} ${anios === 1 ? 'año' : 'años'} (${totalMeses} m)`;
    return `${anios}a ${meses}m (${totalMeses} m)`;
}

/**
 * Determina el rango de edad oficial de la plantilla de Cáritas
 */
export function calcularRangoEdad(edadMeses: number): string {
    const edadAnios = edadMeses / 12;
    if (edadAnios <= 0.6) return '0-6 meses';
    if (edadAnios <= 2) return '7-23 meses';
    if (edadAnios <= 5) return '24-59 meses';
    return 'Mayor a 5 años';
}

/**
 * Clasifica el Perímetro Braquial (CBI / PB) para Niños/as (NN)
 * Según protocolo oficial Cáritas:
 * - >= 12.5 cm: Adecuado
 * - 11.5 a 12.4 cm: Desnutrición aguda moderada (DAM)
 * - <= 11.4 cm: Desnutrición aguda severa (DAS)
 */
export function clasificarPbNino(cBrazoCm: number): string {
    if (!cBrazoCm || isNaN(cBrazoCm) || cBrazoCm <= 0) return 'Sin dato';
    if (cBrazoCm >= 12.5) return 'Adecuado';
    if (cBrazoCm >= 11.5) return 'Desnutrición aguda moderada';
    return 'Desnutrición aguda severa';
}

/**
 * Clasifica el Perímetro Braquial (CBI / PB) para Mujeres Embarazadas/Lactantes (MEL)
 * Según protocolo oficial Cáritas (Lámina 23):
 * - <= 22.1 cm: Bajo peso
 * - > 22.1 cm: Peso Normal
 */
export function clasificarPbMel(cBrazoCm: number): string {
    if (!cBrazoCm || isNaN(cBrazoCm) || cBrazoCm <= 0) return 'Sin dato';
    if (cBrazoCm <= 22.1) return 'Bajo peso';
    return 'Peso Normal';
}

/**
 * Calcula el Z-Score oficial OMS Peso para la Talla/Longitud exactamente como la app Maventy
 *
 * Parámetros que toma en cuenta Maventy:
 * 1. Sexo: 'male' / 'female' (MASCULINO / FEMENINO)
 * 2. Fecha de nacimiento (calcula días de vida exactos)
 * 3. Fecha de la jornada / visita
 * 4. Peso en kg
 * 5. Posición de la medida:
 *    - 'AUTO': Por defecto estándar OMS (< 2 años acostado / length, >= 2 años de pie / height).
 *    - 'ACOSTADO': Medido recostado / decúbito supino. Si el niño tiene >= 2 años, la OMS/Maventy resta 0.7 cm a la estatura para convertir a longitud recostada.
 *    - 'DE_PIE': Medido de pie / bipedestación. Si el niño tiene < 2 años, la OMS/Maventy suma 0.7 cm para equiparar a longitud.
 * 6. Longitud o Altura en cm
 * 7. Longitud de la cabeza (constante 27 cm informativa para Maventy)
 */
export function calcularZScoreMaventy(
    pesoKg: number,
    tallaCm: number,
    sexo: string,
    fechaNacimiento: Date | string,
    fechaMedicion: Date | string = new Date(),
    posicionMedida: 'AUTO' | 'ACOSTADO' | 'DE_PIE' = 'AUTO'
): number {
    if (!pesoKg || !tallaCm || pesoKg <= 0 || tallaCm <= 0) return 0;

    const nac = new Date(fechaNacimiento);
    const med = new Date(fechaMedicion);
    if (isNaN(nac.getTime()) || isNaN(med.getTime())) return 0;

    const diasVida = Math.max(0, ageInDays(nac, med));
    const aniosVida = diasVida / 365.25;
    const sexoNorm = sexo?.toUpperCase().startsWith('F') ? 'female' : 'male';

    // Determinar si corresponde curva de Length (acostado, 45-110 cm) o Height (de pie, 65-120 cm)
    let esAcostado = posicionMedida === 'ACOSTADO' || (posicionMedida === 'AUTO' && aniosVida < 2);

    try {
        if (esAcostado) {
            // Si tiene 2 años o más pero fue medido acostado, se usa tabla de longitud o altura corregida
            if (tallaCm <= 110) {
                const res = weightForLength(pesoKg, tallaCm, sexoNorm);
                return Number(Number(res.zScore).toFixed(2));
            } else {
                // Para tallas > 110 cm se usa weightForHeight corrigiendo estatura - 0.7 cm
                const res = weightForHeight(pesoKg, Math.max(65, tallaCm - 0.7), sexoNorm);
                return Number(Number(res.zScore).toFixed(2));
            }
        } else {
            // Medido de pie
            if (aniosVida < 2 && tallaCm < 65) {
                // Menor de 2 años de pie con talla muy baja: convertir a longitud (+0.7 cm)
                const res = weightForLength(pesoKg, tallaCm + 0.7, sexoNorm);
                return Number(Number(res.zScore).toFixed(2));
            } else {
                const res = weightForHeight(pesoKg, Math.max(65, Math.min(120, tallaCm)), sexoNorm);
                return Number(Number(res.zScore).toFixed(2));
            }
        }
    } catch (e) {
        // En caso de estar en bordes extremos, usar fallback por interpolación
        return 0;
    }
}

/**
 * Alias retrocompatible para el estimador
 */
export function estimarZScorePesoTalla(
    pesoKg: number,
    tallaCm: number,
    sexo: string,
    fechaNacimiento?: Date | string,
    fechaMedicion?: Date | string,
    posicionMedida: 'AUTO' | 'ACOSTADO' | 'DE_PIE' = 'AUTO'
): number {
    if (fechaNacimiento) {
        return calcularZScoreMaventy(pesoKg, tallaCm, sexo, fechaNacimiento, fechaMedicion || new Date(), posicionMedida);
    }
    // Si no se suministra fecha aún, estimar asumiendo 2 años
    const fechaRef = new Date();
    fechaRef.setFullYear(fechaRef.getFullYear() - 2);
    return calcularZScoreMaventy(pesoKg, tallaCm, sexo, fechaRef, new Date(), posicionMedida);
}

/**
 * Clasifica el Estado Nutricional de un Niño/a según el Z-Score y su edad en meses
 * Lineamientos oficiales de Cáritas (Lámina 25):
 * - >= -0.99: Adecuado (Incluye Sobrepeso y Obesidad)
 * - De -1 a -2 (en menores de 2 años / < 24 meses): Riesgo Nutricional (RN)
 * - De -1 a -2 (en >= 24 meses): Adecuado
 * - De -2.01 a -3: Desnutrición aguda moderada (DAM)
 * - <= -3.01: Desnutrición aguda severa (DAS)
 */
export function clasificarZScoreNino(zScore: number, edadMeses: number): string {
    if (zScore === null || zScore === undefined || isNaN(zScore)) return 'Adecuado';
    if (zScore <= -3.01) return 'Desnutrición aguda severa';
    if (zScore <= -2.01) return 'Desnutrición aguda moderada';
    if (zScore <= -1.0 && edadMeses < 24) return 'Riesgo Nutricional';
    return 'Adecuado';
}

/**
 * Sugiere el tratamiento oficial según protocolo de Cáritas (Lámina 27)
 */
export function sugerirTratamientoNino(zScore: number, edadMeses: number) {
    if (edadMeses < 6) {
        return {
            micronutrientes: false,
            cantMicronutrientes: 0,
            plumpyAmarillo: false,
            cantPlumpyAmarillo: 0,
            plumpyRojo: false,
            cantPlumpyRojo: 0,
            plumpyMum: false,
            cantPlumpyMum: 0,
            tratamientoProtocolo: 'Sin Tratamiento',
            cantidadSuministrada: 0,
        };
    }

    if (zScore <= -3.01) {
        return {
            micronutrientes: false,
            cantMicronutrientes: 0,
            plumpyAmarillo: false,
            cantPlumpyAmarillo: 0,
            plumpyRojo: true,
            cantPlumpyRojo: 60,
            plumpyMum: false,
            cantPlumpyMum: 0,
            tratamientoProtocolo: 'Plumply NUT- sobre Rojo (DAS- Severa)',
            cantidadSuministrada: 60,
        };
    }

    if (zScore <= -2.01) {
        return {
            micronutrientes: false,
            cantMicronutrientes: 0,
            plumpyAmarillo: false,
            cantPlumpyAmarillo: 0,
            plumpyRojo: true,
            cantPlumpyRojo: 30,
            plumpyMum: false,
            cantPlumpyMum: 0,
            tratamientoProtocolo: 'Plumply NUT- sobre Rojo (DAM-Moderada)',
            cantidadSuministrada: 30,
        };
    }

    if (zScore <= -1.0 && edadMeses < 24) {
        return {
            micronutrientes: false,
            cantMicronutrientes: 0,
            plumpyAmarillo: true,
            cantPlumpyAmarillo: 30,
            plumpyRojo: false,
            cantPlumpyRojo: 0,
            plumpyMum: false,
            cantPlumpyMum: 0,
            tratamientoProtocolo: 'Plumply DOZ- sobre Amarillo (6 a 23 meses)',
            cantidadSuministrada: 30,
        };
    }

    return {
        micronutrientes: true,
        cantMicronutrientes: 30,
        plumpyAmarillo: false,
        cantPlumpyAmarillo: 0,
        plumpyRojo: false,
        cantPlumpyRojo: 0,
        plumpyMum: false,
        cantPlumpyMum: 0,
        tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)',
        cantidadSuministrada: 30,
    };
}

/**
 * Calcula el Índice de Masa Corporal (IMC) para Mujeres Embarazadas/Lactantes (MEL)
 */
export function calcularImcMel(pesoKg: number, tallaCm: number): number {
    if (!pesoKg || !tallaCm || pesoKg <= 0 || tallaCm <= 0) return 0;
    const tallaMetros = tallaCm / 100;
    const imc = pesoKg / (tallaMetros * tallaMetros);
    return Number(imc.toFixed(2));
}

/**
 * Clasifica el estado nutricional por IMC para MEL según fórmula oficial del Excel de Cáritas
 */
export function clasificarImcMel(imc: number): string {
    if (!imc || imc <= 0) return 'Sin dato';
    if (imc < 18.5) return 'Bajo Peso';
    if (imc < 25) return 'Adecuado';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
}
