import prisma from '@/app/lib/prisma';

export async function asegurarJornadasOficiales() {
    try {
        // 1. Limpiar jornadas de prueba del 22 de octubre o que contengan "test" sin registros
        const jornadasAEliminar = await prisma.jornadasSAMAN.findMany({
            where: {
                OR: [
                    { comunidad: { contains: 'test' } },
                    { comunidad: { contains: 'Test' } },
                    { comunidad: { contains: 'TEST' } },
                    {
                        fecha: {
                            gte: new Date('2026-10-22T00:00:00.000Z'),
                            lte: new Date('2026-10-22T23:59:59.999Z'),
                        },
                    },
                ],
            },
            include: {
                _count: {
                    select: { ninos: true, embarazadas: true },
                },
            },
        });

        for (const j of jornadasAEliminar) {
            if (j._count.ninos === 0 && j._count.embarazadas === 0) {
                await prisma.jornadasSAMAN.delete({ where: { id: j.id } });
                console.log(`Jornada de prueba ID ${j.id} (${j.comunidad} - ${j.fecha}) eliminada.`);
            }
        }

        // 2. Limpiar duplicados de la jornada del 15 de octubre si existen
        const jornadasArias = await prisma.jornadasSAMAN.findMany({
            where: {
                comunidad: { contains: 'ARIAS BLANCO' },
            },
            include: {
                _count: {
                    select: { ninos: true, embarazadas: true },
                },
            },
            orderBy: { id: 'asc' },
        });

        if (jornadasArias.length > 1) {
            // Dejar la primera, eliminar las demás si están vacías
            for (let i = 1; i < jornadasArias.length; i++) {
                const jDup = jornadasArias[i];
                if (jDup._count.ninos === 0 && jDup._count.embarazadas === 0) {
                    await prisma.jornadasSAMAN.delete({ where: { id: jDup.id } });
                    console.log(`Jornada duplicada del 15 de octubre ID ${jDup.id} eliminada.`);
                }
            }
        }

        // 3. Asegurar que exista la jornada oficial del 19 de septiembre (TEJERÍAS) con sus 18 niños y 1 embarazada
        let jornadaTejerias = await prisma.jornadasSAMAN.findFirst({
            where: {
                comunidad: 'TEJERÍAS',
                fecha: {
                    gte: new Date('2026-09-18T00:00:00.000Z'),
                    lte: new Date('2026-09-20T23:59:59.999Z'),
                },
            },
            include: {
                _count: {
                    select: { ninos: true, embarazadas: true },
                },
            },
        });

        if (!jornadaTejerias) {
            jornadaTejerias = await prisma.jornadasSAMAN.create({
                data: {
                    fecha: new Date('2026-09-19T12:00:00.000Z'),
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
        }

        // Si la jornada del 19 de septiembre no tiene los niños y la embarazada, cargarlos
        if (jornadaTejerias._count.ninos === 0) {
            const ninosData = [
                { cedulaRepresentante: '19530148', parentesco: 'TIA', nombres: 'MÍA', apellidos: 'MANRIQUEZ', sexo: 'FEMENINO', fechaNacimiento: '2022-08-15', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 15.5, tallaCm: 96, pesoKg: 15, zScore: 0.64, estadoNutricional: 'Adecuado', desparasitado: 'SI', micronutrientes: true, cantMicronutrientes: 30, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)', cantidadSuministrada: 30, edadMeses: 49.2, rangoEdad: '24-59 meses', observaciones: null },
                { cedulaRepresentante: '25074658', parentesco: 'MADRE', nombres: 'AMANDA', apellidos: 'ROMERO', sexo: 'FEMENINO', fechaNacimiento: '2025-09-10', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 14.5, tallaCm: 76, pesoKg: 8.1, zScore: -1.62, estadoNutricional: 'Riesgo Nutricional', desparasitado: 'NO', micronutrientes: false, cantMicronutrientes: 0, plumpyAmarillo: true, cantPlumpyAmarillo: 30, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Plumply DOZ- sobre Amarillo (6 a 23 meses)', cantidadSuministrada: 30, edadMeses: 12.3, rangoEdad: '7-23 meses', observaciones: null },
                { cedulaRepresentante: '23621879', parentesco: 'MADRE', nombres: 'MAXIMO RAFAEL', apellidos: 'BOLAÑO', sexo: 'MASCULINO', fechaNacimiento: '2026-05-26', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 14, tallaCm: 62, pesoKg: 6.35, zScore: -0.33, estadoNutricional: 'Adecuado', desparasitado: 'NO', micronutrientes: false, cantMicronutrientes: 0, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Sin Tratamiento', cantidadSuministrada: 0, edadMeses: 3.8, rangoEdad: '0-6 meses', observaciones: 'NO ENTRA EN SAMAN' },
                { cedulaRepresentante: '18693562', parentesco: 'MADRE', nombres: 'MIRANDA', apellidos: 'GIL', sexo: 'FEMENINO', fechaNacimiento: '2022-11-14', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 15, tallaCm: 93, pesoKg: 13.4, zScore: 0.15, estadoNutricional: 'Adecuado', desparasitado: 'SI', micronutrientes: true, cantMicronutrientes: 30, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)', cantidadSuministrada: 30, edadMeses: 46.2, rangoEdad: '24-59 meses', observaciones: 'SE MIDIÓ RECOSTADO' },
                { cedulaRepresentante: '18884100', parentesco: 'MADRE', nombres: 'ANGELO JOSÉ', apellidos: 'MIGNECO', sexo: 'MASCULINO', fechaNacimiento: '2022-05-04', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 16, tallaCm: 107, pesoKg: 16, zScore: -1.05, estadoNutricional: 'Adecuado', desparasitado: 'SI', micronutrientes: true, cantMicronutrientes: 30, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)', cantidadSuministrada: 30, edadMeses: 52.6, rangoEdad: '24-59 meses', observaciones: null },
                { cedulaRepresentante: '26039691', parentesco: 'PADRE', nombres: 'DWIGTH', apellidos: 'COLMENARES', sexo: 'MASCULINO', fechaNacimiento: '2022-11-29', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 18.2, tallaCm: 101, pesoKg: 18, zScore: 1.66, estadoNutricional: 'Adecuado', desparasitado: 'SI', micronutrientes: true, cantMicronutrientes: 30, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)', cantidadSuministrada: 30, edadMeses: 45.7, rangoEdad: '24-59 meses', observaciones: null },
                { cedulaRepresentante: '26039691', parentesco: 'PADRE', nombres: 'CHARLIE', apellidos: 'COLMENARES', sexo: 'FEMENINO', fechaNacimiento: '2025-02-25', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 16.8, tallaCm: 84, pesoKg: 11.75, zScore: 0.59, estadoNutricional: 'Adecuado', desparasitado: 'NO', micronutrientes: true, cantMicronutrientes: 30, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)', cantidadSuministrada: 30, edadMeses: 18.8, rangoEdad: '7-23 meses', observaciones: null },
                { cedulaRepresentante: '30012919', parentesco: 'MADRE', nombres: 'SANTIAGO', apellidos: 'APARICIO', sexo: 'MASCULINO', fechaNacimiento: '2023-03-28', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 18.5, tallaCm: 98.5, pesoKg: 16.25, zScore: 1.01, estadoNutricional: 'Adecuado', desparasitado: 'SI', micronutrientes: true, cantMicronutrientes: 30, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)', cantidadSuministrada: 30, edadMeses: 41.8, rangoEdad: '24-59 meses', observaciones: null },
                { cedulaRepresentante: '19949123', parentesco: 'MADRE', nombres: 'RODRIGO', apellidos: 'VILLASANA', sexo: 'MASCULINO', fechaNacimiento: '2024-07-05', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 15, tallaCm: 87, pesoKg: 11, zScore: -1.08, estadoNutricional: 'Adecuado', desparasitado: 'SI', micronutrientes: true, cantMicronutrientes: 30, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)', cantidadSuministrada: 30, edadMeses: 26.5, rangoEdad: '24-59 meses', observaciones: null },
                { cedulaRepresentante: '18691207', parentesco: 'MADRE', nombres: 'ISSALYN', apellidos: 'REYES', sexo: 'FEMENINO', fechaNacimiento: '2026-02-13', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 14.6, tallaCm: 67, pesoKg: 9, zScore: 1.9, estadoNutricional: 'Adecuado', desparasitado: 'NO', micronutrientes: true, cantMicronutrientes: 30, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)', cantidadSuministrada: 30, edadMeses: 7.2, rangoEdad: '0-6 meses', observaciones: null },
                { cedulaRepresentante: '20453605', parentesco: 'PADRE', nombres: 'DERECK', apellidos: 'GARCÍA', sexo: 'MASCULINO', fechaNacimiento: '2025-06-19', tipoIngreso: 'REINGRESO', cBrazoCm: 16, tallaCm: 66, pesoKg: 9, zScore: 1.9, estadoNutricional: 'Adecuado', desparasitado: 'NO', micronutrientes: true, cantMicronutrientes: 30, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)', cantidadSuministrada: 30, edadMeses: 15.0, rangoEdad: '7-23 meses', observaciones: null },
                { cedulaRepresentante: '32589152', parentesco: 'MADRE', nombres: 'CAMILA', apellidos: 'GUERRA', sexo: 'FEMENINO', fechaNacimiento: '2025-11-14', tipoIngreso: 'REINGRESO', cBrazoCm: 13, tallaCm: 78, pesoKg: 9, zScore: -0.85, estadoNutricional: 'Adecuado', desparasitado: 'NO', micronutrientes: true, cantMicronutrientes: 30, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)', cantidadSuministrada: 30, edadMeses: 10.2, rangoEdad: '7-23 meses', observaciones: null },
                { cedulaRepresentante: '27863215', parentesco: 'MADRE', nombres: 'YUSNEIRI', apellidos: 'PACHECO', sexo: 'FEMENINO', fechaNacimiento: '2025-05-24', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 13.5, tallaCm: 71, pesoKg: 7, zScore: -2.04, estadoNutricional: 'Desnutrición aguda moderada', desparasitado: 'NO', micronutrientes: false, cantMicronutrientes: 0, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: true, cantPlumpyRojo: 30, tratamientoProtocolo: 'Plumply NUT- sobre Rojo (DAM-Moderada)', cantidadSuministrada: 30, edadMeses: 15.9, rangoEdad: '7-23 meses', observaciones: null },
                { cedulaRepresentante: '27863215', parentesco: 'MADRE', nombres: 'YORBELIS', apellidos: 'PACHECO', sexo: 'FEMENINO', fechaNacimiento: '2024-04-24', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 15, tallaCm: 88, pesoKg: 10, zScore: -2.09, estadoNutricional: 'Desnutrición aguda moderada', desparasitado: 'SI', micronutrientes: false, cantMicronutrientes: 0, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: true, cantPlumpyRojo: 30, tratamientoProtocolo: 'Plumply NUT- sobre Rojo (DAM-Moderada)', cantidadSuministrada: 30, edadMeses: 28.9, rangoEdad: '24-59 meses', observaciones: null },
                { cedulaRepresentante: '31625848', parentesco: 'MADRE', nombres: 'YOSNEIKER', apellidos: 'CASTILLO', sexo: 'MASCULINO', fechaNacimiento: '2022-10-25', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 16, tallaCm: 100, pesoKg: 15, zScore: -0.29, estadoNutricional: 'Adecuado', desparasitado: 'SI', micronutrientes: true, cantMicronutrientes: 30, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)', cantidadSuministrada: 30, edadMeses: 46.8, rangoEdad: '24-59 meses', observaciones: null },
                { cedulaRepresentante: '30012792', parentesco: 'MADRE', nombres: 'JESUS ALEXANDER', apellidos: 'GUTIERREZ', sexo: 'MASCULINO', fechaNacimiento: '2022-09-16', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 16.6, tallaCm: 102, pesoKg: 16, zScore: 0.05, estadoNutricional: 'Adecuado', desparasitado: 'SI', micronutrientes: true, cantMicronutrientes: 30, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)', cantidadSuministrada: 30, edadMeses: 48.1, rangoEdad: '24-59 meses', observaciones: null },
                { cedulaRepresentante: '30012792', parentesco: 'MADRE', nombres: 'MARYSNELLY', apellidos: 'GUTIERREZ', sexo: 'FEMENINO', fechaNacimiento: '2026-04-26', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 14, tallaCm: 65, pesoKg: 6, zScore: -1.88, estadoNutricional: 'Riesgo Nutricional', desparasitado: 'NO', micronutrientes: false, cantMicronutrientes: 0, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Sin Tratamiento', cantidadSuministrada: 0, edadMeses: 4.8, rangoEdad: '0-6 meses', observaciones: 'NO ENTRA EN SAMAN' },
                { cedulaRepresentante: '28479221', parentesco: 'MADRE', nombres: 'ADHARA', apellidos: 'BRETT', sexo: 'FEMENINO', fechaNacimiento: '2025-05-05', tipoIngreso: 'DIAGNOSTICO INICIAL', cBrazoCm: 17, tallaCm: 77, pesoKg: 11, zScore: 1.57, estadoNutricional: 'Adecuado', desparasitado: 'NO', micronutrientes: true, cantMicronutrientes: 30, plumpyAmarillo: false, cantPlumpyAmarillo: 0, plumpyRojo: false, cantPlumpyRojo: 0, tratamientoProtocolo: 'Suplementación con micronutrientes (Vitaminas)', cantidadSuministrada: 30, edadMeses: 16.5, rangoEdad: '7-23 meses', observaciones: null },
            ];

            for (const n of ninosData) {
                await prisma.registroSamanNinos.create({
                    data: {
                        jornadaId: jornadaTejerias.id,
                        cedulaRepresentante: n.cedulaRepresentante,
                        edadRepresentante: 'Entre 18 - 49 años',
                        parentesco: n.parentesco,
                        grupoEtnico: 'Mestizo',
                        nombres: n.nombres,
                        apellidos: n.apellidos,
                        sexo: n.sexo,
                        fechaNacimiento: new Date(n.fechaNacimiento + 'T12:00:00Z'),
                        tipoIngreso: n.tipoIngreso,
                        nroControl: 0,
                        discapacidad: 'NO',
                        edema: 'NO',
                        cBrazoCm: n.cBrazoCm,
                        clasificacionPb: 'Adecuado',
                        tallaCm: n.tallaCm,
                        pesoKg: n.pesoKg,
                        zScore: n.zScore,
                        edadMeses: n.edadMeses,
                        rangoEdad: n.rangoEdad,
                        estadoNutricional: n.estadoNutricional,
                        desparasitado: n.desparasitado,
                        micronutrientes: n.micronutrientes,
                        cantMicronutrientes: n.cantMicronutrientes,
                        plumpyAmarillo: n.plumpyAmarillo,
                        cantPlumpyAmarillo: n.cantPlumpyAmarillo,
                        plumpyRojo: n.plumpyRojo,
                        cantPlumpyRojo: n.cantPlumpyRojo,
                        plumpyMum: false,
                        cantPlumpyMum: 0,
                        tratamientoProtocolo: n.tratamientoProtocolo,
                        cantidadSuministrada: n.cantidadSuministrada,
                        observaciones: n.observaciones,
                    },
                });
            }
        }

        if (jornadaTejerias._count.embarazadas === 0) {
            await prisma.registroSamanEmbarazadas.create({
                data: {
                    jornadaId: jornadaTejerias.id,
                    nombre: 'EDMARY',
                    apellido: 'PACHECO',
                    cedula: '28479221',
                    fechaNacimiento: new Date('2002-03-19T12:00:00Z'),
                    grupoEtnico: 'Mestizo',
                    tipoIngreso: 'DIAGNOSTICO INICIAL',
                    estadoEmbarazoLactancia: 'EMBARAZADA',
                    semanaGestacion: 15,
                    edema: 'No',
                    pesoKg: 76,
                    tallaCm: 160.5,
                    imc: 29.5,
                    clasificacionNutricional: 'Sobrepeso',
                    cBrazoCm: 36.5,
                    clasificacionPb: 'Peso Normal',
                    desparasitada: 'NO',
                    tratamiento: 'Hierro+Ácido Fólico',
                    cantidad: 30,
                    plumpyMum: false,
                    cantPlumpyMum: 0,
                    micronutrientes: true,
                    cantMicronutrientes: 30,
                    observaciones: 'NO SE LE SUMINISTRÓ PLUMPY',
                },
            });
        }

        // 4. Asegurar que exista la jornada del 15 de octubre (ARIAS BLANCO)
        let jornadaAriasFinal = await prisma.jornadasSAMAN.findFirst({
            where: {
                comunidad: { contains: 'ARIAS BLANCO' },
            },
        });

        if (!jornadaAriasFinal) {
            await prisma.jornadasSAMAN.create({
                data: {
                    fecha: new Date('2026-10-15T16:00:00.000Z'),
                    diocesis: 'MARACAY',
                    estado: 'ARAGUA',
                    municipio: 'MBI',
                    parroquiaCivil: 'EL LIMÓN',
                    parroquiaEclesial: 'LA MILAGROSA',
                    centro: 'MARACAY - EL LIMÓN',
                    comunidad: 'ARIAS BLANCO (SALÓN PARROQUIAL)',
                    estatus: 'ABIERTA',
                },
            });
        }
    } catch (error) {
        console.error('Error al asegurar jornadas oficiales SAMAN:', error);
    }
}
