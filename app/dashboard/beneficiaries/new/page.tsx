import { getGroups } from '@/app/actions/groups';
import BeneficiaryForm from '../components/BeneficiaryForm';

export default async function NewBeneficiaryPage() {
    const { data: groups } = await getGroups();

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Registrar Nuevo Beneficiario</h1>
                <p className="text-muted-foreground">Complete la información para añadir una persona al padrón.</p>
            </div>

            <BeneficiaryForm groups={groups} />
        </div>
    );
}
