'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import AttendanceModal from './AttendanceModal';
import { Badge } from '@/app/components/ui/Badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { closeServiceDay, getServiceDayReport } from '@/app/actions/service';

interface ServiceManagerProps {
    groups: any[];
    initialData: any[]; // Beneficiaries
}

export default function ServiceManager({ groups, initialData }: ServiceManagerProps) {
    // Debug: Verificar si photoUrl está en los datos
    console.log('ServiceManager - Sample beneficiary data:', initialData[0]);

    const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBeneficiary, setSelectedBeneficiary] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grid' | 'compact'>('list');

    // Filter beneficiaries by group and search term
    const filteredBeneficiaries = initialData.filter(b => {
        const matchesGroup = b.groupId === selectedGroupId;
        const matchesSearch = b.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.nationalId.includes(searchTerm);
        return matchesGroup && matchesSearch;
    });

    const handleCloseDay = async () => {
        if (!confirm('¿Estás seguro de cerrar la jornada? Se marcarán como AUSENTES a quienes no asistieron y se generará el reporte.')) return;

        try {
            const result = await closeServiceDay(selectedGroupId);
            if (result.success) {
                alert(`Jornada cerrada. Asistentes: ${result.stats?.present}, Ausentes: ${result.stats?.absent}`);
                await generateReport();
                window.location.reload();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (e) {
            console.error(e);
            alert('Error al cerrar jornada');
        }
    };

    const generateReport = async () => {
        const report = await getServiceDayReport(selectedGroupId, new Date().toISOString());
        if (!report.success || !report.records) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text(`Reporte de Jornada - Grupo ${report.groupName}`, 14, 20);

        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date(report.date!).toLocaleDateString('es-VE')}`, 14, 28);
        doc.text(`Asistencia: ${Number(((report.stats?.present || 0) / (report.stats?.totalBeneficiaries || 1)) * 100).toFixed(1)}%`, 14, 34);

        // Stats Box
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(14, 40, 180, 25, 3, 3, 'F');
        doc.setFontSize(10);
        doc.text(`Total: ${report.stats?.totalBeneficiaries}`, 20, 50);
        doc.text(`Asistentes: ${report.stats?.present}`, 20, 60);
        doc.text(`Ausentes: ${report.stats?.absent}`, 60, 50);
        doc.text(`Comidas: ${report.stats?.foodPacks}`, 60, 60);
        doc.text(`Prendas: ${report.stats?.clothesPieces}`, 110, 50);
        doc.text(`Medicinas: ${report.stats?.medicalAttention}`, 110, 60);

        // Table
        const tableData = report.records.map((r: any) => [
            r.beneficiary.fullName,
            r.beneficiary.nationalId,
            r.status === 'Ausente' ? 'AUSENTE' : 'PRESENTE',
            r.receivedFood ? `Si (${r.foodQuantity})` : '-',
            r.receivedClothes ? `Si (${r.clothesQuantity})` : '-',
            r.medicinesReceived || '-'
        ]);

        autoTable(doc, {
            startY: 75,
            head: [['Beneficiario', 'Cédula', 'Estatus', 'Comida', 'Ropa', 'Medicina']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        doc.save(`Reporte_Jornada_${report.groupName}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const getGroupStyles = (name: string) => {
        switch (name) {
            case 'Fe': return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', shadow: 'shadow-blue-100', icon: '✨' };
            case 'Esperanza': return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', shadow: 'shadow-emerald-100', icon: '🌱' };
            case 'Caridad': return { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', shadow: 'shadow-purple-100', icon: '💜' };
            case 'Amor': return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', shadow: 'shadow-red-100', icon: '❤️' };
            default: return { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', shadow: 'shadow-slate-100', icon: '👥' };
        }
    };

    return (
        <div className="space-y-8">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {/* Group Selector Tabs - Dashboard Style Cards */}
                {/* Group Selector Tabs - Mobile Grid / Desktop Flex */}
                <div className="grid grid-cols-2 gap-2 w-full md:flex md:w-auto md:gap-4">
                    {groups.map((group: any) => {
                        const styles = getGroupStyles(group.name);
                        const isSelected = selectedGroupId === group.id;

                        // Mobile-optimized colors (always colored)
                        let mobileClass = "";
                        if (group.name === 'Fe') mobileClass = isSelected ? "bg-blue-100 border-blue-300 ring-1 ring-blue-500" : "bg-blue-50/50 border-blue-100 text-blue-900";
                        else if (group.name === 'Esperanza') mobileClass = isSelected ? "bg-emerald-100 border-emerald-300 ring-1 ring-emerald-500" : "bg-emerald-50/50 border-emerald-100 text-emerald-900";
                        else if (group.name === 'Caridad') mobileClass = isSelected ? "bg-purple-100 border-purple-300 ring-1 ring-purple-500" : "bg-purple-50/50 border-purple-100 text-purple-900";
                        else if (group.name === 'Amor') mobileClass = isSelected ? "bg-red-100 border-red-300 ring-1 ring-red-500" : "bg-red-50/50 border-red-100 text-red-900";
                        else mobileClass = isSelected ? "bg-amber-100 border-amber-300" : "bg-amber-50/50 border-amber-100";

                        return (
                            <button
                                key={group.id}
                                onClick={() => setSelectedGroupId(group.id)}
                                className={`
                                    relative flex items-center gap-2 md:gap-3 px-3 py-2 md:px-5 md:py-4 rounded-xl md:rounded-[1.5rem] transition-all duration-300
                                    md:min-w-[160px] border
                                    ${mobileClass}
                                    md:bg-white md:border-slate-100
                                    ${isSelected
                                        ? 'md:bg-white md:shadow-lg md:ring-2 md:ring-primary md:scale-105 md:z-10 shadow-sm scale-[1.02]'
                                        : 'md:bg-white/60 md:hover:bg-white md:hover:shadow-md md:text-slate-500 md:saturate-50 md:hover:saturate-100'
                                    }
                                `}
                            >
                                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-sm md:text-lg ${styles.bg} ${styles.color} md:bg-opacity-100 bg-white/80`}>
                                    {styles.icon}
                                </div>
                                <div className="text-left min-w-0">
                                    <span className={`hidden md:block text-xs font-bold uppercase tracking-wider ${isSelected ? styles.color : 'text-slate-500'}`}>
                                        Grupo
                                    </span>
                                    <span className={`block font-bold text-sm md:text-lg leading-tight truncate ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                                        {group.name}
                                    </span>
                                </div>
                                {isSelected && (
                                    <div className={`hidden md:block absolute bottom-0 left-0 right-0 h-1.5 rounded-b-[1.5rem] ${styles.bg.replace('/50', '/30 w-full')}`}></div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-3">
                    {/* View Toggles */}
                    <div className="bg-white p-1 rounded-xl border border-slate-100 shadow-sm flex">
                        {[
                            { id: 'list', icon: '📝' },
                            { id: 'grid', icon: '🪪' },
                            { id: 'compact', icon: '📄' }
                        ].map((m: any) => (
                            <button
                                key={m.id}
                                onClick={() => setViewMode(m.id as any)}
                                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${viewMode === m.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                                title={m.id}
                            >
                                {m.icon}
                            </button>
                        ))}
                    </div>

                    <Button
                        onClick={handleCloseDay}
                        className="bg-slate-900 text-white hover:bg-black rounded-xl px-6 py-2.5 shadow-lg shadow-slate-900/20"
                    >
                        🔒 Cerrar Jornada
                    </Button>
                </div>
            </div>

            {/* Search & List */}
            <div className={`
                 bg-white rounded-[2.5rem] border border-slate-200 shadow-md flex flex-col overflow-hidden transition-all duration-500
                 ${viewMode === 'list' ? 'h-[700px]' : 'h-auto min-h-[500px]'}
            `}>
                <div className="p-6 border-b border-slate-100">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar beneficiario..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-slate-300 outline-none text-slate-800 font-bold placeholder:text-slate-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                    {filteredBeneficiaries.length > 0 ? (
                        <>
                            {/* GRID VIEW */}
                            {viewMode === 'grid' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredBeneficiaries.map((beneficiary: any) => {
                                        const lastAttendance = beneficiary.attendances?.[0];
                                        const attendedToday = lastAttendance && new Date(lastAttendance.date).toDateString() === new Date().toDateString();
                                        const styles = getGroupStyles(groups.find(g => g.id === beneficiary.groupId)?.name);

                                        return (
                                            <div
                                                key={beneficiary.id}
                                                className={`bg-white p-5 rounded-[2rem] border transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col items-center text-center relative
                                                    ${attendedToday ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}
                                                `}
                                            >
                                                {attendedToday && (
                                                    <div className="absolute top-4 right-4 text-emerald-700 bg-emerald-100 rounded-full p-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                    </div>
                                                )}

                                                <div className={`w-16 h-16 rounded-2xl mb-3 relative overflow-hidden flex items-center justify-center text-2xl shadow-sm ${styles.bg} ${styles.color}`}>
                                                    {beneficiary.photoUrl ? (
                                                        <img src={beneficiary.photoUrl} alt={beneficiary.fullName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        beneficiary.fullName.charAt(0)
                                                    )}
                                                </div>

                                                <h4 className="font-bold text-slate-900 text-lg leading-snug mb-2">{beneficiary.fullName}</h4>
                                                <span className="text-sm font-bold font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded-lg mb-5 border border-slate-200">{beneficiary.nationalId}</span>

                                                <Button
                                                    size="sm"
                                                    className={`w-full rounded-xl py-6 font-bold text-base mt-auto shadow-sm ${attendedToday
                                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200"
                                                        : "bg-slate-900 text-white hover:bg-black shadow-slate-900/20"
                                                        }`}
                                                    onClick={() => setSelectedBeneficiary(beneficiary)}
                                                >
                                                    {attendedToday ? 'Ver Detalles' : 'Registrar'}
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* LIST VIEW */}
                            {viewMode === 'list' && (
                                <div className="space-y-3">
                                    {filteredBeneficiaries.map((beneficiary: any) => {
                                        const lastAttendance = beneficiary.attendances?.[0];
                                        const attendedToday = lastAttendance && new Date(lastAttendance.date).toDateString() === new Date().toDateString();
                                        const styles = getGroupStyles(groups.find(g => g.id === beneficiary.groupId)?.name);

                                        return (
                                            <div
                                                key={beneficiary.id}
                                                className={`flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-[1.5rem] border transition-all hover:scale-[1.005] relative overflow-hidden
                                                    ${styles.bg} ${styles.border} ${attendedToday ? 'ring-1 ring-emerald-500/50' : 'hover:shadow-md'}
                                                `}
                                            >
                                                {/* Indicador lateral extra para resaltar grupo */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 md:w-1.5 ${styles.bg.replace('50', '500')}`}></div>

                                                <div className="flex items-center gap-3 md:gap-4 pl-2 md:pl-3 overflow-hidden">
                                                    <div className={`flex-none w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl relative overflow-hidden flex items-center justify-center font-bold text-base md:text-xl bg-white/80 ${styles.color} shadow-sm backdrop-blur-sm`}>
                                                        {beneficiary.photoUrl ? (
                                                            <img src={beneficiary.photoUrl} alt={beneficiary.fullName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            beneficiary.fullName.charAt(0)
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className={`text-sm md:text-lg font-bold text-slate-900 group-hover:text-black truncate`}>{beneficiary.fullName}</h4>
                                                        <div className="flex items-center gap-2 md:gap-3 mt-0.5 md:mt-1">
                                                            <span className="text-[10px] md:text-sm font-bold font-mono text-slate-600 bg-white/60 px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-md border border-slate-200/50">{beneficiary.nationalId}</span>
                                                            {attendedToday && <span className="text-[9px] md:text-[11px] font-extrabold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full border border-emerald-200 shadow-sm">LISTO</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button
                                                    size="sm"
                                                    className="flex-none rounded-lg md:rounded-xl px-3 py-1.5 md:px-6 md:py-2.5 text-xs md:text-sm font-bold shadow-sm md:shadow-lg bg-slate-900 text-white hover:bg-black shadow-slate-900/10"
                                                    onClick={() => setSelectedBeneficiary(beneficiary)}
                                                >
                                                    {attendedToday ? 'Ver' : 'Reg'}
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* COMPACT VIEW */}
                            {viewMode === 'compact' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {filteredBeneficiaries.map((beneficiary: any) => {
                                        const lastAttendance = beneficiary.attendances?.[0];
                                        const attendedToday = lastAttendance && new Date(lastAttendance.date).toDateString() === new Date().toDateString();
                                        const styles = getGroupStyles(groups.find(g => g.id === beneficiary.groupId)?.name);

                                        return (
                                            <div key={beneficiary.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-400 transition-all cursor-pointer group" onClick={() => setSelectedBeneficiary(beneficiary)}>
                                                <div className={`w-1.5 h-10 rounded-full ${attendedToday ? 'bg-emerald-500' : 'bg-slate-300 group-hover:bg-slate-400'}`}></div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-800 text-base">{beneficiary.fullName}</h4>
                                                    <p className="text-sm font-medium text-slate-500">{beneficiary.nationalId}</p>
                                                </div>
                                                {attendedToday ? (
                                                    <div className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg text-sm font-bold">Hecho</div>
                                                ) : (
                                                    <div className="text-slate-400 bg-slate-50 px-3 py-1 rounded-lg text-sm font-bold group-hover:bg-slate-100 group-hover:text-slate-600">Reg</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                            </div>
                            <p className="font-medium text-lg">No se encontraron beneficiarios</p>
                        </div>
                    )}
                </div>
            </div>

            {selectedBeneficiary && (
                <AttendanceModal
                    beneficiary={selectedBeneficiary}
                    onClose={() => setSelectedBeneficiary(null)}
                    onSuccess={() => {
                        setSelectedBeneficiary(null);
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
