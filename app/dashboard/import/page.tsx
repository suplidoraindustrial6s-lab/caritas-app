'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { processImportFile } from '@/app/actions/import';

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await processImportFile(formData);
            setResult(response);
        } catch (error) {
            console.error(error);
            setResult({ success: false, error: 'Error inesperado al procesar archivo.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-12">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-border">
                <div className="mb-6 border-b border-border pb-6">
                    <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">Importación Masiva de Datos</h1>
                    <p className="text-muted-foreground">Carga registros históricos de beneficiarios y asistencias desde Excel.</p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 text-sm text-blue-800">
                    <h3 className="font-bold mb-2 flex items-center gap-2">📝 Instrucciones de Formato</h3>
                    <ul className="list-disc pl-5 space-y-1 opacity-90">
                        <li>El archivo debe ser formato <strong>.xlsx</strong> (Excel).</li>
                        <li>Debe contener una hoja llamada <strong>"Beneficiarios"</strong> con columnas: <em>Cédula, Nombre, Grupo, Zona, Dirección</em>.</li>
                        <li>Opcional: Hoja <strong>"Asistencia"</strong> con columnas: <em>Cédula, Fecha (DD/MM/AAAA), Comida (Si/No), Ropa (Cant), Medicina (Si/No)</em>.</li>
                    </ul>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-foreground mb-2">Seleccionar Archivo</label>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2.5 file:px-4
                                file:rounded-xl file:border-0
                                file:text-sm file:font-semibold
                                file:bg-primary file:text-white
                                hover:file:bg-primary/90
                                cursor-pointer border border-border rounded-xl bg-slate-50"
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <Button
                        onClick={handleUpload}
                        isLoading={loading}
                        disabled={!file}
                        className="w-full md:w-auto min-w-[200px]"
                    >
                        {loading ? 'Procesando...' : 'Iniciar Importación'}
                    </Button>
                </div>

                {result && (
                    <div className={`mt-8 p-6 rounded-xl border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} animate-in fade-in slide-in-from-bottom-2`}>
                        <h3 className={`font-bold text-lg mb-2 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                            {result.success ? 'Propcesamiento Completado' : 'Error en Importación'}
                        </h3>
                        {result.success ? (
                            <div className="text-green-700 space-y-1">
                                <p>✅ Beneficiarios creados/actualizados: <strong>{result.stats?.beneficiaries}</strong></p>
                                <p>✅ Registros de asistencia importados: <strong>{result.stats?.attendances}</strong></p>
                                <p className="text-sm mt-2 opacity-75">Los datos ya están disponibles en el sistema.</p>
                            </div>
                        ) : (
                            <p className="text-red-700">{result.error}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
