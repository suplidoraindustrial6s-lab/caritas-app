import { getBeneficiaries } from '@/app/actions/beneficiaries';
import BeneficiaryTable from './components/BeneficiaryTable';
import BeneficiarySearch from './components/BeneficiarySearch';
import { Button } from '@/app/components/ui/Button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function BeneficiariesPage({
    searchParams,
}: {
    searchParams?: Promise<{
        search?: string;
        groupId?: string;
    }>;
}) {
    const params = await searchParams;
    const search = params?.search || '';
    const groupId = params?.groupId ? parseInt(params.groupId) : undefined;

    const { data: beneficiaries } = await getBeneficiaries({ search, groupId });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Beneficiarios</h1>
                    <p className="text-muted-foreground mt-1">Gestión del padrón de beneficiarios</p>
                </div>
                <Link href="/dashboard/beneficiaries/new">
                    <Button>+ Nuevo Beneficiario</Button>
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
                <BeneficiarySearch />
                {/* Aquí se podrían agregar filtros por grupo si se desea un dropdown */}
            </div>

            <BeneficiaryTable beneficiaries={beneficiaries || []} />
        </div>
    );
}
