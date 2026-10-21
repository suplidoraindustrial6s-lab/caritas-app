import { obtenerDatosModuloSaman } from '@/app/actions/saman';
import SamanManager from './components/SamanManager';

export const dynamic = 'force-dynamic';

export default async function SamanPage({
    searchParams,
}: {
    searchParams: Promise<{ jornadaId?: string }>;
}) {
    const params = await searchParams;
    const jornadaId = params?.jornadaId ? Number(params.jornadaId) : undefined;

    const res = await obtenerDatosModuloSaman(jornadaId);

    if (!res.success || !res.data) {
        return (
            <div className="p-8 text-center text-red-600 font-semibold">
                {res.error || 'Error al cargar el módulo del Programa SAMÁN'}
            </div>
        );
    }

    return (
        <SamanManager
            jornadas={res.data.jornadas}
            jornadaActiva={res.data.jornadaActiva}
            indicadores={res.data.indicadores}
        />
    );
}
