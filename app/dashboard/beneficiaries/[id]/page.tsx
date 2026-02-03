import { getGroups } from '@/app/actions/groups';
import { getBeneficiaryById } from '@/app/actions/beneficiaries';
import BeneficiaryForm from '../components/BeneficiaryForm';
import { notFound } from 'next/navigation';

export default async function EditBeneficiaryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: idString } = await params;
    const id = parseInt(idString);
    if (isNaN(id)) notFound();

    const [{ data: groups }, { data: beneficiary }] = await Promise.all([
        getGroups(),
        getBeneficiaryById(id)
    ]);

    if (!beneficiary) notFound();

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Editar Beneficiario</h1>
                <p className="text-muted-foreground">Modifique los datos del beneficiario registrado.</p>
            </div>

            <BeneficiaryForm
                groups={groups}
                initialData={beneficiary}
                isEditing
            />
        </div>
    );
}
