'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Baby,
    HeartPulse,
    CheckCircle2,
    AlertTriangle,
    AlertOctagon,
    ShieldAlert,
    Pill,
    Package,
    Download,
    Plus,
    Search,
    History,
    Calendar,
    MapPin,
    Trash2,
    Sparkles,
    ArrowUpRight,
    ArrowDownRight,
    UserCheck,
    ChevronDown,
    ChevronUp,
    Edit,
    X,
} from 'lucide-react';
import {
    crearJornadaSaman,
    buscarHistorialNinoPorCedula,
    buscarHistorialMelPorCedula,
    registrarSamanNino,
    actualizarSamanNino,
    registrarSamanEmbarazada,
    actualizarSamanEmbarazada,
    eliminarRegistroSamanNino,
    eliminarRegistroSamanEmbarazada,
    eliminarJornadaSaman,
} from '@/app/actions/saman';
import {
    calcularEdadMeses,
    formatearEdadLegible,
    calcularRangoEdad,
    clasificarPbNino,
    estimarZScorePesoTalla,
    clasificarZScoreNino,
    sugerirTratamientoNino,
    calcularImcMel,
    clasificarImcMel,
    clasificarPbMel,
} from '@/app/lib/saman-calculations';

interface SamanManagerProps {
    jornadas: any[];
    jornadaActiva: any;
    indicadores: {
        totalNinos: number;
        totalAdecuados: number;
        totalRN: number;
        totalDAM: number;
        totalDAS: number;
        totalMicronutrientes: number;
        totalPlumpyAmarillo: number;
        totalPlumpyRojo: number;
        totalPlumpyMum: number;
        totalMel: number;
        totalMelBajoPeso: number;
    };
}

