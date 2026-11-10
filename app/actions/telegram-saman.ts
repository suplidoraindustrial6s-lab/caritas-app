'use server';

import prisma from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';
import { obtenerMapaTelefonosSaman } from '@/app/actions/saman';

// Token oficial del Bot de Cáritas Parroquial La Milagrosa (@caritasPQLamilagrosa_bot)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9235182085:AAGIJCWrRADIASxh5wnY5g4T3pTyd8kHRG8';
const TELEGRAM_BOT_USERNAME = 'caritasPQLamilagrosa_bot';

export interface ContactoTelegramSaman {
    chatId: string;
    tipo: 'INDIVIDUAL' | 'GRUPO';
    nombreTelegram: string;
    username: string | null;
    cedula: string | null;
    categoria: 'REPRESENTANTE' | 'MEL' | 'VOLUNTARIO' | 'COHORTE_ACTIVA' | 'GRUPO_VOLUNTARIOS';
    estatus: 'ACTIVO' | 'DADO_DE_ALTA';
    updatedAt: string;
    miembrosCount?: number;
    inviteLink?: string | null;
    // Datos cruzados automáticamente desde SAMÁN
    pacienteInfo?: {
        nombresPacientes: string[];
        ultimoTipoIngreso: string;
        dadoDeAltaAutomatico: boolean;
        telefono?: string;
    };
}

/**
 * Crea automáticamente la tabla de contactos y grupos de Telegram si no existe
 * (Compatible 100% con PostgreSQL en producción y SQLite en desarrollo)
 */
