
'use client';

import { useEffect, useState } from 'react';
import { getBeneficiaryHistory } from '@/app/actions/beneficiaries';

interface HistoryModalProps {
    beneficiaryId: number;
    beneficiaryName: string;
    onClose: () => void;
}

export default function HistoryModal({ beneficiaryId, beneficiaryName, onClose }: HistoryModalProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getBeneficiaryHistory(beneficiaryId).then(res => {
            if (res.success) {
                setHistory(res.data || []);
            }
            setLoading(false);
        });
    }, [beneficiaryId]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Historial de Asistencia</h3>
                        <p className="text-sm text-gray-500 font-medium">{beneficiaryName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        ✕
                    </button>
                </div>

                <div className="overflow-y-auto p-0 flex-1">
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">Cargando historial...</div>
                    ) : history.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                            <span className="text-4xl mb-2">📅</span>
                            <p>No hay registros de asistencia.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-semibold sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Jornada</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3">Detalles</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-700">
                                            {new Date(record.date).toLocaleDateString('es-VE')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {record.serviceDay?.group ? record.serviceDay.group.name : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.status === 'Presente'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-xs space-y-1">
                                            {record.receivedFood && <div>🍲 Comida ({record.foodQuantity})</div>}
                                            {record.receivedClothes && <div>👕 Ropa ({record.clothesQuantity})</div>}
                                            {record.receivedMedical && (
                                                <div className="text-amber-600" title={record.medicinesDetail}>
                                                    💊 Atención Médica
                                                </div>
                                            )}
                                            {!record.receivedFood && !record.receivedClothes && !record.receivedMedical && (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
