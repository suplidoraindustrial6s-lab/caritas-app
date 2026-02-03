import prisma from '@/app/lib/prisma';
import { notFound } from 'next/navigation';

// Server Component for printing
export default async function SignatureListPage({
    searchParams,
}: {
    searchParams: Promise<{ groupId?: string; date?: string }>;
}) {
    const { groupId, date } = await searchParams;

    if (!groupId) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 font-bold">Error: Debe seleccionar un grupo para imprimir.</p>
            </div>
        );
    }

    const group = await prisma.group.findUnique({
        where: { id: Number(groupId) },
        include: {
            beneficiaries: {
                orderBy: { fullName: 'asc' }
            }
        }
    });

    if (!group) return notFound();

    const printDate = date ? new Date(date).toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="bg-white min-h-screen p-8 print:p-0 font-sans text-black">
            {/* Header for Print */}
            <div className="mb-8 border-b-2 border-black pb-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    {/* Logo placeholder - in print sometimes images are tricky, text is safer or require print-color-adjust */}
                    <div className="w-16 h-16 border border-black rounded-full flex items-center justify-center font-bold text-xs text-center">
                        LOGO
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wide">Cáritas Parroquial</h1>
                        <h2 className="text-lg font-semibold">Control de Asistencia y Entrega</h2>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold">GRUPO: <span className="text-xl">{group.name}</span></p>
                    <p className="text-sm">FECHA: {printDate}</p>
                </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-black text-sm">
                <thead>
                    <tr className="bg-gray-100 print:bg-gray-200">
                        <th className="border border-black px-2 py-2 w-12 text-center">#</th>
                        <th className="border border-black px-2 py-2 text-left">Nombre y Apellido</th>
                        <th className="border border-black px-2 py-2 w-24 text-center">Cédula</th>
                        <th className="border border-black px-2 py-2 w-32 text-center">Alimentos / Ropa</th>
                        <th className="border border-black px-2 py-2 w-48 text-center">Firma del Beneficiario</th>
                    </tr>
                </thead>
                <tbody>
                    {group.beneficiaries.map((b: any, index: number) => (
                        <tr key={b.id} className="break-inside-avoid">
                            <td className="border border-black px-2 py-3 text-center font-bold">{index + 1}</td>
                            <td className="border border-black px-2 py-3 uppercase">{b.fullName}</td>
                            <td className="border border-black px-2 py-3 text-center">{b.nationalId}</td>
                            <td className="border border-black px-2 py-3"></td>
                            <td className="border border-black px-2 py-3"></td>
                        </tr>
                    ))}
                    {/* Empty Rows for extras */}
                    {Array.from({ length: 5 }).map((_, i) => (
                        <tr key={`empty-${i}`} className="break-inside-avoid">
                            <td className="border border-black px-2 py-4 text-center text-gray-400">{group.beneficiaries.length + i + 1}</td>
                            <td className="border border-black px-2 py-4"></td>
                            <td className="border border-black px-2 py-4"></td>
                            <td className="border border-black px-2 py-4"></td>
                            <td className="border border-black px-2 py-4"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer */}
            <div className="mt-8 grid grid-cols-3 gap-8 text-center text-xs break-inside-avoid">
                <div className="pt-8 border-t border-black mx-4">
                    Coordinador de Grupo
                </div>
                <div className="pt-8 border-t border-black mx-4">
                    Pastoral Social
                </div>
                <div className="pt-8 border-t border-black mx-4">
                    Sello Parroquial
                </div>
            </div>

            {/* Print Button (Hidden when printing) */}
            <div className="fixed bottom-8 right-8 print:hidden">
                <button
                    onClick={() => { }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                // Inline JS for printing to avoid client component complexity just for this
                // actually we need 'use client' for onClick, or use a script.
                // Let's make this component server and add a small client wrapper or just script.
                // simpler: Link to go back and a standard window.print() triggered by user browser menu? 
                // No, let's make a small client component for the button.
                >
                    🖨️ Imprimir
                </button>
            </div>
            <script dangerouslySetInnerHTML={{
                __html: `
                document.querySelector('button').onclick = () => window.print();
            `}} />
        </div>
    );
}