async function asegurarTablaTelegram() {
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "TelegramContactoSaman" (
                "chatId" TEXT PRIMARY KEY,
                "tipo" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
                "nombreTelegram" TEXT NOT NULL DEFAULT '',
                "username" TEXT,
                "cedula" TEXT,
                "categoria" TEXT NOT NULL DEFAULT 'REPRESENTANTE',
                "estatus" TEXT NOT NULL DEFAULT 'ACTIVO',
                "updatedAt" TEXT
            )
        `);
    } catch (error) {
        console.error('Error asegurando tabla TelegramContactoSaman:', error);
    }
}

/**
 * Consulta la API de Telegram (getUpdates) para detectar nuevos usuarios o grupos
 * que hayan iniciado conversación con @caritasPQLamilagrosa_bot
 */
export async function sincronizarContactosTelegram(omitirRevalidate = false) {
    try {
        await asegurarTablaTelegram();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?limit=100`, {
            cache: 'no-store',
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await res.json();

        if (!data.ok || !Array.isArray(data.result)) {
            return { success: false, error: 'No se pudo obtener actualizaciones del bot de Telegram' };
        }

        let nuevosOActualizados = 0;

        for (const update of data.result) {
            const msg = update.message || update.channel_post || update.my_chat_member?.chat;
            const chat = update.message?.chat || update.channel_post?.chat || update.my_chat_member?.chat;

            if (!chat || !chat.id) continue;

            const chatId = String(chat.id);
            const esGrupo = chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel';
            const tipo = esGrupo ? 'GRUPO' : 'INDIVIDUAL';
            const nombreTelegram = esGrupo
                ? (chat.title || 'Grupo de Telegram')
                : [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || 'Usuario Telegram';
            const username = chat.username || null;

            // Extraer cédula si el usuario envió "/start 19530148" o escribió su número de cédula en el chat
            let cedulaDetectada: string | null = null;
            const textoMensaje = String(update.message?.text || '').trim();
            if (textoMensaje) {
                const matchStart = textoMensaje.match(/^\/start\s+(\d{5,12})/i);
                const matchCedula = textoMensaje.match(/\b(\d{6,10})\b/);
                if (matchStart) {
                    cedulaDetectada = matchStart[1];
                } else if (matchCedula) {
                    cedulaDetectada = matchCedula[1];
                }
            }

            // Verificar si ya existe el contacto en la tabla
            const existentes: any[] = await prisma.$queryRawUnsafe<any[]>(
                `SELECT * FROM "TelegramContactoSaman" WHERE "chatId" = '${chatId.replace(/'/g, "''")}'`
            );

            const ahora = new Date().toISOString();

            if (!existentes || existentes.length === 0) {
                const categoriaInicial = esGrupo ? 'COHORTE_ACTIVA' : 'REPRESENTANTE';
                const cedulaSql = cedulaDetectada ? `'${cedulaDetectada.replace(/\D/g, '')}'` : 'NULL';
                const userSql = username ? `'${username.replace(/'/g, "''")}'` : 'NULL';
                const nombreSql = `'${nombreTelegram.replace(/'/g, "''")}'`;

                await prisma.$executeRawUnsafe(`
                    INSERT INTO "TelegramContactoSaman" ("chatId", "tipo", "nombreTelegram", "username", "cedula", "categoria", "estatus", "updatedAt")
                    VALUES ('${chatId.replace(/'/g, "''")}', '${tipo}', ${nombreSql}, ${userSql}, ${cedulaSql}, '${categoriaInicial}', 'ACTIVO', '${ahora}')
                `);
                nuevosOActualizados++;
            } else {
                const cedulaLimpia = cedulaDetectada ? cedulaDetectada.replace(/\D/g, '') : existentes[0].cedula;
                const cedulaUpdateSql = cedulaLimpia ? `'${String(cedulaLimpia).replace(/'/g, "''")}'` : 'NULL';
                const nombreSql = `'${nombreTelegram.replace(/'/g, "''")}'`;
                await prisma.$executeRawUnsafe(`
                    UPDATE "TelegramContactoSaman"
                    SET "nombreTelegram" = ${nombreSql},
                        "tipo" = '${tipo}',
                        "cedula" = ${cedulaUpdateSql},
                        "updatedAt" = '${ahora}'
                    WHERE "chatId" = '${chatId.replace(/'/g, "''")}'
                `);
                nuevosOActualizados++;
            }
        }

        if (!omitirRevalidate) {
            revalidatePath('/dashboard/saman');
        }
        return { success: true, nuevosOActualizados };
    } catch (error) {
        console.error('Error sincronizando contactos de Telegram:', error);
        return { success: false, error: 'Error al sincronizar con Telegram' };
    }
}

/**
 * Obtiene el directorio completo de contactos y grupos de Telegram,
 * cruzando con los registros activos y dados de alta de SAMÁN (Niños y MEL)
 */
export async function obtenerDirectorioTelegramSaman() {
    try {
        await asegurarTablaTelegram();
        // Sincronizar silenciosamente últimos mensajes al bot sin revalidar ruta para respuesta instantánea
        await sincronizarContactosTelegram(true).catch(() => null);

        let contactosRaw = await prisma.$queryRawUnsafe<any[]>(
            `SELECT * FROM "TelegramContactoSaman" ORDER BY "updatedAt" DESC`
        );

        // Asegurar que el grupo oficial creado "SAMAN grupo Cristo Rey - Tejerías" (-1004451440606) esté registrado
        const existeGrupoCristoRey = contactosRaw.some((c) => String(c.chatId) === '-1004451440606');
        if (!existeGrupoCristoRey) {
            const ahora = new Date().toISOString();
            await prisma.$executeRawUnsafe(`
                INSERT INTO "TelegramContactoSaman" ("chatId", "tipo", "nombreTelegram", "username", "cedula", "categoria", "estatus", "updatedAt")
                VALUES ('-1004451440606', 'GRUPO', 'SAMAN grupo Cristo Rey - Tejerías', NULL, NULL, 'COHORTE_ACTIVA', 'ACTIVO', '${ahora}')
            `).catch(() => null);
            contactosRaw = await prisma.$queryRawUnsafe<any[]>(
                `SELECT * FROM "TelegramContactoSaman" ORDER BY "updatedAt" DESC`
            );
        }

        // Obtener historial de niños y MEL para saber quiénes están activos y quiénes dados de alta
        const ninos = await prisma.registroSamanNinos.findMany({
            include: { jornada: true },
            orderBy: [{ jornada: { fecha: 'desc' } }, { id: 'desc' }],
        });

        const embarazadas = await prisma.registroSamanEmbarazadas.findMany({
            include: { jornada: true },
            orderBy: [{ jornada: { fecha: 'desc' } }, { id: 'desc' }],
        });

        // Mapa por cédula de representante / MEL
        const mapaPacientesPorCedula = new Map<
            string,
            {
                cedula: string;
                esMel: boolean;
                comunidad: string;
                nombresPacientes: string[];
                ultimoTipoIngreso: string;
                dadoDeAltaAutomatico: boolean;
            }
        >();

        // Agrupar niños por clave única (cédula + nombre) para conocer el último estado de cada niño
        const ultimoEstadoPorNino = new Map<string, any>();
        for (const n of ninos) {
            const clave = `${n.cedulaRepresentante.trim()}_${n.nombres.trim()}`;
            if (!ultimoEstadoPorNino.has(clave)) {
                ultimoEstadoPorNino.set(clave, n);
            }
        }

        for (const n of ultimoEstadoPorNino.values()) {
            const ced = n.cedulaRepresentante.replace(/\D/g, '').trim();
            if (!ced) continue;

            const comNino = n.jornada?.comunidad || 'TEJERÍAS';
            const actual = mapaPacientesPorCedula.get(ced) || {
                cedula: ced,
                esMel: false,
                comunidad: comNino,
                nombresPacientes: [] as string[],
                ultimoTipoIngreso: n.tipoIngreso,
                dadoDeAltaAutomatico: true, // Se vuelve false si al menos 1 niño sigue activo
            };

            const etiquetaNino = `${n.nombres} ${n.apellidos} (${n.tipoIngreso})`;
            if (!actual.nombresPacientes.includes(etiquetaNino)) {
                actual.nombresPacientes.push(etiquetaNino);
            }

            if (n.tipoIngreso !== 'SALIDA DE VIVERO') {
                actual.dadoDeAltaAutomatico = false;
                actual.ultimoTipoIngreso = n.tipoIngreso;
                actual.comunidad = comNino;
            }

            mapaPacientesPorCedula.set(ced, actual);
        }

        // Agrupar MEL por cédula
        const ultimoEstadoPorMel = new Map<string, any>();
        for (const m of embarazadas) {
            const ced = m.cedula.replace(/\D/g, '').trim();
            if (ced && !ultimoEstadoPorMel.has(ced)) {
                ultimoEstadoPorMel.set(ced, m);
            }
        }

        for (const m of ultimoEstadoPorMel.values()) {
            const ced = m.cedula.replace(/\D/g, '').trim();
            if (!ced) continue;

            const comMel = m.jornada?.comunidad || 'TEJERÍAS';
            const actual = mapaPacientesPorCedula.get(ced) || {
                cedula: ced,
                esMel: true,
                comunidad: comMel,
                nombresPacientes: [] as string[],
                ultimoTipoIngreso: m.tipoIngreso,
                dadoDeAltaAutomatico: true,
            };

            const etiquetaMel = `${m.nombre} ${m.apellido} [MEL - ${m.tipoIngreso}]`;
            if (!actual.nombresPacientes.includes(etiquetaMel)) {
                actual.nombresPacientes.push(etiquetaMel);
            }

            if (m.tipoIngreso !== 'SALIDA DE VIVERO') {
                actual.dadoDeAltaAutomatico = false;
                actual.ultimoTipoIngreso = m.tipoIngreso;
                actual.comunidad = comMel;
            }

            mapaPacientesPorCedula.set(ced, actual);
        }

        const mapaTelefonos = await obtenerMapaTelefonosSaman();

        // Enriquecer contactos de Telegram con la información clínica de SAMÁN y conteo de miembros/link de grupos
        const contactos: ContactoTelegramSaman[] = await Promise.all(
            contactosRaw.map(async (c) => {
                const cedLimpia = c.cedula ? String(c.cedula).replace(/\D/g, '').trim() : '';
                const infoSaman = cedLimpia ? mapaPacientesPorCedula.get(cedLimpia) : undefined;
                const telSaman = cedLimpia ? mapaTelefonos.get(cedLimpia) || '' : '';
                const esGrupo = c.tipo === 'GRUPO';

                let miembrosCount: number | undefined = undefined;
                let inviteLink: string | null = null;

                if (esGrupo) {
                    try {
                        const [countRes, chatRes] = await Promise.all([
                            fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMemberCount?chat_id=${c.chatId}`, {
                                cache: 'no-store',
                            }).then((r) => r.json()).catch(() => null),
                            fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${c.chatId}`, {
                                cache: 'no-store',
                            }).then((r) => r.json()).catch(() => null),
                        ]);
                        if (countRes?.ok && typeof countRes.result === 'number') {
                            miembrosCount = countRes.result;
                        }
                        if (chatRes?.ok && chatRes.result?.invite_link) {
                            inviteLink = chatRes.result.invite_link;
                        } else {
                            const expRes = await fetch(
                                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/exportChatInviteLink?chat_id=${c.chatId}`,
                                { cache: 'no-store' }
                            ).then((r) => r.json()).catch(() => null);
                            if (expRes?.ok && expRes.result) {
                                inviteLink = expRes.result;
                            }
                        }
                        // Fallback para el Grupo de Voluntarios Cáritas PQ La Milagrosa (-1003947280462)
                        if (!inviteLink && String(c.chatId) === '-1003947280462') {
                            inviteLink = 'https://t.me/+nFlsnpcdjWNkMzZh';
                        }
                    } catch {
                        // Ignorar si el bot no es admin en algún grupo antiguo
                    }
                }

                // Si el paciente ya tuvo SALIDA DE VIVERO en todos sus registros, se considera dado de alta
                const estatusEfectivo =
                    c.estatus === 'DADO_DE_ALTA' || infoSaman?.dadoDeAltaAutomatico
                        ? 'DADO_DE_ALTA'
                        : 'ACTIVO';

                return {
                    chatId: String(c.chatId),
                    tipo: esGrupo ? 'GRUPO' : 'INDIVIDUAL',
                    nombreTelegram: c.nombreTelegram || 'Contacto Telegram',
                    username: c.username || null,
                    cedula: cedLimpia || null,
                    categoria: c.categoria || (infoSaman?.esMel ? 'MEL' : 'REPRESENTANTE'),
                    estatus: estatusEfectivo,
                    updatedAt: c.updatedAt || new Date().toISOString(),
                    miembrosCount,
                    inviteLink,
                    pacienteInfo: infoSaman
                        ? {
                              nombresPacientes: infoSaman.nombresPacientes,
                              ultimoTipoIngreso: infoSaman.ultimoTipoIngreso,
                              dadoDeAltaAutomatico: infoSaman.dadoDeAltaAutomatico,
                              telefono: telSaman,
                          }
                        : undefined,
                };
            })
        );

        // Lista de pacientes de SAMÁN para facilitar vinculación por cédula
        const pacientesSaman = Array.from(mapaPacientesPorCedula.values()).map((p) => {
            const contactoVinculado = contactos.find((c) => c.cedula === p.cedula);
            const tel = mapaTelefonos.get(p.cedula) || '';
            return {
                ...p,
                telefono: tel,
                vinculado: Boolean(contactoVinculado),
                chatId: contactoVinculado?.chatId || null,
                linkVinculacion: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${p.cedula}`,
            };
        });

        return {
            success: true,
            botUsername: TELEGRAM_BOT_USERNAME,
            botLink: `https://t.me/${TELEGRAM_BOT_USERNAME}`,
            contactos,
            pacientesSaman,
        };
    } catch (error) {
        console.error('Error obteniendo directorio Telegram SAMÁN:', error);
        return {
            success: false,
            botUsername: TELEGRAM_BOT_USERNAME,
            botLink: `https://t.me/${TELEGRAM_BOT_USERNAME}`,
            contactos: [],
            pacientesSaman: [],
        };
    }
}

/**
 * Registra o actualiza manualmente un contacto o grupo de Telegram
 * (Ej. asociar cédula, cambiar categoría a Voluntario, o marcar grupo como Dado de Alta)
 */
export async function guardarContactoTelegramSaman(datos: {
    chatId: string;
    tipo: 'INDIVIDUAL' | 'GRUPO';
    nombreTelegram: string;
    cedula?: string;
    categoria: string;
    estatus: 'ACTIVO' | 'DADO_DE_ALTA';
}) {
    try {
        await asegurarTablaTelegram();
        const chatIdLimpio = String(datos.chatId).trim().replace(/'/g, "''");
        const nombreLimpio = String(datos.nombreTelegram || 'Contacto').trim().replace(/'/g, "''");
        const cedulaLimpia = datos.cedula ? String(datos.cedula).replace(/\D/g, '').trim() : '';
        const cedulaSql = cedulaLimpia ? `'${cedulaLimpia}'` : 'NULL';
        const ahora = new Date().toISOString();

        const existentes = await prisma.$queryRawUnsafe<any[]>(
            `SELECT * FROM "TelegramContactoSaman" WHERE "chatId" = '${chatIdLimpio}'`
        );

        if (!existentes || existentes.length === 0) {
            await prisma.$executeRawUnsafe(`
                INSERT INTO "TelegramContactoSaman" ("chatId", "tipo", "nombreTelegram", "username", "cedula", "categoria", "estatus", "updatedAt")
                VALUES ('${chatIdLimpio}', '${datos.tipo}', '${nombreLimpio}', NULL, ${cedulaSql}, '${datos.categoria}', '${datos.estatus}', '${ahora}')
            `);
        } else {
            await prisma.$executeRawUnsafe(`
                UPDATE "TelegramContactoSaman"
                SET "nombreTelegram" = '${nombreLimpio}',
                    "tipo" = '${datos.tipo}',
                    "cedula" = ${cedulaSql},
                    "categoria" = '${datos.categoria}',
                    "estatus" = '${datos.estatus}',
                    "updatedAt" = '${ahora}'
                WHERE "chatId" = '${chatIdLimpio}'
            `);
        }

        revalidatePath('/dashboard/saman');
        return { success: true };
    } catch (error) {
        console.error('Error guardando contacto Telegram:', error);
        return { success: false, error: 'No se pudo guardar el contacto o grupo de Telegram' };
    }
}

/**
 * Cambia rápidamente el estatus de un grupo o contacto (ACTIVO <-> DADO_DE_ALTA)
 */
export async function cambiarEstatusContactoTelegram(chatId: string, nuevoEstatus: 'ACTIVO' | 'DADO_DE_ALTA') {
    try {
        await asegurarTablaTelegram();
        const chatIdLimpio = String(chatId).trim().replace(/'/g, "''");
        const ahora = new Date().toISOString();

        await prisma.$executeRawUnsafe(`
            UPDATE "TelegramContactoSaman"
            SET "estatus" = '${nuevoEstatus}', "updatedAt" = '${ahora}'
            WHERE "chatId" = '${chatIdLimpio}'
        `);

        revalidatePath('/dashboard/saman');
        return { success: true };
    } catch (error) {
        console.error('Error cambiando estatus Telegram:', error);
        return { success: false, error: 'No se pudo actualizar el estatus' };
    }
}

/**
 * Elimina un contacto o grupo del directorio de Telegram
 */
export async function eliminarContactoTelegram(chatId: string) {
    try {
        await asegurarTablaTelegram();
        const chatIdLimpio = String(chatId).trim().replace(/'/g, "''");

        await prisma.$executeRawUnsafe(`
            DELETE FROM "TelegramContactoSaman" WHERE "chatId" = '${chatIdLimpio}'
        `);

        revalidatePath('/dashboard/saman');
        return { success: true };
    } catch (error) {
        console.error('Error eliminando contacto Telegram:', error);
        return { success: false, error: 'No se pudo eliminar el contacto' };
    }
}

/**
 * Envía el recordatorio o notificación por Telegram a los destinatarios seleccionados
 */
export async function enviarNotificacionTelegramSaman(payload: {
    chatIds: string[];
    mensaje: string;
}) {
    try {
        if (!payload.chatIds || payload.chatIds.length === 0) {
            return { success: false, error: 'Selecciona al menos un destinatario o grupo activo' };
        }
        if (!payload.mensaje || !payload.mensaje.trim()) {
            return { success: false, error: 'El mensaje no puede estar vacío' };
        }

        let enviados = 0;
        let fallidos = 0;
        const erroresDetalle: string[] = [];

        for (const chatId of payload.chatIds) {
            try {
                const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId.trim(),
                        text: payload.mensaje,
                    }),
                });
                const data = await res.json();
                if (data.ok) {
                    enviados++;
                } else {
                    fallidos++;
                    erroresDetalle.push(`Chat ${chatId}: ${data.description || 'Error desconocido'}`);
                }
            } catch (err: any) {
                fallidos++;
                erroresDetalle.push(`Chat ${chatId}: ${err.message}`);
            }
        }

        return {
            success: enviados > 0,
            enviados,
            fallidos,
            erroresDetalle,
        };
    } catch (error) {
        console.error('Error enviando notificación por Telegram:', error);
        return { success: false, error: 'Error de conexión al enviar mensajes a Telegram' };
    }
}
