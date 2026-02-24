'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { registerAttendance } from '@/app/actions/attendance';
import { getBeneficiaryById } from '@/app/actions/beneficiaries';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface AttendanceModalProps {
    beneficiary: any;
    serviceDayId?: number;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AttendanceModal({ beneficiary, serviceDayId, onClose, onSuccess }: AttendanceModalProps) {
    const [activeTab, setActiveTab] = useState<'register' | 'history'>('register');
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState<any>(null);
    const [formData, setFormData] = useState({
        receivedFood: true,
        foodQuantity: 0, // Default 0 to avoid errors
        receivedClothes: false,
        clothesQuantity: 0,
        receivedMedical: false,
        medicinesReceived: '', // Legacy simple string
        medicinesList: [] as { name: string, quantity: number }[], // New structured list
        signature: 'Firma Digital/Manual'
    });

    // Nuevo medicamento input state
    const [newMed, setNewMed] = useState({ name: '', quantity: 1 });

    const addMedicine = () => {
        if (!newMed.name.trim()) return;
        setFormData({
            ...formData,
            medicinesList: [...formData.medicinesList, { ...newMed }]
        });
        setNewMed({ name: '', quantity: 1 });
    };

    const removeMedicine = (index: number) => {
        const newList = [...formData.medicinesList];
        newList.splice(index, 1);
        setFormData({ ...formData, medicinesList: newList });
    };

    // Cargar historial al abrir
    useEffect(() => {
        const fetchHistory = async () => {
            const res = await getBeneficiaryById(beneficiary.id);
            if (res.success && res.data) {
                setHistoryData(res.data);
            }
        };
        fetchHistory();
    }, [beneficiary.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await registerAttendance({
                beneficiaryId: beneficiary.id,
                serviceDayId: serviceDayId, // Pass serviceDayId
                date: new Date(),
                ...formData,
                foodQuantity: Number(formData.foodQuantity),
                clothesQuantity: Number(formData.clothesQuantity),
                medicinesDetail: JSON.stringify(formData.medicinesList) // Send structured data
            });
            if (result.success) onSuccess();
            else alert('Error al registrar asistencia');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Procesar datos para gráfico
    const chartData = historyData?.attendances?.map((a: any) => ({
        date: new Date(a.date).toLocaleDateString('es-VE'),
        ropa: a.clothesQuantity,
        comida: a.foodQuantity || (a.receivedFood ? 1 : 0),
        medicina: a.receivedMedical ? 1 : 0
    })).reverse() || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-white/20">

                {/* Header */}
                <div className="p-6 border-b border-border bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{beneficiary.fullName}</h3>
                        <p className="text-sm text-slate-500">{beneficiary.nationalId} • {beneficiary.zone || 'Sin Zona'}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('register')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'register' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            Nueva Atención
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            Historial
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'register' ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-4 rounded-xl border border-border space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="food" className="font-medium cursor-pointer select-none">📦 Productos Entregados</label>
                                        <input
                                            type="checkbox"
                                            id="food"
                                            checked={formData.receivedFood}
                                            onChange={(e) => setFormData({ ...formData, receivedFood: e.target.checked })}
                                            className="w-6 h-6 rounded text-primary focus:ring-primary"
                                        />
                                    </div>
                                    {formData.receivedFood && (
                                        <div className="pl-4 border-l-2 border-primary/20">
                                            <Input
                                                type="number"
                                                label="Cantidad de Productos"
                                                value={formData.foodQuantity}
                                                onChange={(e) => setFormData({ ...formData, foodQuantity: Number(e.target.value) })}
                                                min={0}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 border rounded-xl bg-blue-50 border-blue-100">
                                    <label className="flex items-center gap-3 cursor-pointer mb-3">
                                        <input type="checkbox" checked={formData.receivedClothes} onChange={(e) => setFormData({ ...formData, receivedClothes: e.target.checked })} className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500" />
                                        <span className="font-semibold text-slate-700">👕 Ropero</span>
                                    </label>
                                    {formData.receivedClothes && (
                                        <Input type="number" label="Piezas entregadas" value={formData.clothesQuantity} onChange={(e) => setFormData({ ...formData, clothesQuantity: Number(e.target.value) })} min={0} />
                                    )}
                                </div>

                                <div className="p-4 border rounded-xl bg-green-50 border-green-100">
                                    <label className="flex items-center gap-3 cursor-pointer mb-3">
                                        <input type="checkbox" checked={formData.receivedMedical} onChange={(e) => setFormData({ ...formData, receivedMedical: e.target.checked })} className="w-6 h-6 text-green-600 rounded focus:ring-green-500" />
                                        <span className="font-semibold text-slate-700">💊 Medicina / Salud</span>
                                    </label>
                                    {formData.receivedMedical && (
                                        <div className="space-y-3 mt-3">
                                            {/* List of added medicines */}
                                            {formData.medicinesList.length > 0 && (
                                                <div className="bg-white/50 rounded-lg p-2 space-y-2">
                                                    {formData.medicinesList.map((med, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded shadow-sm">
                                                            <span><strong>{med.quantity}</strong> x {med.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeMedicine(idx)}
                                                                className="text-red-500 hover:text-red-700 font-bold px-2"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Add New Medicine */}
                                            <div className="flex gap-2 items-end">
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-slate-500 block mb-1">Nombre Medicamento</label>
                                                    <Input
                                                        placeholder="Ej. Acetaminofen"
                                                        value={newMed.name}
                                                        onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="w-20">
                                                    <label className="text-xs font-bold text-slate-500 block mb-1">Cant.</label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={newMed.quantity}
                                                        onChange={(e) => setNewMed({ ...newMed, quantity: parseInt(e.target.value) || 1 })}
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={addMedicine}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-3"
                                                >
                                                    +
                                                </Button>
                                            </div>
                                            <p className="text-xs text-slate-400">Agrega cada medicamento entregado a la lista.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t">
                                <Button type="button" variant="ghost" onClick={onClose}>Cerrar</Button>
                                <Button type="submit" isLoading={loading}>Guardar Registro</Button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="h-64 w-full bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <h4 className="text-sm font-bold text-slate-500 mb-4 text-center">Resumen de Entregas</h4>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                        <XAxis dataKey="date" fontSize={12} />
                                        <YAxis fontSize={12} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="comida" name="Productos" fill="#f97316" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="ropa" name="Ropa" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="medicina" name="Medicina" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-slate-700">Historial Detallado</h4>
                                {historyData?.attendances?.length > 0 ? (
                                    historyData.attendances.map((att: any) => (
                                        <div key={att.id} className="p-3 border rounded-lg text-sm flex justify-between items-center hover:bg-slate-50">
                                            <div>
                                                <span className="font-bold block text-slate-800">{new Date(att.date).toLocaleDateString('es-VE')}</span>
                                                <div className="flex gap-2 text-slate-500 text-xs mt-1">
                                                    {att.receivedFood && <span className="text-orange-600 bg-orange-100 px-1 rounded">Comida</span>}
                                                    {att.receivedClothes && <span className="text-blue-600 bg-blue-100 px-1 rounded">{att.clothesQuantity} Ropa</span>}
                                                    {att.receivedMedical && <span className="text-green-600 bg-green-100 px-1 rounded">Med</span>}
                                                </div>
                                            </div>
                                            {att.medicinesReceived && <span className="text-xs text-slate-400 max-w-[150px] truncate" title={att.medicinesReceived}>{att.medicinesReceived}</span>}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400 text-center py-4">Sin registros previos.</p>
                                )}
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button type="button" variant="outline" onClick={onClose}>Cerrar</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
