'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Send,
    X,
    RefreshCw,
    Users,
    UserCheck,
    User,
    ShieldAlert,
    CheckCircle2,
    Copy,
    Check,
    Plus,
    Trash2,
    Calendar,
    Clock,
    MapPin,
    Sparkles,
} from 'lucide-react';
import {
    obtenerDirectorioTelegramSaman,
    sincronizarContactosTelegram,
    guardarContactoTelegramSaman,
    cambiarEstatusContactoTelegram,
    eliminarContactoTelegram,
    enviarNotificacionTelegramSaman,
    ContactoTelegramSaman,
} from '@/app/actions/telegram-saman';

interface SamanTelegramModalProps {
    isOpen: boolean;
    onClose: () => void;
    comunidadDefault?: string;
    pacientePreseleccionado?: {
        cedula: string;
        nombre: string;
    } | null;
}

export default function SamanTelegramModal({
    isOpen,
    onClose,
    comunidadDefault = 'Sede Cáritas Parroquial La Milagrosa - El Limón',
    pacientePreseleccionado = null,
}: SamanTelegramModalProps) {
    const [cargando, setCargando] = useState(false);
    const [sincronizando, setSincronizando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [copiadoId, setCopiadoId] = useState<string | null>(null);

    const [botUsername, setBotUsername] = useState('caritasPQLamilagrosa_bot');
    const [contactos, setContactos] = useState<ContactoTelegramSaman[]>([]);
    const [pacientesSaman, setPacientesSaman] = useState<any[]>([]);

    // Modalidades: 'GRUPOS' | 'MONITOREO_ACTIVOS' | 'INDIVIDUAL'
    const [modoEnvio, setModoEnvio] = useState<'GRUPOS' | 'MONITOREO_ACTIVOS' | 'INDIVIDUAL'>('GRUPOS');

    // Destinatarios seleccionados (chatIds)
    const [seleccionadosIds, setSeleccionadosIds] = useState<string[]>([]);
    const [busquedaIndividual, setBusquedaIndividual] = useState('');

    // Datos dinámicos para la plantilla de la próxima jornada (Por defecto: mañana = 1 día antes)
    const mananaStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
    }, []);

    const [fechaProxima, setFechaProxima] = useState(mananaStr);
    const [horaProxima, setHoraProxima] = useState('8:00 AM a 12:00 PM');
    const [lugarProximo, setLugarProximo] = useState(comunidadDefault);
    const [tipoPlantilla, setTipoPlantilla] = useState<'REPRESENTANTES' | 'VOLUNTARIOS'>('REPRESENTANTES');
    const [mensajeTexto, setMensajeTexto] = useState('');

    // Formulario rápido para vincular o agregar grupo/contacto manualmente
    const [mostrarFormManual, setMostrarFormManual] = useState(false);
    const [formManual, setFormManual] = useState({
        chatId: '',
        tipo: 'GRUPO' as 'GRUPO' | 'INDIVIDUAL',
        nombreTelegram: '',
        cedula: '',
        categoria: 'COHORTE_ACTIVA',
    });

    const [resultadoEnvio, setResultadoEnvio] = useState<{
        ok: boolean;
        texto: string;
    } | null>(null);

    // Formatear día de la semana y fecha legible en español
    const obtenerFechaFormateada = (isoDate: string) => {
        if (!isoDate) return { diaSemana: 'Viernes', fechaLarga: 'Próxima Jornada' };
        const fechaObj = new Date(isoDate + 'T12:00:00');
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
        ];
        const diaSemana = dias[fechaObj.getDay()];
        const fechaLarga = `${fechaObj.getDate()} de ${meses[fechaObj.getMonth()]} de ${fechaObj.getFullYear()}`;
        return { diaSemana, fechaLarga };
    };

    // Construir mensaje según plantilla oficial (sin pedir sobres vacíos)
    const construirPlantilla = (
        tipo: 'REPRESENTANTES' | 'VOLUNTARIOS',
        fechaIso: string,
        hora: string,
        lugar: string
    ) => {
        const { diaSemana, fechaLarga } = obtenerFechaFormateada(fechaIso);

        if (tipo === 'REPRESENTANTES') {
            return `📢 RECORDATORIO DE JORNADA — PROGRAMA SAMÁN
⛪ Cáritas Parroquial La Milagrosa (El Limón)

¡Saludos cordiales, estimadas madres, representantes y beneficiarias! 💛
Les recordamos que MAÑANA realizaremos nuestra jornada de atención y monitoreo nutricional del Programa SAMÁN:

🗓️ Día: ${diaSemana}
📅 Fecha: ${fechaLarga}
⏰ Hora: ${hora}
📍 Lugar: ${lugar}

👶 ¿A quiénes está dirigida la jornada?
• Niños y niñas desde los 6 meses de edad hasta los 4 años y 11 meses (59 meses).
• Mujeres Embarazadas y Madres Lactantes (MEL).

📋 Recomendaciones importantes:
1️⃣ Asistir puntualmente con el niño o niña para su control de medida de brazo (CBI), talla y peso.
2️⃣ Presentar la Cédula de Identidad de la madre o representante.

¡Contamos con su asistencia por la salud y el bienestar de nuestros niños! 🙏✨`;
        } else {
            return `🤝 CONVOCATORIA EQUIPO DE VOLUNTARIOS — JORNADA SAMÁN
⛪ Cáritas Parroquial La Milagrosa (El Limón)

¡Bendecido día, querido equipo de voluntarios! 🙌
Les recordamos que MAÑANA tendremos nuestra jornada de monitoreo y evaluación nutricional del Programa SAMÁN:

🗓️ Día: ${diaSemana}
📅 Fecha: ${fechaLarga}
⏰ Hora de encuentro: ${hora}
📍 Lugar: ${lugar}

🎯 Atención de la jornada:
• Tamizaje antropométrico (1° CBI, 2° Talla y 3° Peso) y entrega de complementos para niños y niñas de 6 meses a 4 años y 11 meses, así como atención a Mujeres Embarazadas y Lactantes (MEL).

¡Gracias por su entrega, servicio y compromiso con nuestra comunidad! ❤️✝️`;
        }
    };

    // Actualizar mensaje cuando cambian fecha, hora, lugar o tipo de plantilla
    useEffect(() => {
        setMensajeTexto(construirPlantilla(tipoPlantilla, fechaProxima, horaProxima, lugarProximo));
    }, [tipoPlantilla, fechaProxima, horaProxima, lugarProximo]);

    // Cargar directorio al abrir el modal
    const cargarDirectorio = async () => {
        setCargando(true);
        const res = await obtenerDirectorioTelegramSaman();
        if (res.success) {
            setBotUsername(res.botUsername);
            setContactos(res.contactos || []);
            setPacientesSaman(res.pacientesSaman || []);

            // Preseleccionar según el modo activo
            if (pacientePreseleccionado) {
                setModoEnvio('INDIVIDUAL');
                setBusquedaIndividual(pacientePreseleccionado.cedula);
                const encontrado = (res.contactos || []).find((c) => c.cedula === pacientePreseleccionado.cedula);
                if (encontrado) {
                    setSeleccionadosIds([encontrado.chatId]);
                }
            } else {
                const gruposActivos = (res.contactos || [])
                    .filter((c) => c.tipo === 'GRUPO' && c.estatus === 'ACTIVO')
                    .map((c) => c.chatId);
                setSeleccionadosIds(gruposActivos);
            }
        }
        setCargando(false);
    };

    useEffect(() => {
        if (isOpen) {
            setResultadoEnvio(null);
            cargarDirectorio();
        }
    }, [isOpen, pacientePreseleccionado]);

    // Cambiar selección por defecto cuando el usuario cambia de pestaña de modo
    const cambiarModoEnvio = (nuevoModo: 'GRUPOS' | 'MONITOREO_ACTIVOS' | 'INDIVIDUAL') => {
        setModoEnvio(nuevoModo);
        setResultadoEnvio(null);
        if (nuevoModo === 'GRUPOS') {
            const gruposActivos = contactos
                .filter((c) => c.tipo === 'GRUPO' && c.estatus === 'ACTIVO')
                .map((c) => c.chatId);
            setSeleccionadosIds(gruposActivos);
        } else if (nuevoModo === 'MONITOREO_ACTIVOS') {
            const individualesActivos = contactos
                .filter((c) => c.tipo === 'INDIVIDUAL' && c.estatus === 'ACTIVO')
                .map((c) => c.chatId);
            setSeleccionadosIds(individualesActivos);
        } else {
            setSeleccionadosIds([]);
        }
    };

    const handleSincronizarBot = async () => {
        setSincronizando(true);
        setResultadoEnvio(null);
        await sincronizarContactosTelegram();
        await cargarDirectorio();
        setSincronizando(false);
    };

    const toggleDestinatario = (chatId: string) => {
        setSeleccionadosIds((prev) =>
            prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
        );
    };

    const copiarTexto = (texto: string, idRef: string) => {
        navigator.clipboard.writeText(texto);
        setCopiadoId(idRef);
        setTimeout(() => setCopiadoId(null), 2000);
    };

    const handleGuardarManual = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formManual.chatId || !formManual.nombreTelegram) return;
        await guardarContactoTelegramSaman({
            chatId: formManual.chatId,
            tipo: formManual.tipo,
            nombreTelegram: formManual.nombreTelegram,
            cedula: formManual.cedula,
            categoria: formManual.categoria,
            estatus: 'ACTIVO',
        });
        setFormManual({
            chatId: '',
            tipo: 'GRUPO',
            nombreTelegram: '',
            cedula: '',
            categoria: 'COHORTE_ACTIVA',
        });
        setMostrarFormManual(false);
        await cargarDirectorio();
    };

    const handleCambiarEstatus = async (chatId: string, actual: 'ACTIVO' | 'DADO_DE_ALTA') => {
        const nuevo = actual === 'ACTIVO' ? 'DADO_DE_ALTA' : 'ACTIVO';
        await cambiarEstatusContactoTelegram(chatId, nuevo);
        await cargarDirectorio();
    };

    const handleAsociarCedulaContacto = async (contacto: ContactoTelegramSaman, nuevaCedula: string) => {
        await guardarContactoTelegramSaman({
            chatId: contacto.chatId,
            tipo: contacto.tipo,
            nombreTelegram: contacto.nombreTelegram,
            cedula: nuevaCedula,
            categoria: contacto.categoria,
            estatus: contacto.estatus,
        });
        await cargarDirectorio();
    };

    const handleEnviarTelegram = async () => {
        if (seleccionadosIds.length === 0) {
            alert('Por favor selecciona al menos un grupo o destinatario activo.');
            return;
        }
        setEnviando(true);
        setResultadoEnvio(null);
        const res = await enviarNotificacionTelegramSaman({
            chatIds: seleccionadosIds,
            mensaje: mensajeTexto,
        });
        setEnviando(false);

        if (res.success) {
            setResultadoEnvio({
                ok: true,
                texto: `✅ Notificación enviada con éxito a ${res.enviados} destinatario(s)/grupo(s) de Telegram.${
                    res.fallidos ? ` (${res.fallidos} fallidos)` : ''
                }`,
            });
        } else {
            setResultadoEnvio({
                ok: false,
                texto: `⚠️ No se pudo enviar el mensaje: ${
                    res.erroresDetalle?.join(' | ') || res.error || 'Verifica que el bot esté en el grupo o que el usuario haya iniciado el bot.'
                }`,
            });
        }
    };

    if (!isOpen) return null;

    const gruposTelegram = contactos.filter((c) => c.tipo === 'GRUPO');
    const contactosIndividuales = contactos.filter((c) => c.tipo === 'INDIVIDUAL');
    const contactosActivosMonitoreo = contactosIndividuales.filter((c) => c.estatus === 'ACTIVO');
    const contactosDadosDeAlta = contactosIndividuales.filter((c) => c.estatus === 'DADO_DE_ALTA');

    const contactosIndividualesFiltrados = contactosIndividuales.filter((c) => {
        if (!busquedaIndividual.trim()) return true;
        const q = busquedaIndividual.toLowerCase();
        return (
            c.nombreTelegram.toLowerCase().includes(q) ||
            (c.cedula && c.cedula.includes(q)) ||
            (c.pacienteInfo?.nombresPacientes.join(' ').toLowerCase().includes(q) ?? false)
        );
    });

    const pacientesSinVincularFiltrados = pacientesSaman.filter((p) => {
        if (p.vinculado) return false;
        if (!busquedaIndividual.trim()) return true;
        const q = busquedaIndividual.toLowerCase();
        return (
            p.cedula.includes(q) ||
            p.nombresPacientes.join(' ').toLowerCase().includes(q)
        );
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[94vh] flex flex-col">
                {/* CABECERA DEL MODAL */}
                <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 p-5 text-white flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shadow-inner">
                            <Send className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                                <span>Notificaciones Telegram — Programa SAMÁN</span>
                                <span className="text-[11px] bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
                                    Bot Activo
                                </span>
                            </h3>
                            <p className="text-xs text-sky-100">
                                Bot oficial conectado: <strong>@{botUsername}</strong> • Recordatorios por Grupos Activos, Monitoreo y Personal
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => copiarTexto(`https://t.me/${botUsername}`, 'bot-main')}
                            className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Copiar enlace directo del Bot para enviarlo a madres o voluntarios"
                        >
                            {copiadoId === 'bot-main' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiadoId === 'bot-main' ? 'Enlace Copiado' : 'Copiar Link del Bot'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSincronizarBot}
                            disabled={sincronizando}
                            className="px-3.5 py-2 rounded-xl bg-white text-blue-700 hover:bg-sky-50 text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
                            <span>{sincronizando ? 'Sincronizando...' : 'Detectar Nuevos Chats/Grupos'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* CUERPO PRINCIPAL DIVIDIDO EN 2 COLUMNAS */}
                <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                    {/* COLUMNA IZQUIERDA (7 COL): DESTINATARIOS (GRUPOS ACTIVOS / MONITOREO / INDIVIDUAL) */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* SELECTOR DE LAS 3 MODALIDADES */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                            <button
                                type="button"
                                onClick={() => cambiarModoEnvio('GRUPOS')}
                                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    modoEnvio === 'GRUPOS'
                                        ? 'bg-white text-blue-700 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Users className="w-4 h-4" />
                                <span>1. Por Grupos ({gruposTelegram.filter((g) => g.estatus === 'ACTIVO').length})</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => cambiarModoEnvio('MONITOREO_ACTIVOS')}
                                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    modoEnvio === 'MONITOREO_ACTIVOS'
                                        ? 'bg-white text-emerald-700 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <UserCheck className="w-4 h-4" />
                                <span>2. Activos Monitoreo ({contactosActivosMonitoreo.length})</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => cambiarModoEnvio('INDIVIDUAL')}
                                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    modoEnvio === 'INDIVIDUAL'
                                        ? 'bg-white text-indigo-700 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <User className="w-4 h-4" />
                                <span>3. Personal / Individual</span>
                            </button>
                        </div>

                        {/* ========================================================================= */}
                        {/* VISTA MODO 1: POR GRUPOS / COHORTES ACTIVAS (EXCLUYE GRUPOS DADOS DE ALTA) */}
                        {/* ========================================================================= */}
                        {modoEnvio === 'GRUPOS' && (
                            <div className="space-y-3">
                                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 text-xs text-slate-700 space-y-1">
                                    <div className="font-bold text-blue-900 flex items-center justify-between">
                                        <span>💡 ¿Cómo agregar un Grupo de Cohorte o de Voluntarios?</span>
                                        <button
                                            type="button"
                                            onClick={() => setMostrarFormManual(!mostrarFormManual)}
                                            className="text-blue-700 hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Registrar ID Manual
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-slate-600">
                                        1. Crea tu grupo en Telegram (ej. <em>&ldquo;SAMÁN Cohorte Noviembre&rdquo;</em> o <em>&ldquo;Voluntarios Cáritas&rdquo;</em>).<br />
                                        2. Agrega como miembro del grupo a <strong>@{botUsername}</strong> y escribe <code>/start</code> en el grupo.<br />
                                        3. Pulsa arriba en <strong>&ldquo;Detectar Nuevos Chats/Grupos&rdquo;</strong> y aparecerá aquí automáticamente. Cuando una cohorte termine y sea dada de alta, márcala como <strong>&ldquo;Dado de Alta&rdquo;</strong> para bloquear futuros envíos.
                                    </p>
                                </div>

                                {mostrarFormManual && (
                                    <form onSubmit={handleGuardarManual} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                                        <div className="text-xs font-bold text-slate-800">Registrar Grupo o Contacto Manualmente</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                            <input
                                                type="text"
                                                required
                                                placeholder="Chat ID (ej: -100123456)"
                                                value={formManual.chatId}
                                                onChange={(e) => setFormManual({ ...formManual, chatId: e.target.value })}
                                                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                                            />
                                            <input
                                                type="text"
                                                required
                                                placeholder="Nombre del Grupo o Persona"
                                                value={formManual.nombreTelegram}
                                                onChange={(e) => setFormManual({ ...formManual, nombreTelegram: e.target.value })}
                                                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                                            />
                                            <select
                                                value={formManual.tipo}
                                                onChange={(e) =>
                                                    setFormManual({
                                                        ...formManual,
                                                        tipo: e.target.value as 'GRUPO' | 'INDIVIDUAL',
                                                    })
                                                }
                                                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                                            >
                                                <option value="GRUPO">Grupo / Canal</option>
                                                <option value="INDIVIDUAL">Persona Individual</option>
                                            </select>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setMostrarFormManual(false)}
                                                className="px-3 py-1.5 text-xs text-slate-600"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                                            >
                                                Guardar
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {gruposTelegram.length === 0 ? (
                                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                                        <Users className="w-8 h-8 text-slate-400 mx-auto" />
                                        <p className="text-xs font-bold text-slate-700">
                                            Aún no se han detectado grupos vinculados al bot
                                        </p>
                                        <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                                            Agrega a <strong>@{botUsername}</strong> a tu grupo de Telegram de la cohorte actual o de voluntarios, envía un mensaje en el grupo y presiona <strong>&ldquo;Detectar Nuevos Chats/Grupos&rdquo;</strong>.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                        {gruposTelegram.map((g) => {
                                            const estaActivo = g.estatus === 'ACTIVO';
                                            const seleccionado = seleccionadosIds.includes(g.chatId);
                                            return (
                                                <div
                                                    key={g.chatId}
                                                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                                        !estaActivo
                                                            ? 'bg-slate-100/80 border-slate-200 opacity-65'
                                                            : seleccionado
                                                            ? 'bg-blue-50/70 border-blue-400 shadow-2xs'
                                                            : 'bg-white border-slate-200'
                                                    }`}
                                                >
                                                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            disabled={!estaActivo}
                                                            checked={estaActivo && seleccionado}
                                                            onChange={() => toggleDestinatario(g.chatId)}
                                                            className="w-4 h-4 rounded text-blue-600 disabled:opacity-40"
                                                        />
                                                        <div className="truncate">
                                                            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                                                <span className="truncate">{g.nombreTelegram}</span>
                                                                <span
                                                                    className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                                                                        estaActivo
                                                                            ? 'bg-emerald-100 text-emerald-800'
                                                                            : 'bg-red-100 text-red-700'
                                                                    }`}
                                                                >
                                                                    {estaActivo ? '🟢 Grupo Activo' : '🚫 Grupo Dado de Alta (No enviar)'}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-slate-500">
                                                                ID: {g.chatId}
                                                            </div>
                                                        </div>
                                                    </label>

                                                    <div className="flex items-center gap-1.5 flex-none">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCambiarEstatus(g.chatId, g.estatus)}
                                                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                                                estaActivo
                                                                    ? 'bg-white border-amber-300 text-amber-800 hover:bg-amber-50'
                                                                    : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                                                            }`}
                                                            title={
                                                                estaActivo
                                                                    ? 'Dar de alta a este grupo para que no reciba más recordatorios'
                                                                    : 'Reactivar este grupo'
                                                            }
                                                        >
                                                            {estaActivo ? 'Dar de Alta / Cerrar Grupo' : 'Reactivar Grupo'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (confirm(`¿Eliminar el grupo ${g.nombreTelegram} de la lista?`)) {
                                                                    await eliminarContactoTelegram(g.chatId);
                                                                    await cargarDirectorio();
                                                                }
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ========================================================================= */}
                        {/* VISTA MODO 2: PACIENTES ACTIVOS EN MONITOREO (FILTRA DADOS DE ALTA)        */}
                        {/* ========================================================================= */}
                        {modoEnvio === 'MONITOREO_ACTIVOS' && (
                            <div className="space-y-3">
                                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-950 space-y-1">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span>Filtro Inteligente de Cohorte Activa</span>
                                    </div>
                                    <p className="text-[11px] text-emerald-800">
                                        El sistema selecciona únicamente a los representantes y mujeres MEL activos en monitoreo y <strong>excluye automáticamente</strong> a quienes ya tuvieron <strong>SALIDA DE VIVERO (Dados de Alta)</strong>.
                                    </p>
                                </div>

                                {contactosActivosMonitoreo.length === 0 ? (
                                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                                        <p className="text-xs font-bold text-slate-700">
                                            No hay representantes individuales activos vinculados todavía
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                            Pasa a la pestaña <strong>&ldquo;3. Personal / Individual&rdquo;</strong> para copiar el link de invitación o pedirle a la representante que envíe su número de cédula al bot <strong>@{botUsername}</strong>.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {contactosActivosMonitoreo.map((c) => {
                                            const sel = seleccionadosIds.includes(c.chatId);
                                            return (
                                                <label
                                                    key={c.chatId}
                                                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                                        sel ? 'bg-emerald-50/70 border-emerald-400' : 'bg-white border-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={sel}
                                                            onChange={() => toggleDestinatario(c.chatId)}
                                                            className="w-4 h-4 rounded text-emerald-600"
                                                        />
                                                        <div className="truncate">
                                                            <div className="text-xs font-bold text-slate-900">
                                                                {c.nombreTelegram}{' '}
                                                                {c.cedula && (
                                                                    <span className="text-emerald-700 font-extrabold">
                                                                        (C.I. {c.cedula})
                                                                    </span>
                                                                )}
                                                                {c.pacienteInfo?.telefono && (
                                                                    <span className="text-slate-500 font-semibold ml-1">
                                                                        • 📞 {c.pacienteInfo.telefono}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {c.pacienteInfo ? (
                                                                <div className="text-[11px] text-slate-600 truncate">
                                                                    👶 {c.pacienteInfo.nombresPacientes.join(' • ')}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[10px] text-slate-400">
                                                                    Contacto activo en Telegram
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex-none">
                                                        Activo
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* LISTA DE EXCLUIDOS POR SALIDA DE VIVERO (DADOS DE ALTA) */}
                                {contactosDadosDeAlta.length > 0 && (
                                    <div className="pt-2">
                                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Excluidos Automáticamente por Alta / Salida de Vivero ({contactosDadosDeAlta.length})</span>
                                        </div>
                                        <div className="space-y-1.5 max-h-32 overflow-y-auto opacity-65">
                                            {contactosDadosDeAlta.map((c) => (
                                                <div
                                                    key={c.chatId}
                                                    className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between text-xs"
                                                >
                                                    <div className="truncate">
                                                        <span className="font-bold text-slate-700 line-through">
                                                            {c.nombreTelegram} {c.cedula ? `(C.I. ${c.cedula})` : ''}
                                                        </span>
                                                        {c.pacienteInfo && (
                                                            <span className="text-[10px] text-slate-500 block">
                                                                {c.pacienteInfo.nombresPacientes.join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full flex-none">
                                                        Dado de Alta (No se envía)
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ========================================================================= */}
                        {/* VISTA MODO 3: ENVÍO PERSONAL / INDIVIDUAL Y VINCULACIÓN POR CÉDULA        */}
                        {/* ========================================================================= */}
                        {modoEnvio === 'INDIVIDUAL' && (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={busquedaIndividual}
                                    onChange={(e) => setBusquedaIndividual(e.target.value)}
                                    placeholder="🔍 Buscar representante, niño/a, MEL o cédula..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />

                                {/* Contactos de Telegram ya conectados */}
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        Personas Conectadas al Bot ({contactosIndividualesFiltrados.length})
                                    </div>
                                    {contactosIndividualesFiltrados.length === 0 ? (
                                        <div className="p-4 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
                                            Ningún contacto conectado coincide con la búsqueda.
                                        </div>
                                    ) : (
                                        contactosIndividualesFiltrados.map((c) => {
                                            const sel = seleccionadosIds.includes(c.chatId);
                                            return (
                                                <div
                                                    key={c.chatId}
                                                    className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                                                        sel ? 'bg-indigo-50/70 border-indigo-400' : 'bg-white border-slate-200'
                                                    }`}
                                                >
                                                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={sel}
                                                            onChange={() => toggleDestinatario(c.chatId)}
                                                            className="w-4 h-4 rounded text-indigo-600"
                                                        />
                                                        <div className="truncate">
                                                            <div className="text-xs font-bold text-slate-900">
                                                                {c.nombreTelegram}{' '}
                                                                {c.username && <span className="text-slate-400 font-normal">@{c.username}</span>}
                                                                {c.pacienteInfo?.telefono && (
                                                                    <span className="text-emerald-700 font-semibold ml-1">
                                                                        • 📞 {c.pacienteInfo.telefono}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {c.pacienteInfo ? (
                                                                <div className="text-[11px] text-indigo-700 font-semibold truncate">
                                                                    {c.pacienteInfo.nombresPacientes.join(' • ')}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[10px] text-amber-600">
                                                                    Sin cédula asociada aún — asígnala a la derecha 👉
                                                                </div>
                                                            )}
                                                        </div>
                                                    </label>

                                                    <div className="flex items-center gap-1.5 flex-none">
                                                        <input
                                                            type="text"
                                                            placeholder="C.I. Representante"
                                                            defaultValue={c.cedula || ''}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val !== (c.cedula || '')) {
                                                                    handleAsociarCedulaContacto(c, val);
                                                                }
                                                            }}
                                                            className="w-28 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                                                            title="Escribe la cédula de la representante para vincularla a su expediente SAMÁN"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Pacientes en SAMÁN pendientes por abrir el Bot (con botón de copiar link directo por Cédula) */}
                                <div className="pt-2 border-t border-slate-100 space-y-2 max-h-48 overflow-y-auto pr-1">
                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        Pacientes Registrados en SAMÁN — Link de Vinculación Rápida ({pacientesSinVincularFiltrados.length})
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Comparte este enlace con la madre/representante o pídele que le escriba su número de cédula a <strong>@{botUsername}</strong>:
                                    </p>
                                    {pacientesSinVincularFiltrados.map((p) => {
                                        const digitosTel = p.telefono ? String(p.telefono).replace(/\D/g, '') : '';
                                        const numeroInternacional = digitosTel
                                            ? digitosTel.startsWith('0')
                                                ? '58' + digitosTel.slice(1)
                                                : digitosTel.startsWith('58')
                                                ? digitosTel
                                                : '58' + digitosTel
                                            : '';
                                        const mensajeInvitacionPlano = `¡Hola! 💛 Te escribimos de Cáritas Parroquial La Milagrosa (Programa SAMÁN). Toca este enlace y presiona "INICIAR" en Telegram para recibir los recordatorios de tu próxima jornada de monitoreo nutricional: ${p.linkVinculacion}`;
                                        const textoInvitacionWa = encodeURIComponent(mensajeInvitacionPlano);
                                        return (
                                            <div
                                                key={p.cedula}
                                                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs"
                                            >
                                                <div className="truncate flex-1 min-w-[180px]">
                                                    <span className="font-bold text-slate-800">C.I. {p.cedula}</span>{' '}
                                                    {p.telefono && (
                                                        <span className="text-emerald-700 font-extrabold">
                                                            (📞 {p.telefono})
                                                        </span>
                                                    )}{' '}
                                                    <span className="text-slate-600">— {p.nombresPacientes.join(', ')}</span>
                                                    {p.dadoDeAltaAutomatico && (
                                                        <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                                                            Dado de Alta
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 flex-none">
                                                    {numeroInternacional && (
                                                        <>
                                                            <a
                                                                href={`https://t.me/+${numeroInternacional}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={() => copiarTexto(mensajeInvitacionPlano, `tg-${p.cedula}`)}
                                                                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                                                                title="Copia automáticamente la invitación y abre el chat de Telegram de este número (+58...)"
                                                            >
                                                                <Send className="w-3 h-3" />
                                                                <span>
                                                                    {copiadoId === `tg-${p.cedula}`
                                                                        ? '¡Copiado! Abriendo Telegram...'
                                                                        : `Abrir su Telegram`}
                                                                </span>
                                                            </a>
                                                            <a
                                                                href={`https://wa.me/${numeroInternacional}?text=${textoInvitacionWa}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                                                                title="Enviar enlace de activación del Bot por WhatsApp al teléfono de la representante"
                                                            >
                                                                <span>📲 WhatsApp</span>
                                                            </a>
                                                        </>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => copiarTexto(p.linkVinculacion, `link-${p.cedula}`)}
                                                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 text-blue-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                                    >
                                                        {copiadoId === `link-${p.cedula}` ? (
                                                            <>
                                                                <Check className="w-3 h-3 text-emerald-600" />
                                                                <span>Copiado</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3 h-3" />
                                                                <span>Copiar Link Bot</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* COLUMNA DERECHA (5 COL): REDACTOR Y PLANTILLA DE RECORDATORIO (1 DÍA ANTES) */}
                    <div className="lg:col-span-5 bg-slate-50/90 p-4 rounded-3xl border border-slate-200/80 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-blue-600" />
                                    <span>Configurar Recordatorio (1 Día Antes)</span>
                                </span>
                            </div>

                            {/* Selector de Plantilla: Representantes/MEL vs Voluntarios */}
                            <div className="grid grid-cols-2 gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setTipoPlantilla('REPRESENTANTES')}
                                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        tipoPlantilla === 'REPRESENTANTES'
                                            ? 'bg-blue-600 text-white shadow-2xs'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    👶 Representantes y MEL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTipoPlantilla('VOLUNTARIOS')}
                                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        tipoPlantilla === 'VOLUNTARIOS'
                                            ? 'bg-blue-600 text-white shadow-2xs'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    🤝 Equipo Voluntarios
                                </button>
                            </div>

                            {/* Campos rápidos de Fecha, Hora y Lugar */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-blue-600" /> Fecha Próxima Jornada
                                    </label>
                                    <input
                                        type="date"
                                        value={fechaProxima}
                                        onChange={(e) => setFechaProxima(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-blue-600" /> Hora de Atención
                                    </label>
                                    <input
                                        type="text"
                                        value={horaProxima}
                                        onChange={(e) => setHoraProxima(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-blue-600" /> Lugar / Sitio de la Jornada
                                    </label>
                                    <input
                                        type="text"
                                        value={lugarProximo}
                                        onChange={(e) => setLugarProximo(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                                    />
                                </div>
                            </div>

                            {/* Vista previa y editor del mensaje */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    Mensaje a Enviar (Puedes editar el texto libremente):
                                </label>
                                <textarea
                                    rows={11}
                                    value={mensajeTexto}
                                    onChange={(e) => setMensajeTexto(e.target.value)}
                                    className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-xs text-slate-800 font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>

                        {/* Resultado de envío y Botón de Acción */}
                        <div className="space-y-2.5 pt-2">
                            {resultadoEnvio && (
                                <div
                                    className={`p-3 rounded-2xl text-xs font-bold border ${
                                        resultadoEnvio.ok
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                            : 'bg-red-50 border-red-200 text-red-700'
                                    }`}
                                >
                                    {resultadoEnvio.texto}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleEnviarTelegram}
                                disabled={enviando || seleccionadosIds.length === 0}
                                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white text-xs font-extrabold shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                <span>
                                    {enviando
                                        ? 'Enviando por Telegram...'
                                        : `Enviar Recordatorio a ${seleccionadosIds.length} Destinatario(s) / Grupo(s)`}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