export default function SamanManager({ jornadas, jornadaActiva, indicadores }: SamanManagerProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'ninos' | 'mel'>('ninos');
    const [showNewJornadaModal, setShowNewJornadaModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [mostrarIndicadoresMovil, setMostrarIndicadoresMovil] = useState(false);

    // Estado para crear nueva jornada con valores por defecto de la parroquia
    const [nuevaJornadaForm, setNuevaJornadaForm] = useState({
        fecha: new Date().toISOString().slice(0, 10),
        diocesis: jornadaActiva?.diocesis || 'MARACAY',
        estado: jornadaActiva?.estado || 'ARAGUA',
        municipio: jornadaActiva?.municipio || 'MBI',
        parroquiaCivil: jornadaActiva?.parroquiaCivil || 'EL LIMÓN',
        parroquiaEclesial: jornadaActiva?.parroquiaEclesial || 'LA MILAGROSA',
        centro: jornadaActiva?.centro || 'MARACAY - EL LIMÓN',
        comunidad: jornadaActiva?.comunidad || 'TEJERÍAS',
    });

    // ==========================================
    // ESTADO FORMULARIO 1: SAMÁN NIÑOS Y NIÑAS
    // ==========================================
    const [ninoForm, setNinoForm] = useState({
        cedulaRepresentante: '',
        edadRepresentante: 'Entre 18 - 49 años',
        parentesco: 'MADRE',
        grupoEtnico: 'Mestizo',
        nombres: '',
        apellidos: '',
        sexo: 'FEMENINO',
        fechaNacimiento: '',
        tipoIngreso: 'DIAGNOSTICO INICIAL',
        nroControl: 0,
        discapacidad: 'NO',
        detalleDiscapacidad: '',
        edema: 'NO',
        hemoglobina: '',
        posicionMedida: 'AUTO',
        longitudCabezaCm: '27.0',
        cBrazoCm: '',
        tallaCm: '',
        pesoKg: '',
        zScore: '',
        zScoreManual: false,
        desparasitado: 'NO',
        micronutrientes: true,
        cantMicronutrientes: 30,
        plumpyAmarillo: false,
        cantPlumpyAmarillo: 0,
        plumpyRojo: false,
        cantPlumpyRojo: 0,
        plumpyMum: false,
        cantPlumpyMum: 0,
        otrosComplementos: 'Ninguno',
        fechaInicioVivero: '',
        fechaSalidaVivero: '',
        zScoreEntrada: '',
        zScoreSalida: '',
        semanasVivero: '',
        situacionSalida: 'RECUPERADO',
        observaciones: '',
    });

    // Historial evolutivo encontrado para el representante
    const [historialNinos, setHistorialNinos] = useState<any[]>([]);
    const [ninoHistoricoSeleccionado, setNinoHistoricoSeleccionado] = useState<any | null>(null);
    const [buscandoHistorialNino, setBuscandoHistorialNino] = useState(false);
    const [editandoNinoId, setEditandoNinoId] = useState<number | null>(null);

    // ==========================================
    // ESTADO FORMULARIO 2: SAMÁN EMBARAZADAS/LACTANTES (MEL)
    // ==========================================
    const [melForm, setMelForm] = useState({
        cedula: '',
        nombre: '',
        apellido: '',
        fechaNacimiento: '',
        grupoEtnico: 'Mestizo',
        tipoIngreso: 'DIAGNOSTICO INICIAL',
        estadoEmbarazoLactancia: 'EMBARAZADA',
        semanaGestacion: '',
        edema: 'No',
        pesoKg: '',
        tallaCm: '',
        cBrazoCm: '',
        desparasitada: 'NO',
        tratamiento: 'Hierro+Ácido Fólico',
        cantidad: 30,
        plumpyMum: false,
        cantPlumpyMum: 0,
        micronutrientes: true,
        cantMicronutrientes: 30,
        observaciones: '',
    });

    const [historialMel, setHistorialMel] = useState<any | null>(null);
    const [buscandoHistorialMel, setBuscandoHistorialMel] = useState(false);
    const [editandoMelId, setEditandoMelId] = useState<number | null>(null);

    // Búsqueda automática en tiempo real de historial por Cédula (Niños)
    useEffect(() => {
        const cedula = ninoForm.cedulaRepresentante.replace(/\D/g, '').trim();
        if (cedula.length < 5) {
            setHistorialNinos([]);
            setNinoHistoricoSeleccionado(null);
            return;
        }

        const timer = setTimeout(async () => {
            setBuscandoHistorialNino(true);
            const res = await buscarHistorialNinoPorCedula(cedula);
            if (res.success && res.data && res.data.length > 0) {
                setHistorialNinos(res.data);
                setNinoHistoricoSeleccionado(res.data[0]);
            } else {
                setHistorialNinos([]);
                setNinoHistoricoSeleccionado(null);
            }
            setBuscandoHistorialNino(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [ninoForm.cedulaRepresentante]);

    // Búsqueda automática en tiempo real de historial por Cédula (MEL)
    useEffect(() => {
        const cedula = melForm.cedula.replace(/\D/g, '').trim();
        if (cedula.length < 5) {
            setHistorialMel(null);
            return;
        }

        const timer = setTimeout(async () => {
            setBuscandoHistorialMel(true);
            const res = await buscarHistorialMelPorCedula(cedula);
            if (res.success && res.data) {
                setHistorialMel(res.data);
            } else {
                setHistorialMel(null);
            }
            setBuscandoHistorialMel(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [melForm.cedula]);

    // Cálculos automáticos en tiempo real para Niños
    const edadMesesCalculada = ninoForm.fechaNacimiento
        ? calcularEdadMeses(ninoForm.fechaNacimiento, jornadaActiva?.fecha || new Date())
        : 0;
    const rangoEdadCalculado = calcularRangoEdad(edadMesesCalculada);
    const clasificacionPbNinoCalc = clasificarPbNino(Number(ninoForm.cBrazoCm));

    // Recalcular Z-Score y sugerencia de tratamiento cuando cambian peso, talla, sexo, fechaNacimiento o posicionMedida
    useEffect(() => {
        const peso = Number(ninoForm.pesoKg);
        const talla = Number(ninoForm.tallaCm);
        if (!ninoForm.zScoreManual && peso > 0 && talla >= 40 && ninoForm.fechaNacimiento) {
            const zEstimado = estimarZScorePesoTalla(
                peso,
                talla,
                ninoForm.sexo,
                ninoForm.fechaNacimiento,
                jornadaActiva?.fecha || new Date(),
                ninoForm.posicionMedida as any
            );
            const sugerencia = sugerirTratamientoNino(zEstimado, edadMesesCalculada);
            setNinoForm((prev) => ({
                ...prev,
                zScore: String(zEstimado),
                micronutrientes: sugerencia.micronutrientes,
                cantMicronutrientes: sugerencia.cantMicronutrientes,
                plumpyAmarillo: sugerencia.plumpyAmarillo,
                cantPlumpyAmarillo: sugerencia.cantPlumpyAmarillo,
                plumpyRojo: sugerencia.plumpyRojo,
                cantPlumpyRojo: sugerencia.cantPlumpyRojo,
            }));
        }
    }, [ninoForm.pesoKg, ninoForm.tallaCm, ninoForm.sexo, ninoForm.fechaNacimiento, ninoForm.posicionMedida, edadMesesCalculada, ninoForm.zScoreManual, jornadaActiva?.fecha]);

    const zScoreNum = ninoForm.zScore !== '' ? Number(ninoForm.zScore) : 0;
    const estadoNutricionalNinoCalc = clasificarZScoreNino(zScoreNum, edadMesesCalculada);

    // Cálculos automáticos en tiempo real para MEL
    const imcMelCalculado = calcularImcMel(Number(melForm.pesoKg), Number(melForm.tallaCm));
    const clasificacionImcMelCalc = clasificarImcMel(imcMelCalculado);
    const clasificacionPbMelCalc = clasificarPbMel(Number(melForm.cBrazoCm));
    const edadAniosMelCalculada = melForm.fechaNacimiento
        ? Number((calcularEdadMeses(melForm.fechaNacimiento, jornadaActiva?.fecha || new Date()) / 12).toFixed(1))
        : 0;

    // Función para autocompletar datos del niño desde su historial
    const cargarDatosNinoHistorico = (hist: any) => {
        setNinoHistoricoSeleccionado(hist);
        const fechaNacStr = hist.fechaNacimiento
            ? new Date(hist.fechaNacimiento).toISOString().slice(0, 10)
            : '';

        // Determinación inteligente según las 4 premisas de Cáritas:
        // 1. Diagnóstico Inicial -> Control 0
        // 2. Monitoreo regular -> Control + 1
        // 3. Salida de Vivero (recuperado) -> Control 0
        // 4. Reingreso (tras salida o inasistencia) -> Control 0 (o nro de reingresos)
        const tipoSugerido = hist.sugeridoTipo || 'MONITOREO';
        const controlSugerido = hist.sugeridoControl ?? ((Number(hist.nroControlPrevio) || 0) + 1);

        // Pre-calcular datos de Vivero si sugiere o aplica Salida de Vivero
        const fechaIniStr = hist.fechaInicioVivero
            ? new Date(hist.fechaInicioVivero).toISOString().slice(0, 10)
            : '';
        const fechaSalStr = jornadaActiva?.fecha
            ? new Date(jornadaActiva.fecha).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);

        let semCalc = 8;
        if (fechaIniStr && fechaSalStr) {
            const diffDays = Math.round(
                Math.abs(new Date(fechaSalStr).getTime() - new Date(fechaIniStr).getTime()) / (1000 * 60 * 60 * 24)
            );
            semCalc = Math.min(12, Math.max(1, Math.round(diffDays / 7)));
        }

        setNinoForm((prev) => ({
            ...prev,
            edadRepresentante: hist.edadRepresentante || prev.edadRepresentante,
            parentesco: hist.parentesco || prev.parentesco,
            grupoEtnico: hist.grupoEtnico || prev.grupoEtnico,
            nombres: hist.nombres || '',
            apellidos: hist.apellidos || '',
            sexo: hist.sexo || 'FEMENINO',
            fechaNacimiento: fechaNacStr,
            tipoIngreso: tipoSugerido,
            nroControl: controlSugerido,
            discapacidad: hist.discapacidad || 'NO',
            detalleDiscapacidad: hist.detalleDiscapacidad || '',
            fechaInicioVivero: fechaIniStr,
            fechaSalidaVivero: fechaSalStr,
            zScoreEntrada: hist.zScoreEntrada !== null && hist.zScoreEntrada !== undefined ? String(hist.zScoreEntrada) : '',
            zScoreSalida: prev.zScore || '',
            semanasVivero: String(semCalc),
            situacionSalida: 'RECUPERADO',
        }));
    };

    // Función para autocompletar datos de la madre/embarazada desde su historial
    const cargarDatosMelHistorico = (hist: any) => {
        const fechaNacStr = hist.fechaNacimiento
            ? new Date(hist.fechaNacimiento).toISOString().slice(0, 10)
            : '';
        setMelForm((prev) => ({
            ...prev,
            nombre: hist.nombre || '',
            apellido: hist.apellido || '',
            fechaNacimiento: fechaNacStr,
            grupoEtnico: hist.grupoEtnico || 'Mestizo',
            tipoIngreso: 'MONITOREO',
            estadoEmbarazoLactancia: hist.estadoEmbarazoLactancia || 'EMBARAZADA',
            semanaGestacion: hist.semanaGestacion ? String(hist.semanaGestacion + 4) : '',
            tallaCm: hist.tallaCm ? String(hist.tallaCm) : prev.tallaCm,
        }));
    };

    // Funciones de Edición de Registros Existentes - SAMÁN Niños
    const iniciarEdicionNino = (n: any) => {
        setEditandoNinoId(n.id);
        const fechaNacStr = n.fechaNacimiento
            ? new Date(n.fechaNacimiento).toISOString().slice(0, 10)
            : '';
        const iniVivStr = n.fechaInicioVivero
            ? new Date(n.fechaInicioVivero).toISOString().slice(0, 10)
            : '';
        const salVivStr = n.fechaSalidaVivero
            ? new Date(n.fechaSalidaVivero).toISOString().slice(0, 10)
            : '';

        setNinoForm({
            cedulaRepresentante: n.cedulaRepresentante || '',
            edadRepresentante: n.edadRepresentante || 'Entre 18 - 49 años',
            parentesco: n.parentesco || 'MADRE',
            grupoEtnico: n.grupoEtnico || 'Mestizo',
            nombres: n.nombres || '',
            apellidos: n.apellidos || '',
            sexo: n.sexo || 'FEMENINO',
            fechaNacimiento: fechaNacStr,
            tipoIngreso: n.tipoIngreso || 'DIAGNOSTICO INICIAL',
            nroControl: Number(n.nroControl) || 0,
            discapacidad: n.discapacidad || 'NO',
            detalleDiscapacidad: n.detalleDiscapacidad || '',
            edema: n.edema || 'NO',
            hemoglobina: n.hemoglobina ? String(n.hemoglobina) : '',
            posicionMedida: n.posicionMedida || 'AUTO',
            longitudCabezaCm: n.longitudCabezaCm ? String(n.longitudCabezaCm) : '27.0',
            cBrazoCm: n.cBrazoCm ? String(n.cBrazoCm) : '',
            tallaCm: n.tallaCm ? String(n.tallaCm) : '',
            pesoKg: n.pesoKg ? String(n.pesoKg) : '',
            zScore: n.zScore !== undefined && n.zScore !== null ? String(n.zScore) : '',
            zScoreManual: true,
            desparasitado: n.desparasitado || 'NO',
            micronutrientes: Boolean(n.micronutrientes),
            cantMicronutrientes: n.cantMicronutrientes || 30,
            plumpyAmarillo: Boolean(n.plumpyAmarillo),
            cantPlumpyAmarillo: n.cantPlumpyAmarillo || 0,
            plumpyRojo: Boolean(n.plumpyRojo),
            cantPlumpyRojo: n.cantPlumpyRojo || 0,
            plumpyMum: Boolean(n.plumpyMum),
            cantPlumpyMum: n.cantPlumpyMum || 0,
            otrosComplementos: n.otrosComplementos || 'Ninguno',
            fechaInicioVivero: iniVivStr,
            fechaSalidaVivero: salVivStr,
            zScoreEntrada: n.zScoreEntrada !== null && n.zScoreEntrada !== undefined ? String(n.zScoreEntrada) : '',
            zScoreSalida: n.zScoreSalida !== null && n.zScoreSalida !== undefined ? String(n.zScoreSalida) : '',
            semanasVivero: n.semanasVivero !== null && n.semanasVivero !== undefined ? String(n.semanasVivero) : '',
            situacionSalida: n.situacionSalida || 'RECUPERADO',
            observaciones: n.observaciones || '',
        });

        // Desplazarse suavemente al formulario
        setTimeout(() => {
            const el = document.getElementById('form-saman-ninos');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    };

    const cancelarEdicionNino = () => {
        setEditandoNinoId(null);
        setNinoForm({
            cedulaRepresentante: '',
            edadRepresentante: 'Entre 18 - 49 años',
            parentesco: 'MADRE',
            grupoEtnico: 'Mestizo',
            nombres: '',
            apellidos: '',
            sexo: 'FEMENINO',
            fechaNacimiento: '',
            tipoIngreso: 'DIAGNOSTICO INICIAL',
            nroControl: 0,
            discapacidad: 'NO',
            detalleDiscapacidad: '',
            edema: 'NO',
            hemoglobina: '',
            posicionMedida: 'AUTO',
            longitudCabezaCm: '27.0',
            cBrazoCm: '',
            tallaCm: '',
            pesoKg: '',
            zScore: '',
            zScoreManual: false,
            desparasitado: 'NO',
            micronutrientes: true,
            cantMicronutrientes: 30,
            plumpyAmarillo: false,
            cantPlumpyAmarillo: 0,
            plumpyRojo: false,
            cantPlumpyRojo: 0,
            plumpyMum: false,
            cantPlumpyMum: 0,
            otrosComplementos: 'Ninguno',
            fechaInicioVivero: '',
            fechaSalidaVivero: '',
            zScoreEntrada: '',
            zScoreSalida: '',
            semanasVivero: '',
            situacionSalida: 'RECUPERADO',
            observaciones: '',
        });
        setHistorialNinos([]);
        setNinoHistoricoSeleccionado(null);
    };

    // Funciones de Edición de Registros Existentes - SAMÁN MEL
    const iniciarEdicionMel = (m: any) => {
        setEditandoMelId(m.id);
        const fechaNacStr = m.fechaNacimiento
            ? new Date(m.fechaNacimiento).toISOString().slice(0, 10)
            : '';
        setMelForm({
            cedula: m.cedula || '',
            nombre: m.nombre || '',
            apellido: m.apellido || '',
            fechaNacimiento: fechaNacStr,
            grupoEtnico: m.grupoEtnico || 'Mestizo',
            tipoIngreso: m.tipoIngreso || 'DIAGNOSTICO INICIAL',
            estadoEmbarazoLactancia: m.estadoEmbarazoLactancia || 'EMBARAZADA',
            semanaGestacion: m.semanaGestacion ? String(m.semanaGestacion) : '',
            edema: m.edema || 'No',
            pesoKg: m.pesoKg ? String(m.pesoKg) : '',
            tallaCm: m.tallaCm ? String(m.tallaCm) : '',
            cBrazoCm: m.cBrazoCm ? String(m.cBrazoCm) : '',
            desparasitada: m.desparasitada || 'NO',
            tratamiento: m.tratamiento === 'Plumpy Mom' ? 'Plumpy Mum' : (m.tratamiento || 'Hierro+Ácido Fólico'),
            cantidad: Number(m.cantidad) || 30,
            plumpyMum: Boolean(m.plumpyMum) || String(m.tratamiento).toLowerCase().includes('plumpy'),
            cantPlumpyMum: m.cantPlumpyMum || 0,
            micronutrientes: Boolean(m.micronutrientes),
            cantMicronutrientes: m.cantMicronutrientes || 30,
            observaciones: m.observaciones || '',
        });

        setTimeout(() => {
            const el = document.getElementById('form-saman-mel');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    };

    const cancelarEdicionMel = () => {
        setEditandoMelId(null);
        setMelForm({
            cedula: '',
            nombre: '',
            apellido: '',
            fechaNacimiento: '',
            grupoEtnico: 'Mestizo',
            tipoIngreso: 'DIAGNOSTICO INICIAL',
            estadoEmbarazoLactancia: 'EMBARAZADA',
            semanaGestacion: '',
            edema: 'No',
            pesoKg: '',
            tallaCm: '',
            cBrazoCm: '',
            desparasitada: 'NO',
            tratamiento: 'Hierro+Ácido Fólico',
            cantidad: 30,
            plumpyMum: false,
            cantPlumpyMum: 0,
            micronutrientes: true,
            cantMicronutrientes: 30,
            observaciones: '',
        });
        setHistorialMel(null);
    };

    // Guardar nueva jornada SAMÁN
    const handleCrearJornada = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await crearJornadaSaman(nuevaJornadaForm);
            if (res.success && res.data) {
                setShowNewJornadaModal(false);
                window.location.href = `/dashboard/saman?jornadaId=${res.data.id}`;
            } else {
                alert(res.error || 'Error al crear la jornada');
                setIsSubmitting(false);
            }
        } catch (err: any) {
            console.error('Error al crear jornada:', err);
            alert('Error de conexión o en el servidor al crear la jornada');
            setIsSubmitting(false);
        }
    };

    // Guardar o Actualizar evaluación de Niño/a
    const handleGuardarNino = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ninoForm.cedulaRepresentante || !ninoForm.nombres || !ninoForm.apellidos || !ninoForm.fechaNacimiento) {
            alert('Por favor completa los datos del representante y del niño/a.');
            return;
        }
        setIsSubmitting(true);
        try {
            if (editandoNinoId) {
                const res = await actualizarSamanNino(editandoNinoId, {
                    ...ninoForm,
                    estadoNutricional: estadoNutricionalNinoCalc,
                });
                if (res.success) {
                    cancelarEdicionNino();
                    router.refresh();
                } else {
                    alert(res.error || 'Error al actualizar el registro');
                }
            } else {
                const res = await registrarSamanNino({
                    ...ninoForm,
                    jornadaId: jornadaActiva.id,
                    estadoNutricional: estadoNutricionalNinoCalc,
                });

                if (res.success) {
                    cancelarEdicionNino();
                    router.refresh();
                } else {
                    alert(res.error || 'Error al guardar');
                }
            }
        } catch (err: any) {
            console.error('Error al guardar/actualizar niño:', err);
            alert('Error de conexión o en el servidor al procesar el registro');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Guardar o Actualizar evaluación MEL
    const handleGuardarMel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!melForm.cedula || !melForm.nombre || !melForm.apellido || !melForm.fechaNacimiento) {
            alert('Por favor completa los datos de identificación de la paciente.');
            return;
        }
        setIsSubmitting(true);
        try {
            if (editandoMelId) {
                const res = await actualizarSamanEmbarazada(editandoMelId, {
                    ...melForm,
                    clasificacionNutricional: clasificacionImcMelCalc,
                    clasificacionPb: clasificacionPbMelCalc,
                });
                if (res.success) {
                    cancelarEdicionMel();
                    router.refresh();
                } else {
                    alert(res.error || 'Error al actualizar el registro MEL');
                }
            } else {
                const res = await registrarSamanEmbarazada({
                    ...melForm,
                    jornadaId: jornadaActiva.id,
                    clasificacionNutricional: clasificacionImcMelCalc,
                    clasificacionPb: clasificacionPbMelCalc,
                });

                if (res.success) {
                    cancelarEdicionMel();
                    router.refresh();
                } else {
                    alert(res.error || 'Error al guardar');
                }
            }
        } catch (err: any) {
            console.error('Error al guardar/actualizar MEL:', err);
            alert('Error de conexión o en el servidor al procesar el registro');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Colores de insignia según estado nutricional
    const obtenerEstiloEstado = (estado: string) => {
        const lower = (estado || '').toLowerCase();
        if (lower.includes('severa')) {
            return 'bg-red-100 text-red-700 border-red-200';
        }
        if (lower.includes('moderada') || lower.includes('bajo')) {
            return 'bg-orange-100 text-orange-700 border-orange-200';
        }
        if (lower.includes('riesgo')) {
            return 'bg-amber-100 text-amber-700 border-amber-200';
        }
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    };

    const ninosFiltrados = (jornadaActiva?.ninos || []).filter((n: any) => {
        const q = searchTerm.toLowerCase();
        return (
            n.nombres.toLowerCase().includes(q) ||
            n.apellidos.toLowerCase().includes(q) ||
            n.cedulaRepresentante.includes(q)
        );
    });

    const melFiltradas = (jornadaActiva?.embarazadas || []).filter((m: any) => {
        const q = searchTerm.toLowerCase();
        return (
            m.nombre.toLowerCase().includes(q) ||
            m.apellido.toLowerCase().includes(q) ||
            m.cedula.includes(q)
        );
    });

    // Configuración de las 11 tarjetas de indicadores institucionales
    const tarjetasIndicadores = [
        {
            id: 1,
            titulo: 'Total NN Atendidos',
            subtitulo: 'Niños y Niñas evaluados',
            valor: indicadores.totalNinos,
            icono: Baby,
            bg: 'bg-blue-50',
            text: 'text-blue-600',
            border: 'border-blue-100',
            tag: '1. NN',
        },
        {
            id: 2,
            titulo: 'Niños Adecuados',
            subtitulo: 'Z-Score ≥ -0,99',
            valor: indicadores.totalAdecuados,
            icono: CheckCircle2,
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
            border: 'border-emerald-100',
            tag: '2. Normal',
        },
        {
            id: 3,
            titulo: 'Riesgo Nutricional (RN)',
            subtitulo: 'Z-Score -1 a -2 (< 2 años)',
            valor: indicadores.totalRN,
            icono: AlertTriangle,
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            border: 'border-amber-100',
            tag: '3. Alerta RN',
        },
        {
            id: 4,
            titulo: 'Niños DAM',
            subtitulo: 'Desnutrición Aguda Moderada',
            valor: indicadores.totalDAM,
            icono: AlertOctagon,
            bg: 'bg-orange-50',
            text: 'text-orange-600',
            border: 'border-orange-100',
            tag: '4. DAM (-2,01 a -3)',
        },
        {
            id: 5,
            titulo: 'Niños DAS',
            subtitulo: 'Desnutrición Aguda Severa',
            valor: indicadores.totalDAS,
            icono: ShieldAlert,
            bg: 'bg-red-50',
            text: 'text-red-600',
            border: 'border-red-100',
            tag: '5. DAS (≤ -3,01)',
        },
        {
            id: 6,
            titulo: 'Micronutrientes',
            subtitulo: 'Sobres / unidades entregadas',
            valor: indicadores.totalMicronutrientes,
            icono: Pill,
            bg: 'bg-teal-50',
            text: 'text-teal-600',
            border: 'border-teal-100',
            tag: '6. Vitaminas',
        },
        {
            id: 7,
            titulo: 'Plumpy Amarillo',
            subtitulo: 'Plumpy DOZ (6-23 meses)',
            valor: indicadores.totalPlumpyAmarillo,
            icono: Package,
            bg: 'bg-yellow-50',
            text: 'text-yellow-600',
            border: 'border-yellow-100',
            tag: '7. LNS-MQ',
        },
        {
            id: 8,
            titulo: 'Plumpy Rojo',
            subtitulo: 'Plumpy NUT (DAM / DAS)',
            valor: indicadores.totalPlumpyRojo,
            icono: Package,
            bg: 'bg-rose-50',
            text: 'text-rose-600',
            border: 'border-rose-100',
            tag: '8. RUTF',
        },
        {
            id: 9,
            titulo: 'Plumpy Mum',
            subtitulo: 'Suplemento para MEL',
            valor: indicadores.totalPlumpyMum,
            icono: Sparkles,
            bg: 'bg-purple-50',
            text: 'text-purple-600',
            border: 'border-purple-100',
            tag: '9. Plumpy Mum',
        },
        {
            id: 10,
            titulo: 'Total MEL Atendidas',
            subtitulo: 'Embarazadas y Lactantes',
            valor: indicadores.totalMel,
            icono: HeartPulse,
            bg: 'bg-pink-50',
            text: 'text-pink-600',
            border: 'border-pink-100',
            tag: '10. MEL',
        },
        {
            id: 11,
            titulo: 'MEL Bajo Peso',
            subtitulo: 'PB ≤ 22,1 cm o IMC < 18,5',
            valor: indicadores.totalMelBajoPeso,
            icono: AlertTriangle,
            bg: 'bg-red-50',
            text: 'text-red-600',
            border: 'border-red-100',
            tag: '11. Déficit MEL',
        },
    ];

    return (
        <div className="space-y-6 pb-16">
            {/* 1. CABECERA INSTITUCIONAL Y SELECTOR DE JORNADA */}
            <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-xs">
                            🌱
                        </span>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                Programa Nutricional SAMÁN
                            </h1>
                            <p className="text-xs md:text-sm text-slate-500 font-medium">
                                Sistema de Alerta, Monitoreo y Atención en Nutrición (Niños/as y MEL)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Selector de Jornada */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <select
                            value={jornadaActiva?.id || ''}
                            onChange={(e) => {
                                window.location.href = `/dashboard/saman?jornadaId=${e.target.value}`;
                            }}
                            className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
                        >
                            {jornadas.map((j: any) => (
                                <option key={j.id} value={j.id}>
                                    {new Date(j.fecha).toLocaleDateString('es-VE', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                    })}{' '}
                                    — {j.comunidad} ({j._count?.ninos || 0} NN / {j._count?.embarazadas || 0} MEL)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Botón Eliminar Jornada Vacía (solo si no tiene pacientes registrados) */}
                    {(jornadaActiva?.ninos?.length || 0) === 0 && (jornadaActiva?.embarazadas?.length || 0) === 0 && (
                        <button
                            type="button"
                            onClick={async () => {
                                if (confirm(`¿Eliminar la jornada vacía "${jornadaActiva?.comunidad}"?`)) {
                                    await eliminarJornadaSaman(jornadaActiva.id);
                                    window.location.href = '/dashboard/saman';
                                }
                            }}
                            className="p-2.5 text-slate-400 hover:text-red-600 rounded-2xl border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer"
                            title="Eliminar esta jornada vacía"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}

                    {/* Botón Nueva Jornada */}
                    <button
                        type="button"
                        onClick={() => setShowNewJornadaModal(true)}
                        className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-md shadow-slate-900/15 hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nueva Jornada</span>
                    </button>

                    {/* Botón Exportar al Excel Oficial de Cáritas */}
                    <a
                        href={`/api/saman/export?jornadaId=${jornadaActiva?.id}`}
                        className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        <span>Exportar Excel Oficial (.xlsx)</span>
                    </a>
                </div>
            </div>

            {/* BARRA INFORMATIVA DE DATOS FIJOS DE LA JORNADA ACTIVA */}
            <div className="bg-white rounded-2xl px-5 py-3.5 shadow-xs border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <MapPin className="w-4 h-4 text-primary" />
                        Diócesis: <strong className="text-primary">{jornadaActiva?.diocesis}</strong>
                    </span>
                    <span>•</span>
                    <span>
                        Estado/Mun: <strong>{jornadaActiva?.estado} / {jornadaActiva?.municipio}</strong>
                    </span>
                    <span>•</span>
                    <span>
                        Parroquia Civil: <strong>{jornadaActiva?.parroquiaCivil}</strong>
                    </span>
                    <span>•</span>
                    <span>
                        Parroquia Eclesial: <strong className="text-secondary">{jornadaActiva?.parroquiaEclesial}</strong>
                    </span>
                    <span>•</span>
                    <span>
                        Sector/Comunidad: <strong className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-200">{jornadaActiva?.comunidad}</strong>
                    </span>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Jornada Activa • {new Date(jornadaActiva?.fecha).toLocaleDateString('es-VE')}
                </span>
            </div>

            {/* 2. DASHBOARD DE 11 INDICADORES INSTITUCIONALES EN VIVO */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                            📊 Estadísticas en Vivo (11 Indicadores)
                        </h2>
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Tiempo real
                        </span>
                    </div>

                    {/* Botón para alternar visibilidad en móviles/tablets para no saturar la pantalla de campo */}
                    <button
                        type="button"
                        onClick={() => setMostrarIndicadoresMovil(!mostrarIndicadoresMovil)}
                        className="md:hidden flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                        <span>{mostrarIndicadoresMovil ? 'Ocultar Resumen' : 'Ver 11 Indicadores'}</span>
                        {mostrarIndicadoresMovil ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                </div>
                <div className={`${mostrarIndicadoresMovil ? 'grid' : 'hidden md:grid'} grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 transition-all`}>
                    {tarjetasIndicadores.map((card) => {
                        const Icon = card.icono;
                        return (
                            <div
                                key={card.id}
                                className={`bg-white p-4 rounded-2xl shadow-xs border ${card.border} flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all`}
                            >
                                <div className="flex items-start justify-between gap-2 relative z-10">
                                    <div className={`w-10 h-10 rounded-xl ${card.bg} ${card.text} flex items-center justify-center flex-none`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-100">
                                        {card.tag}
                                    </span>
                                </div>
                                <div className="mt-3 relative z-10">
                                    <div className="text-2xl md:text-3xl font-bold text-slate-800 leading-none">
                                        {card.valor}
                                    </div>
                                    <p className="text-xs font-bold text-slate-700 mt-1.5 leading-snug">
                                        {card.titulo}
                                    </p>
                                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                        {card.subtitulo}
                                    </p>
                                </div>
                                <Icon className={`absolute -bottom-3 -right-3 w-16 h-16 ${card.text} opacity-5 -rotate-12`} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. PESTAÑAS DE NAVEGACIÓN: SAMÁN NIÑOS vs SAMÁN MEL */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => setActiveTab('ninos')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                            activeTab === 'ninos'
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <span>👶</span>
                        <span>1. SAMÁN Niños/as (NN)</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'ninos' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                            {jornadaActiva?.ninos?.length || 0}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('mel')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                            activeTab === 'mel'
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <span>🤰</span>
                        <span>2. SAMÁN Embarazadas / Lactantes (MEL)</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'mel' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                            {jornadaActiva?.embarazadas?.length || 0}
                        </span>
                    </button>
                </div>

                {/* Buscador rápido en la tabla inferior */}
                <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre o cédula..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
            </div>

            {/* ===================================================================== */}
            {/* CONTENIDO PESTAÑA 1: SAMÁN NIÑOS Y NIÑAS                              */}
            {/* ===================================================================== */}
            {activeTab === 'ninos' && (
                <div className="space-y-6">
                    {/* FORMULARIO DE CAPTURA RÁPIDA EN CAMPO - NIÑOS */}
                    <form id="form-saman-ninos" onSubmit={handleGuardarNino} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
                        {/* BANNER INDICADOR DE MODO EDICIÓN */}
                        {editandoNinoId !== null && (
                            <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 animate-in fade-in duration-200 shadow-xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-none shadow-xs">
                                        <Edit className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold">
                                            Modo Edición Activo: Modificando evaluación de {ninoForm.nombres} {ninoForm.apellidos}
                                        </h4>
                                        <p className="text-xs text-amber-800">
                                            Modifique los campos deseados y presione &quot;Guardar Cambios&quot; para actualizar el registro en la jornada.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={cancelarEdicionNino}
                                    className="px-3.5 py-2 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                    <X className="w-4 h-4 text-slate-500" />
                                    <span>Cancelar Edición</span>
                                </button>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <span>📝</span> Captura Antropométrica en Campo — Niños y Niñas (0 a 59 meses)
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Ingresa la cédula de la madre o representante para consultar el historial evolutivo del niño/a automáticamente.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 font-semibold">
                                    Edad calculada: <strong>{formatearEdadLegible(edadMesesCalculada)}</strong> ({rangoEdadCalculado})
                                </span>
                            </div>
                        </div>

                        {/* TARJETA DE HISTORIAL EVOLUTIVO DEL PACIENTE (SI SE ENCUENTRA POR CÉDULA) */}
                        {buscandoHistorialNino && (
                            <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-700 flex items-center gap-2">
                                <History className="w-4 h-4 animate-spin" />
                                <span>Buscando historial evolutivo para la cédula {ninoForm.cedulaRepresentante}...</span>
                            </div>
                        )}

                        {historialNinos.length > 0 && ninoHistoricoSeleccionado && (
                            <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-emerald-50/70 rounded-2xl p-4 border border-blue-200/80 shadow-xs space-y-3 animate-in fade-in duration-200">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center">
                                            <History className="w-4 h-4" />
                                        </span>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900">
                                                Historial Evolutivo Encontrado — C.I. Representante: {ninoHistoricoSeleccionado.cedulaRepresentante}
                                            </h4>
                                            <p className="text-xs text-slate-600">
                                                Última medición registrada el{' '}
                                                <strong>
                                                    {new Date(ninoHistoricoSeleccionado.ultimaFechaMedicion).toLocaleDateString('es-VE', {
                                                        day: '2-digit',
                                                        month: 'long',
                                                        year: 'numeric',
                                                    })}
                                                </strong>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {historialNinos.length > 1 && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-black text-amber-900 bg-amber-200/90 px-2 py-1 rounded-lg animate-pulse">
                                                    👉 Selecciona niño/a:
                                                </span>
                                                <select
                                                    value={ninoHistoricoSeleccionado.id}
                                                    onChange={(e) => {
                                                        const found = historialNinos.find((h) => h.id === Number(e.target.value));
                                                        if (found) cargarDatosNinoHistorico(found);
                                                    }}
                                                    className="bg-amber-100 border-2 border-amber-500 rounded-xl px-3 py-1.5 text-xs font-black text-slate-900 ring-4 ring-amber-400/70 animate-pulse shadow-md"
                                                >
                                                    {historialNinos.map((h) => (
                                                        <option key={h.id} value={h.id}>
                                                            Niño/a: {h.nombres} {h.apellidos}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => cargarDatosNinoHistorico(ninoHistoricoSeleccionado)}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                                historialNinos.length === 1
                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-4 ring-emerald-400/80 animate-pulse shadow-lg shadow-emerald-600/30 scale-105'
                                                    : 'bg-primary text-white hover:bg-primary/90 shadow-xs'
                                            }`}
                                        >
                                            <UserCheck className="w-3.5 h-3.5" />
                                            <span>
                                                {historialNinos.length === 1 ? '👉 Autocompletar datos de ' : 'Autocompletar datos de '}
                                                {ninoHistoricoSeleccionado.nombres}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* 6 Datos Históricos Clave + Comparación en Vivo */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                                    <div className="bg-white/90 p-3 rounded-xl border border-white shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Paciente / Últ. Fecha</span>
                                        <span className="text-xs font-bold text-slate-800 truncate block">
                                            {ninoHistoricoSeleccionado.nombres} {ninoHistoricoSeleccionado.apellidos}
                                        </span>
                                        <span className="text-[11px] text-primary font-semibold">
                                            📅 {new Date(ninoHistoricoSeleccionado.ultimaFechaMedicion).toLocaleDateString('es-VE')}
                                        </span>
                                    </div>

                                    <div className="bg-white/90 p-3 rounded-xl border border-white shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">C. Brazo Anterior</span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-base font-bold text-slate-900">{ninoHistoricoSeleccionado.cBrazoCm} cm</span>
                                            {ninoForm.cBrazoCm && (
                                                <span className={`text-xs font-bold flex items-center ${Number(ninoForm.cBrazoCm) >= ninoHistoricoSeleccionado.cBrazoCm ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {Number(ninoForm.cBrazoCm) >= ninoHistoricoSeleccionado.cBrazoCm ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                    {(Number(ninoForm.cBrazoCm) - ninoHistoricoSeleccionado.cBrazoCm).toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-500">{ninoHistoricoSeleccionado.clasificacionPb}</span>
                                    </div>

                                    <div className="bg-white/90 p-3 rounded-xl border border-white shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Talla Anterior</span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-base font-bold text-slate-900">{ninoHistoricoSeleccionado.tallaCm} cm</span>
                                            {ninoForm.tallaCm && (
                                                <span className={`text-xs font-bold flex items-center ${Number(ninoForm.tallaCm) >= ninoHistoricoSeleccionado.tallaCm ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {(Number(ninoForm.tallaCm) - ninoHistoricoSeleccionado.tallaCm) >= 0 ? '+' : ''}
                                                    {(Number(ninoForm.tallaCm) - ninoHistoricoSeleccionado.tallaCm).toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-500">Estatura previa</span>
                                    </div>

                                    <div className="bg-white/90 p-3 rounded-xl border border-white shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Peso Anterior</span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-base font-bold text-slate-900">{ninoHistoricoSeleccionado.pesoKg} kg</span>
                                            {ninoForm.pesoKg && (
                                                <span className={`text-xs font-bold flex items-center ${Number(ninoForm.pesoKg) >= ninoHistoricoSeleccionado.pesoKg ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {(Number(ninoForm.pesoKg) - ninoHistoricoSeleccionado.pesoKg) >= 0 ? '+' : ''}
                                                    {(Number(ninoForm.pesoKg) - ninoHistoricoSeleccionado.pesoKg).toFixed(2)} kg
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-500">Comparativa de peso</span>
                                    </div>

                                    <div className="bg-white/90 p-3 rounded-xl border border-white shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Z-Score Anterior</span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-base font-bold text-slate-900">{ninoHistoricoSeleccionado.zScore}</span>
                                            {ninoForm.zScore !== '' && (
                                                <span className={`text-xs font-bold ${Number(ninoForm.zScore) >= ninoHistoricoSeleccionado.zScore ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    ({(Number(ninoForm.zScore) - ninoHistoricoSeleccionado.zScore) >= 0 ? '+' : ''}
                                                    {(Number(ninoForm.zScore) - ninoHistoricoSeleccionado.zScore).toFixed(2)})
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-500">Desviación estándar</span>
                                    </div>

                                    <div className="bg-white/90 p-3 rounded-xl border border-white shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Estado Nutricional Previo</span>
                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-xs font-bold border ${obtenerEstiloEstado(ninoHistoricoSeleccionado.estadoNutricional)}`}>
                                            {ninoHistoricoSeleccionado.estadoNutricional}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BLOQUE 1: DATOS DEL CUIDADOR Y DEL NIÑO */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">1</span>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Identificación del Representante y del Niño/a (Completar en este orden)
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-start">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                        <span>Cédula Madre / Representante *</span>
                                        {!ninoForm.cedulaRepresentante.trim() && (
                                            <span className="text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full animate-pulse">
                                                👉 1. Iniciar aquí
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        required
                                        placeholder="Ej: 19530148 (solo números)"
                                        value={ninoForm.cedulaRepresentante}
                                        onChange={(e) => setNinoForm({ ...ninoForm, cedulaRepresentante: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none transition-all ${
                                            !ninoForm.cedulaRepresentante.trim()
                                                ? 'border-amber-400 ring-4 ring-amber-300/60 bg-amber-50/50 text-slate-900 animate-pulse'
                                                : 'border-slate-200 bg-slate-50/50 text-slate-800 focus:ring-2 focus:ring-primary/20'
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Grupo Étnico</label>
                                    <select
                                        value={ninoForm.grupoEtnico}
                                        onChange={(e) => setNinoForm({ ...ninoForm, grupoEtnico: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold text-slate-800"
                                    >
                                        <option value="Mestizo">Mestizo (Mayoría)</option>
                                        <option value="Indígena">Indígena</option>
                                        <option value="Afrodescendiente">Afrodescendiente</option>
                                        <option value="SD">SD (Sin Determinar)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Parentesco</label>
                                    <select
                                        value={ninoForm.parentesco}
                                        onChange={(e) => setNinoForm({ ...ninoForm, parentesco: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                                    >
                                        <option value="MADRE">MADRE</option>
                                        <option value="PADRE">PADRE</option>
                                        <option value="ABUELA">ABUELA</option>
                                        <option value="ABUELO">ABUELO</option>
                                        <option value="TIA">TIA</option>
                                        <option value="TIO">TIO</option>
                                        <option value="HERMANA">HERMANA</option>
                                        <option value="HERMANO">HERMANO</option>
                                        <option value="OTRO">OTRO</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Edad Representante</label>
                                    <select
                                        value={ninoForm.edadRepresentante}
                                        onChange={(e) => setNinoForm({ ...ninoForm, edadRepresentante: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                                    >
                                        <option value="Menos de 17 años">Menos de 17 años</option>
                                        <option value="Entre 18 - 49 años">Entre 18 - 49 años</option>
                                        <option value="Entre 50 - 65 años">Entre 50 - 65 años</option>
                                        <option value="Mas de 65 años">Más de 65 años</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Ingreso</label>
                                    <select
                                        value={ninoForm.tipoIngreso}
                                        onChange={(e) => {
                                            const nuevoTipo = e.target.value;
                                            let nuevoControl = ninoForm.nroControl;
                                            let nuevoInicioVivero = ninoForm.fechaInicioVivero;
                                            let nuevoSalidaVivero = ninoForm.fechaSalidaVivero;
                                            let nuevoZEntrada = ninoForm.zScoreEntrada;
                                            let nuevoZSalida = ninoForm.zScoreSalida;
                                            let nuevoSemanas = ninoForm.semanasVivero;
                                            let nuevaSituacion = ninoForm.situacionSalida || 'RECUPERADO';

                                            if (nuevoTipo === 'SALIDA DE VIVERO') {
                                                nuevoControl = 0;
                                                nuevoInicioVivero = ninoHistoricoSeleccionado?.fechaInicioVivero
                                                    ? new Date(ninoHistoricoSeleccionado.fechaInicioVivero).toISOString().slice(0, 10)
                                                    : ninoForm.fechaInicioVivero;
                                                nuevoSalidaVivero = jornadaActiva?.fecha
                                                    ? new Date(jornadaActiva.fecha).toISOString().slice(0, 10)
                                                    : new Date().toISOString().slice(0, 10);
                                                nuevoZEntrada = ninoHistoricoSeleccionado?.zScoreEntrada !== null && ninoHistoricoSeleccionado?.zScoreEntrada !== undefined
                                                    ? String(ninoHistoricoSeleccionado.zScoreEntrada)
                                                    : ninoForm.zScoreEntrada;
                                                nuevoZSalida = ninoForm.zScore || '';

                                                if (nuevoInicioVivero && nuevoSalidaVivero) {
                                                    const diff = Math.round(
                                                        Math.abs(new Date(nuevoSalidaVivero).getTime() - new Date(nuevoInicioVivero).getTime()) /
                                                            (1000 * 60 * 60 * 24)
                                                    );
                                                    nuevoSemanas = String(Math.min(12, Math.max(1, Math.round(diff / 7))));
                                                }
                                            } else if (nuevoTipo === 'DIAGNOSTICO INICIAL') {
                                                nuevoControl = 0;
                                            } else if (nuevoTipo === 'REINGRESO') {
                                                nuevoControl = ninoHistoricoSeleccionado ? (ninoHistoricoSeleccionado.totalReingresos || 0) : 0;
                                            } else if (nuevoTipo === 'MONITOREO') {
                                                nuevoControl = ninoHistoricoSeleccionado
                                                    ? Math.max(1, (Number(ninoHistoricoSeleccionado.nroControlPrevio) || 0) + 1)
                                                    : 1;
                                            }
                                            setNinoForm({
                                                ...ninoForm,
                                                tipoIngreso: nuevoTipo,
                                                nroControl: nuevoControl,
                                                fechaInicioVivero: nuevoInicioVivero,
                                                fechaSalidaVivero: nuevoSalidaVivero,
                                                zScoreEntrada: nuevoZEntrada,
                                                zScoreSalida: nuevoZSalida,
                                                semanasVivero: nuevoSemanas,
                                                situacionSalida: nuevaSituacion,
                                            });
                                        }}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                                    >
                                        <option value="DIAGNOSTICO INICIAL">DIAGNÓSTICO INICIAL</option>
                                        <option value="MONITOREO">MONITOREO</option>
                                        <option value="REINGRESO">REINGRESO</option>
                                        <option value="SALIDA DE VIVERO">SALIDA DE VIVERO</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">N° Control / Semana</label>
                                    <select
                                        value={ninoForm.nroControl}
                                        onChange={(e) => setNinoForm({ ...ninoForm, nroControl: Number(e.target.value) })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold text-slate-800"
                                    >
                                        <option value={0}>0 (Inicial / Salida / 1er Reingreso)</option>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                                            <option key={num} value={num}>
                                                {num} ({num === 1 ? '1er Monitoreo' : `${num}° Monitoreo / Sem ${num}`})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombres del Niño/a *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nombres"
                                        value={ninoForm.nombres}
                                        onChange={(e) => setNinoForm({ ...ninoForm, nombres: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Apellidos del Niño/a *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Apellidos"
                                        value={ninoForm.apellidos}
                                        onChange={(e) => setNinoForm({ ...ninoForm, apellidos: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Sexo *</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setNinoForm({ ...ninoForm, sexo: 'FEMENINO' })}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                                                ninoForm.sexo === 'FEMENINO'
                                                    ? 'bg-pink-500 text-white border-pink-500 shadow-xs'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span>👧</span> Femenino
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNinoForm({ ...ninoForm, sexo: 'MASCULINO' })}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                                                ninoForm.sexo === 'MASCULINO'
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span>👦</span> Masculino
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Nacimiento *</label>
                                    <input
                                        type="date"
                                        required
                                        value={ninoForm.fechaNacimiento}
                                        onChange={(e) => setNinoForm({ ...ninoForm, fechaNacimiento: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* BLOQUE 2: MEDIDAS ANTROPOMÉTRICAS Y CÁLCULO EN TIEMPO REAL (REORDENADO: 1° CBI, 2° TALLA, 3° PESO) */}
                        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">2</span>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Tamizaje Antropométrico: 1° C. Brazo / CBI → 2° Talla → 3° Peso
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-600">
                                        Clasificación CBI/PB:{' '}
                                        <strong className="text-slate-900">{clasificacionPbNinoCalc}</strong>
                                    </span>
                                    <span>•</span>
                                    <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${obtenerEstiloEstado(estadoNutricionalNinoCalc)}`}>
                                        Diagnóstico Z-Score: {estadoNutricionalNinoCalc}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                                {/* 1. C. Brazo / CBI (cm) - PRIMERO */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        1° C. Brazo / CBI (cm) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        inputMode="decimal"
                                        required
                                        placeholder="Ej: 15.0"
                                        value={ninoForm.cBrazoCm}
                                        onChange={(e) => setNinoForm({ ...ninoForm, cBrazoCm: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900"
                                    />
                                </div>

                                {/* 2. Talla (cm) - SEGUNDO */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        2° Talla (cm) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        inputMode="decimal"
                                        required
                                        placeholder="Ej: 84.0"
                                        value={ninoForm.tallaCm}
                                        onChange={(e) => setNinoForm({ ...ninoForm, tallaCm: e.target.value, zScoreManual: false })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900"
                                    />
                                </div>

                                {/* 3. Peso (kg) - TERCERO */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        3° Peso (kg) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        inputMode="decimal"
                                        required
                                        placeholder="Ej: 11.5"
                                        value={ninoForm.pesoKg}
                                        onChange={(e) => setNinoForm({ ...ninoForm, pesoKg: e.target.value, zScoreManual: false })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900"
                                    />
                                </div>

                                {/* 4. Posición Medida */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Posición Medida</label>
                                    <select
                                        value={ninoForm.posicionMedida}
                                        onChange={(e) => setNinoForm({ ...ninoForm, posicionMedida: e.target.value, zScoreManual: false })}
                                        className="w-full px-2 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                                        title="Posición en que fue medido el niño (Maventy/OMS)"
                                    >
                                        <option value="AUTO">Automático (OMS)</option>
                                        <option value="ACOSTADO">Acostado (Recostado)</option>
                                        <option value="DE_PIE">De pie (Estatura)</option>
                                    </select>
                                </div>

                                {/* 5. C. Cefálica (cm) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">C. Cefálica (cm)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        inputMode="decimal"
                                        placeholder="27 cm"
                                        value={ninoForm.longitudCabezaCm}
                                        onChange={(e) => setNinoForm({ ...ninoForm, longitudCabezaCm: e.target.value })}
                                        className="w-full px-2 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 text-center"
                                        title="Longitud de la cabeza (constante estándar Maventy: 27 cm)"
                                    />
                                </div>

                                {/* 6. Z-Score (ZPT) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Z-Score (ZPT) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        inputMode="decimal"
                                        required
                                        placeholder="Maventy OMS"
                                        value={ninoForm.zScore}
                                        onChange={(e) => setNinoForm({ ...ninoForm, zScore: e.target.value, zScoreManual: true })}
                                        className="w-full px-3 py-2 rounded-xl border border-primary/40 bg-white text-sm font-bold text-primary"
                                        title="Calculado automáticamente con el algoritmo oficial de Maventy/OMS. Puedes editarlo si lo deseas."
                                    />
                                </div>

                                {/* 7. Edema */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Edema</label>
                                    <div className="grid grid-cols-2 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setNinoForm({ ...ninoForm, edema: 'NO' })}
                                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                ninoForm.edema === 'NO' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            NO
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNinoForm({ ...ninoForm, edema: 'SI' })}
                                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                ninoForm.edema === 'SI' ? 'bg-red-600 text-white border-red-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            SÍ
                                        </button>
                                    </div>
                                </div>

                                {/* 8. Desparasitado */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Desparasitado</label>
                                    <div className="grid grid-cols-2 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setNinoForm({ ...ninoForm, desparasitado: 'NO' })}
                                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                ninoForm.desparasitado === 'NO' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            NO
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNinoForm({ ...ninoForm, desparasitado: 'SI' })}
                                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                ninoForm.desparasitado === 'SI' ? 'bg-teal-600 text-white border-teal-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            SÍ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BLOQUE VIVERO / SALIDA: VISIBLE EXCLUSIVAMENTE SI ES SALIDA DE VIVERO */}
                        {ninoForm.tipoIngreso === 'SALIDA DE VIVERO' && (
                            <div className="bg-emerald-50/70 border border-emerald-300 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                                            ✓
                                        </span>
                                        <div>
                                            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                                                Datos de Egreso y Cierre de Vivero (Cáritas)
                                            </h4>
                                            <p className="text-[11px] text-emerald-800">
                                                Campos oficiales de la planilla (Columnas AJ a AO). Autocompletados con el historial del niño.
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                                        Salida de Vivero Activa
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                                    <div>
                                        <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                                            F. Inicio Vivero *
                                        </label>
                                        <input
                                            type="date"
                                            value={ninoForm.fechaInicioVivero}
                                            onChange={(e) => {
                                                const inicio = e.target.value;
                                                let sem = ninoForm.semanasVivero;
                                                if (inicio && ninoForm.fechaSalidaVivero) {
                                                    const diff = Math.round(
                                                        Math.abs(new Date(ninoForm.fechaSalidaVivero).getTime() - new Date(inicio).getTime()) /
                                                            (1000 * 60 * 60 * 24)
                                                    );
                                                    sem = String(Math.min(12, Math.max(1, Math.round(diff / 7))));
                                                }
                                                setNinoForm({ ...ninoForm, fechaInicioVivero: inicio, semanasVivero: sem });
                                            }}
                                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-medium text-slate-800"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                                            F. Salida Vivero *
                                        </label>
                                        <input
                                            type="date"
                                            value={ninoForm.fechaSalidaVivero}
                                            onChange={(e) => {
                                                const salida = e.target.value;
                                                let sem = ninoForm.semanasVivero;
                                                if (ninoForm.fechaInicioVivero && salida) {
                                                    const diff = Math.round(
                                                        Math.abs(new Date(salida).getTime() - new Date(ninoForm.fechaInicioVivero).getTime()) /
                                                            (1000 * 60 * 60 * 24)
                                                    );
                                                    sem = String(Math.min(12, Math.max(1, Math.round(diff / 7))));
                                                }
                                                setNinoForm({ ...ninoForm, fechaSalidaVivero: salida, semanasVivero: sem });
                                            }}
                                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-medium text-slate-800"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                                            Z-Score Entrada
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="-2.50"
                                            value={ninoForm.zScoreEntrada}
                                            onChange={(e) => setNinoForm({ ...ninoForm, zScoreEntrada: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-slate-800"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                                            Z-Score Salida
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="-0.80"
                                            value={ninoForm.zScoreSalida || ninoForm.zScore}
                                            onChange={(e) => setNinoForm({ ...ninoForm, zScoreSalida: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-emerald-700"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                                            Semanas Vivero
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={12}
                                            placeholder="8"
                                            value={ninoForm.semanasVivero}
                                            onChange={(e) => setNinoForm({ ...ninoForm, semanasVivero: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-slate-800 text-center"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                                            Situación a la Salida *
                                        </label>
                                        <select
                                            value={ninoForm.situacionSalida}
                                            onChange={(e) => setNinoForm({ ...ninoForm, situacionSalida: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-slate-800"
                                        >
                                            <option value="RECUPERADO">RECUPERADO</option>
                                            <option value="NO RECUPERADO">NO RECUPERADO</option>
                                            <option value="ABANDONO PROGRAMA">ABANDONO PROGRAMA</option>
                                            <option value="FALLECIDO">FALLECIDO</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BLOQUE 3: TRATAMIENTOS ENTREGADOS SEGÚN PROTOCOLO CÁRITAS */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">3</span>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Protocolo Cáritas, Tratamiento Suministrado y Otros Complementos
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                {/* Micronutrientes */}
                                <div className={`p-3.5 rounded-2xl border transition-all ${ninoForm.micronutrientes ? 'bg-teal-50/70 border-teal-300' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={ninoForm.micronutrientes}
                                                onChange={(e) => setNinoForm({ ...ninoForm, micronutrientes: e.target.checked, cantMicronutrientes: e.target.checked ? 30 : 0 })}
                                                className="rounded text-teal-600"
                                            />
                                            <span>💊 Micronutrientes</span>
                                        </label>
                                        {ninoForm.micronutrientes && (
                                            <input
                                                type="number"
                                                value={ninoForm.cantMicronutrientes}
                                                onChange={(e) => setNinoForm({ ...ninoForm, cantMicronutrientes: Number(e.target.value) })}
                                                className="w-16 px-2 py-1 text-xs font-bold border border-teal-300 rounded-lg bg-white text-center"
                                            />
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">Adecuados / RN &gt; 2 años (30 sobres)</p>
                                </div>

                                {/* Plumpy Amarillo */}
                                <div className={`p-3.5 rounded-2xl border transition-all ${ninoForm.plumpyAmarillo ? 'bg-yellow-50/80 border-yellow-300' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={ninoForm.plumpyAmarillo}
                                                onChange={(e) => setNinoForm({ ...ninoForm, plumpyAmarillo: e.target.checked, cantPlumpyAmarillo: e.target.checked ? 30 : 0 })}
                                                className="rounded text-yellow-600"
                                            />
                                            <span>🟨 Plumpy Amarillo (DOZ)</span>
                                        </label>
                                        {ninoForm.plumpyAmarillo && (
                                            <input
                                                type="number"
                                                value={ninoForm.cantPlumpyAmarillo}
                                                onChange={(e) => setNinoForm({ ...ninoForm, cantPlumpyAmarillo: Number(e.target.value) })}
                                                className="w-16 px-2 py-1 text-xs font-bold border border-yellow-300 rounded-lg bg-white text-center"
                                            />
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">Riesgo Nutricional &lt; 2 años (30 sobres)</p>
                                </div>

                                {/* Plumpy Rojo */}
                                <div className={`p-3.5 rounded-2xl border transition-all ${ninoForm.plumpyRojo ? 'bg-rose-50/80 border-rose-300' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={ninoForm.plumpyRojo}
                                                onChange={(e) => setNinoForm({ ...ninoForm, plumpyRojo: e.target.checked, cantPlumpyRojo: e.target.checked ? 30 : 0 })}
                                                className="rounded text-rose-600"
                                            />
                                            <span>🟥 Plumpy Rojo (NUT)</span>
                                        </label>
                                        {ninoForm.plumpyRojo && (
                                            <input
                                                type="number"
                                                value={ninoForm.cantPlumpyRojo}
                                                onChange={(e) => setNinoForm({ ...ninoForm, cantPlumpyRojo: Number(e.target.value) })}
                                                className="w-16 px-2 py-1 text-xs font-bold border border-rose-300 rounded-lg bg-white text-center"
                                            />
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">DAM (1 diario / 30) • DAS (2 diarios / 60)</p>
                                </div>

                                {/* Otros Complementos (Columna AI del Formato Oficial) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Otros Complementos
                                    </label>
                                    <select
                                        value={ninoForm.otrosComplementos}
                                        onChange={(e) => setNinoForm({ ...ninoForm, otrosComplementos: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                                    >
                                        <option value="Ninguno">Ninguno</option>
                                        <option value="Sales de rehidratación oral">Sales de rehidratación oral</option>
                                        <option value="Amoxicilina">Amoxicilina</option>
                                        <option value="Ambos insumos">Ambos insumos</option>
                                        <option value="Lactovisoy">Lactovisoy</option>
                                        <option value="Otro...incluir en las observaciones.">Otro...incluir en las observaciones.</option>
                                    </select>
                                </div>

                                {/* Observaciones */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                        <span>Observaciones</span>
                                        {ninoForm.otrosComplementos.startsWith('Otro') && !ninoForm.observaciones.trim() && (
                                            <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full animate-pulse">
                                                👉 Indique complemento
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: SE MIDIÓ RECOSTADO / NO ENTRA EN SAMAN"
                                        value={ninoForm.observaciones}
                                        onChange={(e) => setNinoForm({ ...ninoForm, observaciones: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-all ${
                                            ninoForm.otrosComplementos.startsWith('Otro') && !ninoForm.observaciones.trim()
                                                ? 'border-amber-400 ring-2 ring-amber-300/60 bg-amber-50/40'
                                                : 'border-slate-200'
                                        }`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            {editandoNinoId && (
                                <button
                                    type="button"
                                    onClick={cancelarEdicionNino}
                                    className="px-5 py-3 rounded-2xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-6 py-3 rounded-2xl text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                                    editandoNinoId
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                                        : 'bg-primary text-white shadow-primary/20 hover:bg-primary/90'
                                }`}
                            >
                                {isSubmitting
                                    ? 'Procesando...'
                                    : editandoNinoId
                                    ? '💾 Guardar Cambios de la Evaluación'
                                    : '+ Registrar Evaluación de Niño/a en la Jornada'}
                            </button>
                        </div>
                    </form>

                    {/* TABLA DE NIÑOS ATENDIDOS EN LA JORNADA ACTIVA */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    📋 Niños/as Registrados en la Jornada ({ninosFiltrados.length})
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Estos registros se exportan directamente a la pestaña &ldquo;1. SAMAN NIÑOS&rdquo; del archivo oficial de Cáritas.
                                </p>
                            </div>
                        </div>

                        {/* VISTA ESCRITORIO / TABLET ANCHA: TABLA COMPLETA */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                                        <th className="py-3 px-4">N°</th>
                                        <th className="py-3 px-4">C.I. Rep. / Parentesco</th>
                                        <th className="py-3 px-4">Niño / Niña</th>
                                        <th className="py-3 px-4">Edad / Rango</th>
                                        <th className="py-3 px-4 text-center">Peso / Talla / CBI</th>
                                        <th className="py-3 px-4 text-center">Z-Score</th>
                                        <th className="py-3 px-4">Estado Nutricional</th>
                                        <th className="py-3 px-4">Tratamiento Suministrado</th>
                                        <th className="py-3 px-4 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {ninosFiltrados.map((n: any, idx: number) => (
                                        <tr key={n.id} className={`hover:bg-slate-50/80 transition-colors ${editandoNinoId === n.id ? 'bg-amber-50/50' : ''}`}>
                                            <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-800">{n.cedulaRepresentante}</div>
                                                <div className="text-[10px] text-slate-500">
                                                    {n.parentesco} • <span className="font-semibold text-primary">{n.tipoIngreso}</span> (Ctrl: {n.nroControl ?? 0})
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-900">{n.nombres} {n.apellidos}</div>
                                                <div className="text-[10px] text-slate-500">
                                                    {n.sexo} • Nac: {new Date(n.fechaNacimiento).toLocaleDateString('es-VE')}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-700">{formatearEdadLegible(n.edadMeses)}</div>
                                                <div className="text-[10px] text-slate-400">{n.rangoEdad}</div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="font-bold text-slate-800">{n.pesoKg} kg</span> •{' '}
                                                <span className="font-semibold text-slate-700">{n.tallaCm} cm</span> •{' '}
                                                <span className="text-primary font-bold">{n.cBrazoCm} cm</span>
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-slate-900">
                                                {n.zScore}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${obtenerEstiloEstado(n.estadoNutricional)}`}>
                                                    {n.estadoNutricional}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-slate-800">{n.tratamientoProtocolo}</div>
                                                {n.cantidadSuministrada > 0 && (
                                                    <span className="text-[10px] text-emerald-600 font-bold">
                                                        {n.cantidadSuministrada} sobres • Desp: {n.desparasitado}
                                                    </span>
                                                )}
                                                {n.otrosComplementos && n.otrosComplementos !== 'Ninguno' && (
                                                    <div className="text-[10px] text-indigo-600 font-semibold">
                                                        + Compl: {n.otrosComplementos}
                                                    </div>
                                                )}
                                                {n.observaciones && (
                                                    <div className="text-[10px] text-amber-600 italic">{n.observaciones}</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => iniciarEdicionNino(n)}
                                                        className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                                                        title="Editar evaluación"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            if (confirm(`¿Eliminar el registro de ${n.nombres} ${n.apellidos}?`)) {
                                                                await eliminarRegistroSamanNino(n.id);
                                                                router.refresh();
                                                            }
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                                        title="Eliminar registro"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* VISTA MÓVIL Y TABLET: TARJETAS COMPACTAS TÁCTILES */}
                        <div className="block md:hidden divide-y divide-slate-100">
                            {ninosFiltrados.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400">
                                    No hay niños registrados en esta jornada todavía.
                                </div>
                            ) : (
                                ninosFiltrados.map((n: any, idx: number) => (
                                    <div key={n.id} className={`p-4 space-y-2.5 hover:bg-slate-50/60 transition-colors ${editandoNinoId === n.id ? 'bg-amber-50/50' : ''}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-none">
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 text-sm leading-tight">
                                                        {n.nombres} {n.apellidos}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        {n.sexo === 'FEMENINO' ? '👧' : '👦'} {formatearEdadLegible(n.edadMeses)} ({n.rangoEdad})
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex-none ${obtenerEstiloEstado(n.estadoNutricional)}`}>
                                                {n.estadoNutricional}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-2.5 rounded-xl text-center">
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">CBI (1°)</span>
                                                <span className="text-xs font-bold text-primary">{n.cBrazoCm} cm</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Talla (2°)</span>
                                                <span className="text-xs font-bold text-slate-800">{n.tallaCm} cm</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Peso (3°)</span>
                                                <span className="text-xs font-bold text-slate-800">{n.pesoKg} kg</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Z-Score</span>
                                                <span className="text-xs font-bold text-slate-900">{n.zScore}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                                            <div className="truncate pr-2">
                                                <span className="font-semibold text-slate-700">C.I. Rep:</span> {n.cedulaRepresentante} ({n.parentesco})
                                                <span className="font-semibold text-primary"> • {n.tipoIngreso}</span> (Ctrl: {n.nroControl ?? 0})
                                                {n.tratamientoProtocolo && ` • ${n.tratamientoProtocolo}`}
                                            </div>
                                            <div className="flex items-center gap-1 flex-none">
                                                <button
                                                    type="button"
                                                    onClick={() => iniciarEdicionNino(n)}
                                                    className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg transition-colors"
                                                    title="Editar evaluación"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (confirm(`¿Eliminar el registro de ${n.nombres} ${n.apellidos}?`)) {
                                                            await eliminarRegistroSamanNino(n.id);
                                                            router.refresh();
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===================================================================== */}
            {/* CONTENIDO PESTAÑA 2: SAMÁN EMBARAZADAS Y LACTANTES (MEL)              */}
            {/* ===================================================================== */}
            {activeTab === 'mel' && (
                <div className="space-y-6">
                    <form id="form-saman-mel" onSubmit={handleGuardarMel} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
                        {/* BANNER INDICADOR DE MODO EDICIÓN MEL */}
                        {editandoMelId !== null && (
                            <div className="bg-pink-50 border-2 border-pink-400 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-pink-950 animate-in fade-in duration-200 shadow-xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center flex-none shadow-xs">
                                        <Edit className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold">
                                            Modo Edición Activo: Modificando evaluación MEL de {melForm.nombre} {melForm.apellido}
                                        </h4>
                                        <p className="text-xs text-pink-850">
                                            Modifique los campos necesarios y presione &quot;Guardar Cambios&quot; para actualizar el registro en la jornada.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={cancelarEdicionMel}
                                    className="px-3.5 py-2 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                    <X className="w-4 h-4 text-slate-500" />
                                    <span>Cancelar Edición</span>
                                </button>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <span>🤰</span> Captura Antropométrica en Campo — Mujeres Embarazadas y Lactantes (MEL)
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Ingresa la cédula de la paciente para verificar su historial evolutivo previo y calcular IMC y Perímetro Braquial.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="px-3 py-1 rounded-xl bg-pink-50 text-pink-700 font-semibold border border-pink-100">
                                    Edad: <strong>{edadAniosMelCalculada} años</strong> • IMC: <strong>{imcMelCalculado || '0.0'}</strong> ({clasificacionImcMelCalc})
                                </span>
                            </div>
                        </div>

                        {/* TARJETA DE HISTORIAL EVOLUTIVO MEL */}
                        {buscandoHistorialMel && (
                            <div className="p-3 rounded-2xl bg-pink-50/60 border border-pink-100 text-xs text-pink-700 flex items-center gap-2">
                                <History className="w-4 h-4 animate-spin" />
                                <span>Buscando historial evolutivo MEL para la cédula {melForm.cedula}...</span>
                            </div>
                        )}

                        {historialMel && (
                            <div className="bg-gradient-to-r from-pink-50/90 via-purple-50/60 to-amber-50/60 rounded-2xl p-4 border border-pink-200 shadow-xs space-y-3 animate-in fade-in duration-200">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-xl bg-pink-600 text-white flex items-center justify-center">
                                            <History className="w-4 h-4" />
                                        </span>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900">
                                                Historial Evolutivo MEL — {historialMel.nombre} {historialMel.apellido} (C.I. {historialMel.cedula})
                                            </h4>
                                            <p className="text-xs text-slate-600">
                                                Última fecha de medición:{' '}
                                                <strong>{new Date(historialMel.ultimaFechaMedicion).toLocaleDateString('es-VE')}</strong>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => cargarDatosMelHistorico(historialMel)}
                                        className="bg-pink-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-pink-700 transition-all flex items-center gap-1.5 cursor-pointer ring-4 ring-pink-400/70 animate-pulse shadow-md"
                                    >
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span>👉 Autocompletar datos de {historialMel.nombre}</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                    <div className="bg-white/90 p-3 rounded-xl border border-white">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Última Fecha</span>
                                        <span className="text-sm font-bold text-slate-900">
                                            {new Date(historialMel.ultimaFechaMedicion).toLocaleDateString('es-VE')}
                                        </span>
                                    </div>
                                    <div className="bg-white/90 p-3 rounded-xl border border-white">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">C. Brazo (PB)</span>
                                        <span className="text-sm font-bold text-slate-900">{historialMel.cBrazoCm} cm</span>
                                        <span className="text-[10px] text-slate-500 block">{historialMel.clasificacionPb}</span>
                                    </div>
                                    <div className="bg-white/90 p-3 rounded-xl border border-white">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Talla (cm)</span>
                                        <span className="text-sm font-bold text-slate-900">{historialMel.tallaCm} cm</span>
                                    </div>
                                    <div className="bg-white/90 p-3 rounded-xl border border-white">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Peso (kg)</span>
                                        <span className="text-sm font-bold text-slate-900">{historialMel.pesoKg} kg</span>
                                    </div>
                                    <div className="bg-white/90 p-3 rounded-xl border border-white">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">IMC / Estado Nutricional</span>
                                        <span className="text-sm font-bold text-slate-900">{Number(historialMel.imc).toFixed(1)}</span>{' '}
                                        <span className="text-xs font-semibold text-pink-700">({historialMel.clasificacionNutricional})</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>Cédula de Identidad *</span>
                                    {!melForm.cedula.trim() && (
                                        <span className="text-[10px] font-black text-pink-700 bg-pink-100 border border-pink-300 px-1.5 py-0.5 rounded-full animate-pulse">
                                            👉 1. Iniciar aquí
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    required
                                    placeholder="Ej: 28479221 (solo números)"
                                    value={melForm.cedula}
                                    onChange={(e) => setMelForm({ ...melForm, cedula: e.target.value })}
                                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                                        !melForm.cedula.trim()
                                            ? 'border-pink-400 ring-4 ring-pink-300/60 bg-pink-50/40 text-slate-900 animate-pulse'
                                            : 'border-slate-200 bg-slate-50/50 text-slate-800'
                                    }`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Grupo Étnico</label>
                                <select
                                    value={melForm.grupoEtnico}
                                    onChange={(e) => setMelForm({ ...melForm, grupoEtnico: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold text-slate-800"
                                >
                                    <option value="Mestizo">Mestizo (Mayoría)</option>
                                    <option value="Indígena">Indígena</option>
                                    <option value="Afrodescendiente">Afrodescendiente</option>
                                    <option value="SD">SD (Sin Determinar)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nombres *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Nombre de la paciente"
                                    value={melForm.nombre}
                                    onChange={(e) => setMelForm({ ...melForm, nombre: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Apellidos *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Apellido de la paciente"
                                    value={melForm.apellido}
                                    onChange={(e) => setMelForm({ ...melForm, apellido: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Nacimiento *</label>
                                <input
                                    type="date"
                                    required
                                    value={melForm.fechaNacimiento}
                                    onChange={(e) => setMelForm({ ...melForm, fechaNacimiento: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Condición (MEL) *</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setMelForm({ ...melForm, estadoEmbarazoLactancia: 'EMBARAZADA' })}
                                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                                            melForm.estadoEmbarazoLactancia === 'EMBARAZADA'
                                                ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span>🤰</span> Embarazada
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMelForm({ ...melForm, estadoEmbarazoLactancia: 'LACTANTE' })}
                                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                                            melForm.estadoEmbarazoLactancia === 'LACTANTE'
                                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span>🤱</span> Lactante
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Semana de Gestación</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="Ej: 15 (si está embarazada)"
                                    value={melForm.semanaGestacion}
                                    onChange={(e) => setMelForm({ ...melForm, semanaGestacion: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Ingreso</label>
                                <select
                                    value={melForm.tipoIngreso}
                                    onChange={(e) => setMelForm({ ...melForm, tipoIngreso: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                                >
                                    <option value="DIAGNOSTICO INICIAL">DIAGNÓSTICO INICIAL</option>
                                    <option value="MONITOREO">MONITOREO</option>
                                    <option value="REINGRESO">REINGRESO</option>
                                    <option value="SALIDA DE VIVERO">SALIDA DE VIVERO</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Desparasitada</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setMelForm({ ...melForm, desparasitada: 'NO' })}
                                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                            melForm.desparasitada === 'NO' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        NO
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMelForm({ ...melForm, desparasitada: 'SI' })}
                                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                            melForm.desparasitada === 'SI' ? 'bg-teal-600 text-white border-teal-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        SÍ
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ANTROPOMETRÍA MEL */}
                        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Peso (kg) *</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    inputMode="decimal"
                                    required
                                    placeholder="Ej: 64.5"
                                    value={melForm.pesoKg}
                                    onChange={(e) => setMelForm({ ...melForm, pesoKg: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Talla (cm) *</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    inputMode="decimal"
                                    required
                                    placeholder="Ej: 160.5"
                                    value={melForm.tallaCm}
                                    onChange={(e) => setMelForm({ ...melForm, tallaCm: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">C. Brazo / PB (cm) *</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    inputMode="decimal"
                                    required
                                    placeholder="≤ 22.1 Bajo Peso"
                                    value={melForm.cBrazoCm}
                                    onChange={(e) => setMelForm({ ...melForm, cBrazoCm: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">IMC / Clasificación</label>
                                <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800">
                                    IMC: {imcMelCalculado || '0.0'} — {clasificacionImcMelCalc}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Clasificación PB (CBI)</label>
                                <div className={`px-3 py-2 rounded-xl border text-xs font-bold ${ obtenerEstiloEstado(clasificacionPbMelCalc) }`}>
                                    {clasificacionPbMelCalc}
                                </div>
                            </div>
                        </div>

                        {/* TRATAMIENTO MEL */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tratamiento Protocolo Cáritas</label>
                                <select
                                    value={melForm.tratamiento}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setMelForm({
                                            ...melForm,
                                            tratamiento: val,
                                            plumpyMum: val.toLowerCase().includes('plumpy'),
                                            cantPlumpyMum: val.toLowerCase().includes('plumpy') ? melForm.cantidad : 0,
                                            micronutrientes: !val.toLowerCase().includes('plumpy'),
                                            cantMicronutrientes: !val.toLowerCase().includes('plumpy') ? melForm.cantidad : 0,
                                        });
                                    }}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold text-slate-800"
                                >
                                    <option value="Hierro+Ácido Fólico">Hierro+Ácido Fólico</option>
                                    <option value="Plumpy Mum">Plumpy Mum (Suplemento MEL)</option>
                                    <option value="Tabletas Prenatales (Micronutrientes)">Tabletas Prenatales (Micronutrientes)</option>
                                    <option value="Sin Tratamiento">Sin Tratamiento</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Cantidad Entregada</label>
                                <input
                                    type="number"
                                    value={melForm.cantidad}
                                    onChange={(e) => setMelForm({ ...melForm, cantidad: Number(e.target.value) })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones</label>
                                <input
                                    type="text"
                                    placeholder="Ej: NO SE LE SUMINISTRÓ PLUMPY"
                                    value={melForm.observaciones}
                                    onChange={(e) => setMelForm({ ...melForm, observaciones: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            {editandoMelId && (
                                <button
                                    type="button"
                                    onClick={cancelarEdicionMel}
                                    className="px-5 py-3 rounded-2xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-6 py-3 rounded-2xl text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                                    editandoMelId
                                        ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-pink-600/20'
                                        : 'bg-primary text-white shadow-primary/20 hover:bg-primary/90'
                                }`}
                            >
                                {isSubmitting
                                    ? 'Procesando...'
                                    : editandoMelId
                                    ? '💾 Guardar Cambios Evaluación MEL'
                                    : '+ Registrar Evaluación MEL en la Jornada'}
                            </button>
                        </div>
                    </form>

                    {/* TABLA DE MEL ATENDIDAS EN LA JORNADA ACTIVA */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    📋 Mujeres Embarazadas y Lactantes Registradas ({melFiltradas.length})
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Estos registros se exportan directamente a la pestaña &ldquo;2. SAMAN EMBARAZADAS&rdquo; del archivo oficial de Cáritas.
                                </p>
                            </div>
                        </div>

                        {/* VISTA ESCRITORIO / TABLET ANCHA: TABLA COMPLETA */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                                        <th className="py-3 px-4">#</th>
                                        <th className="py-3 px-4">Cédula</th>
                                        <th className="py-3 px-4">Nombre y Apellido</th>
                                        <th className="py-3 px-4">Condición</th>
                                        <th className="py-3 px-4 text-center">Peso / Talla / IMC</th>
                                        <th className="py-3 px-4">Clasif. IMC</th>
                                        <th className="py-3 px-4">C. Brazo (PB)</th>
                                        <th className="py-3 px-4">Tratamiento</th>
                                        <th className="py-3 px-4 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {melFiltradas.map((m: any, idx: number) => (
                                        <tr key={m.id} className={`hover:bg-slate-50/80 transition-colors ${editandoMelId === m.id ? 'bg-pink-50/50' : ''}`}>
                                            <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                                            <td className="py-3 px-4 font-bold text-slate-800">{m.cedula}</td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-900">{m.nombre} {m.apellido}</div>
                                                <div className="text-[10px] text-slate-500">
                                                    Nac: {new Date(m.fechaNacimiento).toLocaleDateString('es-VE')}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-semibold text-pink-700">{m.estadoEmbarazoLactancia}</span>
                                                {m.semanaGestacion && (
                                                    <div className="text-[10px] text-slate-500">{m.semanaGestacion} sem. gestación</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="font-bold text-slate-800">{m.pesoKg} kg</span> •{' '}
                                                <span>{m.tallaCm} cm</span> •{' '}
                                                <span className="font-bold text-primary">IMC {Number(m.imc).toFixed(1)}</span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${obtenerEstiloEstado(m.clasificacionNutricional)}`}>
                                                    {m.clasificacionNutricional}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-800">{m.cBrazoCm} cm</div>
                                                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border ${obtenerEstiloEstado(m.clasificacionPb)}`}>
                                                    {m.clasificacionPb}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-slate-800">{m.tratamiento} ({m.cantidad})</div>
                                                {m.observaciones && (
                                                    <div className="text-[10px] text-amber-600 italic">{m.observaciones}</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => iniciarEdicionMel(m)}
                                                        className="p-1.5 text-slate-500 hover:text-pink-600 rounded-lg hover:bg-pink-50 transition-colors cursor-pointer"
                                                        title="Editar evaluación MEL"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            if (confirm(`¿Eliminar el registro de ${m.nombre} ${m.apellido}?`)) {
                                                                await eliminarRegistroSamanEmbarazada(m.id);
                                                                router.refresh();
                                                            }
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* VISTA MÓVIL Y TABLET: TARJETAS COMPACTAS TÁCTILES MEL */}
                        <div className="block md:hidden divide-y divide-slate-100">
                            {melFiltradas.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400">
                                    No hay mujeres embarazadas o lactantes registradas en esta jornada todavía.
                                </div>
                            ) : (
                                melFiltradas.map((m: any, idx: number) => (
                                    <div key={m.id} className={`p-4 space-y-2.5 hover:bg-slate-50/60 transition-colors ${editandoMelId === m.id ? 'bg-pink-50/50' : ''}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-lg bg-pink-100 text-pink-700 text-xs font-bold flex items-center justify-center flex-none">
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 text-sm leading-tight">
                                                        {m.nombre} {m.apellido}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        C.I. {m.cedula} • <span className="font-semibold text-pink-700">{m.estadoEmbarazoLactancia}</span>
                                                        {m.semanaGestacion && ` (${m.semanaGestacion} sem)`}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex-none ${obtenerEstiloEstado(m.clasificacionNutricional)}`}>
                                                {m.clasificacionNutricional}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-2.5 rounded-xl text-center">
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Peso</span>
                                                <span className="text-xs font-bold text-slate-800">{m.pesoKg} kg</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Talla</span>
                                                <span className="text-xs font-bold text-slate-800">{m.tallaCm} cm</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">PB</span>
                                                <span className="text-xs font-bold text-primary">{m.cBrazoCm} cm</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">IMC</span>
                                                <span className="text-xs font-bold text-slate-900">{Number(m.imc).toFixed(1)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                                            <div className="truncate pr-2">
                                                <span className="font-semibold text-slate-700">Tratamiento:</span> {m.tratamiento} ({m.cantidad})
                                            </div>
                                            <div className="flex items-center gap-1 flex-none">
                                                <button
                                                    type="button"
                                                    onClick={() => iniciarEdicionMel(m)}
                                                    className="p-1.5 text-slate-500 hover:text-pink-600 rounded-lg transition-colors"
                                                    title="Editar evaluación MEL"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (confirm(`¿Eliminar el registro de ${m.nombre} ${m.apellido}?`)) {
                                                            await eliminarRegistroSamanEmbarazada(m.id);
                                                            router.refresh();
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors flex-none"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. BARRA DE ACCIÓN FIJA INFERIOR PARA TELÉFONOS Y TABLETS (STICKY MOBILE BAR) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {activeTab === 'ninos' ? 'Diagnóstico Z-Score' : 'Evaluación MEL'}
                    </span>
                    <div className="flex items-center gap-1.5 truncate">
                        {activeTab === 'ninos' ? (
                            <>
                                <span className="text-xs font-black text-slate-900">
                                    Z: {ninoForm.zScore || '0.00'}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border truncate ${obtenerEstiloEstado(estadoNutricionalNinoCalc)}`}>
                                    {estadoNutricionalNinoCalc}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="text-xs font-black text-slate-900">
                                    IMC: {imcMelCalculado || '0.0'}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border truncate ${obtenerEstiloEstado(clasificacionImcMelCalc)}`}>
                                    {clasificacionImcMelCalc}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    form={activeTab === 'ninos' ? 'form-saman-ninos' : 'form-saman-mel'}
                    disabled={isSubmitting}
                    className="bg-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 flex-none"
                >
                    <Plus className="w-4 h-4" />
                    <span>{isSubmitting ? 'Guardando...' : activeTab === 'ninos' ? 'Guardar Niño/a' : 'Guardar MEL'}</span>
                </button>
            </div>

            {/* MODAL PARA CREAR NUEVA JORNADA SAMÁN */}
            {showNewJornadaModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">🌱 Crear Nueva Jornada SAMÁN</h3>
                            <button
                                type="button"
                                onClick={() => setShowNewJornadaModal(false)}
                                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCrearJornada} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de la Jornada *</label>
                                    <input
                                        type="date"
                                        required
                                        value={nuevaJornadaForm.fecha}
                                        onChange={(e) => setNuevaJornadaForm({ ...nuevaJornadaForm, fecha: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Sector / Comunidad *</label>
                                    <input
                                        type="text"
                                        required
                                        value={nuevaJornadaForm.comunidad}
                                        onChange={(e) => setNuevaJornadaForm({ ...nuevaJornadaForm, comunidad: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Diócesis</label>
                                    <input
                                        type="text"
                                        value={nuevaJornadaForm.diocesis}
                                        onChange={(e) => setNuevaJornadaForm({ ...nuevaJornadaForm, diocesis: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Estado / Municipio</label>
                                    <input
                                        type="text"
                                        value={nuevaJornadaForm.municipio}
                                        onChange={(e) => setNuevaJornadaForm({ ...nuevaJornadaForm, municipio: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Parroquia Civil</label>
                                    <input
                                        type="text"
                                        value={nuevaJornadaForm.parroquiaCivil}
                                        onChange={(e) => setNuevaJornadaForm({ ...nuevaJornadaForm, parroquiaCivil: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Parroquia Eclesial</label>
                                    <input
                                        type="text"
                                        value={nuevaJornadaForm.parroquiaEclesial}
                                        onChange={(e) => setNuevaJornadaForm({ ...nuevaJornadaForm, parroquiaEclesial: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowNewJornadaModal(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-primary/90 cursor-pointer"
                                >
                                    Crear e Iniciar Jornada
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
