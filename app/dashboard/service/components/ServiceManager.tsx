'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import AttendanceModal from './AttendanceModal';
import { Badge } from '@/app/components/ui/Badge';

interface ServiceManagerProps {
    groups: any[];
    initialData: any[]; // Beneficiaries
}

export default function ServiceManager({ groups, initialData }: ServiceManagerProps) {
    const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBeneficiary, setSelectedBeneficiary] = useState<any>(null);

    // Filter beneficiaries by group and search term
    const filteredBeneficiaries = initialData.filter(b => {
        const matchesGroup = b.groupId === selectedGroupId;
        const matchesSearch = b.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.nationalId.includes(searchTerm);
        return matchesGroup && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Group Selector Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {groups.map((group: any) => (
                    <button
                        key={group.id}
                        onClick={() => setSelectedGroupId(group.id)}
                        className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${selectedGroupId === group.id
                            ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
                            : 'bg-white text-muted-foreground hover:bg-muted'
                            }`}
                    >
                        {group.name}
                    </button>
                ))}
            </div>

            {/* Search & List */}
            <div className="bg-white rounded-xl border border-border shadow-sm flex flex-col h-[600px]">
                <div className="p-4 border-b border-border">
                    <input
                        type="text"
                        placeholder="Buscar beneficiario..."
                        className="w-full px-4 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary/20 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {filteredBeneficiaries.length > 0 ? (
                        <div className="grid gap-2">
                            {filteredBeneficiaries.map((beneficiary: any) => {
                                // Check if attended today (simplified logic, assumes data has 'attendances' populated properly potentially)
                                // Ideally we check server side or pass stats. For now let's just show list.
                                const lastAttendance = beneficiary.attendances?.[0]; // Assuming sorted descending
                                const attendedToday = lastAttendance && new Date(lastAttendance.date).toDateString() === new Date().toDateString();

                                return (
                                    <div
                                        key={beneficiary.id}
                                        className={`flex items-center justify-between p-4 rounded-lg border transition-all ${attendedToday ? 'bg-green-50 border-green-200 opacity-75' : 'bg-white border-border hover:border-primary/50 hover:shadow-sm'}`}
                                    >
                                        <div>
                                            <h4 className="font-bold text-foreground">{beneficiary.fullName}</h4>
                                            <p className="text-xs text-muted-foreground flex gap-2">
                                                <span>{beneficiary.nationalId}</span>
                                                {attendedToday && <span className="text-green-600 font-bold">✓ Atendido Hoy</span>}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={attendedToday ? "outline" : "primary"}
                                            onClick={() => setSelectedBeneficiary(beneficiary)}
                                        // disabled={attendedToday} // Permitir ver detalle siempre
                                        >
                                            {attendedToday ? 'Ver Detalle' : 'Registrar Entrega'}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <p>No hay beneficiarios en este grupo.</p>
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
                        // Refresh logic would be ideal here (router.refresh())
                        window.location.reload(); // Simple reload for MVP to reflect changes
                    }}
                />
            )}
        </div>
    );
}
