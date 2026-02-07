'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBeneficiary, updateBeneficiary } from '@/app/actions/beneficiaries';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

interface ChildData {
    fullName: string;
    gender: string;
    nationalId?: string;
    birthDate: string;
    isStudying: boolean; // boolean
    observations?: string;
}

interface BeneficiaryFormProps {
    initialData?: any;
    groups?: any[];
    isEditing?: boolean;
}

export default function BeneficiaryForm({ initialData, groups, isEditing = false }: BeneficiaryFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Initial children processing
    const initialChildren = initialData?.children?.map((c: any) => ({
        ...c,
        birthDate: c.birthDate ? new Date(c.birthDate).toISOString().split('T')[0] : '',
    })) || [];

    const [formData, setFormData] = useState({
        fullName: initialData?.fullName || '',
        nationalId: initialData?.nationalId || '',
        phoneNumber: initialData?.phoneNumber || '',
        birthDate: initialData?.birthDate ? new Date(initialData.birthDate).toISOString().split('T')[0] : '',
        gender: initialData?.gender || 'F',
        placeOfBirth: initialData?.placeOfBirth || '',
        address: initialData?.address || '',
        zone: initialData?.zone || '',
        chronicIllness: initialData?.chronicIllness || '',
        hasChildren: initialData?.hasChildren || false,
        observations: initialData?.observations || '',
        groupId: initialData?.groupId || '',
    });

    const [childrenData, setChildrenData] = useState<ChildData[]>(initialChildren);
    const [numChildren, setNumChildren] = useState(initialChildren.length || 0);

    // Auto-update numChildren based on toggle
    useEffect(() => {
        if (!formData.hasChildren) {
            setNumChildren(0);
            setChildrenData([]);
        } else if (numChildren === 0 && !isEditing) {
            setNumChildren(1); // Default to 1 if checked
        }
    }, [formData.hasChildren, isEditing]);

    // Sync children array size with numChildren
    useEffect(() => {
        setChildrenData(prev => {
            if (numChildren > prev.length) {
                // Add new empty children
                const toAdd = numChildren - prev.length;
                const newChildren = Array(toAdd).fill({
                    fullName: '',
                    gender: 'M',
                    nationalId: '',
                    birthDate: '',
                    isStudying: false,
                    observations: ''
                });
                return [...prev, ...newChildren];
            } else if (numChildren < prev.length) {
                // Remove extra children
                return prev.slice(0, numChildren);
            }
            return prev;
        });
    }, [numChildren]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleChildChange = (index: number, field: keyof ChildData, value: any) => {
        const updated = [...childrenData];
        updated[index] = { ...updated[index], [field]: value };
        setChildrenData(updated);
    };

    const calculateAge = (dateString: string) => {
        if (!dateString) return '';
        try {
            const today = new Date();
            const birthDate = new Date(dateString);
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age >= 0 ? age : 0;
        } catch (e) { return ''; }
    };

    const [photoFile, setPhotoFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPhotoFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validación de fechas
        if (!formData.birthDate) {
            setError('La fecha de nacimiento es obligatoria.');
            setLoading(false);
            return;
        }

        if (formData.hasChildren) {
            for (let i = 0; i < childrenData.length; i++) {
                if (!childrenData[i].fullName) {
                    setError(`El nombre del hijo #${i + 1} es obligatorio.`);
                    setLoading(false);
                    return;
                }
                if (!childrenData[i].birthDate) {
                    setError(`La fecha de nacimiento del hijo #${i + 1} es obligatoria.`);
                    setLoading(false);
                    return;
                }
            }
        }

        try {
            let finalPhotoUrl = initialData?.photoUrl;

            // Upload photo if selected
            if (photoFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', photoFile);

                // Dynamic import to avoid server-only module issues in client component if strictly enforced?
                // Actually server actions can be imported.
                const { uploadBeneficiaryPhoto } = await import('@/app/actions/upload');
                const uploadRes = await uploadBeneficiaryPhoto(uploadFormData);

                if (uploadRes.success) {
                    finalPhotoUrl = uploadRes.url;
                } else {
                    console.error('Upload failed:', uploadRes.error);
                    // Decide if we want to block registration or just warn
                    // setError('Error al subir la foto.'); 
                    // setLoading(false);
                    // return;
                }
            }

            // Prepare payload
            const payload = {
                ...formData,
                birthDate: new Date(formData.birthDate),
                photoUrl: finalPhotoUrl,
                // Fix: Validation for groupId. If empty string, send undefined/null.
                groupId: formData.groupId && formData.groupId !== '' ? Number(formData.groupId) : undefined,
                children: formData.hasChildren ? childrenData.map((c: any) => ({
                    ...c,
                    birthDate: c.birthDate ? new Date(c.birthDate) : new Date() // Fallback or validation needed? Form required prevents empty
                })) : []
            };

            let result;
            if (isEditing && initialData?.id) {
                result = await updateBeneficiary(initialData.id, payload);
            } else {
                result = await createBeneficiary(payload as any);
            }

            if (result.success) {
                router.push('/dashboard/beneficiaries');
                router.refresh();
            } else {
                setError(result.error as string);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Ocurrió un error inesperado al procesar la solicitud.');
        } finally {
            setLoading(false);
        }
    };

    const registrationDate = isEditing && initialData?.createdAt
        ? new Date(initialData.createdAt).toLocaleDateString('es-VE')
        : new Date().toLocaleDateString('es-VE');

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl bg-white p-8 rounded-2xl border border-border shadow-sm">
            {/* Header Metadata */}
            <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Datos del Beneficiario</h3>
                    <p className="text-sm text-muted-foreground">Complete todos los capos requeridos</p>
                </div>
                <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Fecha de Registro</span>
                    <span className="text-sm font-medium text-primary">{registrationDate}</span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200 flex items-center gap-2">
                    <span>⚠️</span> {error}
                </div>
            )}

            {/* Main Beneficiary Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                    label="Nombre Completo"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                />
                <Input
                    label="Cédula de Identidad"
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={handleChange}
                    required
                />

                <Input
                    label="Teléfono"
                    name="phoneNumber"
                    value={formData.phoneNumber || ''}
                    onChange={handleChange}
                    placeholder="0414-123.45.67"
                />

                <div className="flex gap-4">
                    <div className="flex-1">
                        <Input
                            label="Fecha de Nacimiento"
                            name="birthDate"
                            type="date"
                            value={formData.birthDate}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="w-24">
                        <label className="block text-sm font-medium text-foreground mb-1.5">Edad</label>
                        <div className="px-4 py-2.5 rounded-xl border border-border bg-muted text-center font-bold text-foreground">
                            {calculateAge(formData.birthDate) || '-'}
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1.5">Foto del Beneficiario</label>
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center">
                            {photoFile ? (
                                <img src={URL.createObjectURL(photoFile)} alt="Preview" className="w-full h-full object-cover" />
                            ) : initialData?.photoUrl ? (
                                <img src={initialData.photoUrl} alt="Current" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl text-muted-foreground">👤</span>
                            )}
                        </div>
                        <div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-muted-foreground
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-xl file:border-0
                                file:text-sm file:font-semibold
                                file:bg-primary/10 file:text-primary
                                hover:file:bg-primary/20"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Formatos: JPG, PNG. Máx 5MB.</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Género</label>
                    <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="F">Femenino</option>
                        <option value="M">Masculino</option>
                    </select>
                </div>

                <Input
                    label="Lugar de Nacimiento"
                    name="placeOfBirth"
                    value={formData.placeOfBirth}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                    label="Dirección"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                />
                <Input
                    label="Zona / Sector"
                    name="zone"
                    value={formData.zone}
                    onChange={handleChange}
                    placeholder="Ej. El Limón, Caña de Azúcar"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                    label="Enfermedad Crónica (Opcional)"
                    name="chronicIllness"
                    value={formData.chronicIllness}
                    onChange={handleChange}
                    placeholder="Ninguna"
                />

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Grupo Asignado</label>
                    <select
                        name="groupId"
                        value={formData.groupId}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="">Seleccionar Grupo...</option>
                        {groups?.map((g: any) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="hasChildren"
                        name="hasChildren"
                        checked={formData.hasChildren}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="hasChildren" className="font-semibold text-foreground">¿Tiene hijos menores bajo su cargo?</label>
                </div>

                {formData.hasChildren && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="w-48">
                            <Input
                                label="Cantidad de Hijos"
                                type="number"
                                min={1}
                                max={10}
                                value={numChildren}
                                onChange={(e) => setNumChildren(Number(e.target.value))}
                            />
                        </div>

                        <div className="space-y-6">
                            {childrenData.map((child: any, index: number) => (
                                <div key={index} className="p-6 bg-muted/30 rounded-xl border border-border relative group">
                                    <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-sm">
                                        {index + 1}
                                    </div>
                                    <h4 className="font-bold text-primary mb-4 ml-2">Datos del Hijo(a) #{index + 1}</h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Nombre y Apellidos"
                                            value={child.fullName}
                                            onChange={(e) => handleChildChange(index, 'fullName', e.target.value)}
                                            required
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1.5">Sexo</label>
                                                <select
                                                    value={child.gender}
                                                    onChange={(e) => handleChildChange(index, 'gender', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary/20"
                                                >
                                                    <option value="M">Masculino</option>
                                                    <option value="F">Femenino</option>
                                                </select>
                                            </div>
                                            <Input // Optional ID
                                                label="Cédula (Opcional)"
                                                value={child.nationalId || ''}
                                                onChange={(e) => handleChildChange(index, 'nationalId', e.target.value)}
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <Input
                                                    label="Fecha de Nacimiento"
                                                    type="date"
                                                    value={child.birthDate}
                                                    onChange={(e) => handleChildChange(index, 'birthDate', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="w-20">
                                                <label className="block text-sm font-medium text-foreground mb-1.5">Edad</label>
                                                <div className="px-2 py-2.5 rounded-xl border border-border bg-white text-center font-bold text-foreground">
                                                    {calculateAge(child.birthDate) || '-'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-end pb-2">
                                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border w-full">
                                                <label className="text-sm font-medium text-foreground flex-1">¿Estudia actualmente?</label>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`isStudying-${index}`}
                                                            checked={child.isStudying === true}
                                                            onChange={() => handleChildChange(index, 'isStudying', true)}
                                                            className="text-primary focus:ring-primary"
                                                        /> Si
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`isStudying-${index}`}
                                                            checked={child.isStudying === false}
                                                            onChange={() => handleChildChange(index, 'isStudying', false)}
                                                            className="text-primary focus:ring-primary"
                                                        /> No
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <Input
                                                label="Observación"
                                                placeholder="Algún comentario sobre el menor..."
                                                value={child.observations || ''}
                                                onChange={(e) => handleChildChange(index, 'observations', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Observaciones General</label>
                <textarea
                    name="observations"
                    value={formData.observations}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary/20 h-24"
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
                <Button type="submit" isLoading={loading}>
                    {isEditing ? 'Guardar Cambios' : 'Registrar Beneficiario'}
                </Button>
            </div>
        </form>
    );
}
