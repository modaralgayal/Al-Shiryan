import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { prescriptionCreateSchema, type Drug, type Prescription } from '@aorta-iq/shared';
import { api } from '../../../shared/lib/api';
import { useAuth } from '../../../shared/lib/useAuth';
import { DrugAutocomplete } from '../../../shared/components/DrugAutocomplete';
import { PatientAutocomplete, type PatientOption } from '../../../shared/components/PatientAutocomplete';
import { PrescriptionPrint } from '../../../shared/components/PrescriptionPrint';

interface Item {
  drug: Drug | null;
  dose: string;
  amount: number;
}

export default function PrescriptionWriter() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const patientParam = params.get('patient');
  const copyParam = params.get('copy');
  const reviseParam = params.get('revise');
  const isRevise = !!reviseParam;
  const sourceRxId = copyParam ?? reviseParam;

  const [patientId, setPatientId] = useState(patientParam ?? '');
  const [hospitalName, setHospitalName] = useState('');
  const [doctorContactNumber, setDoctorContactNumber] = useState('');
  const [drugAllergies, setDrugAllergies] = useState('');
  const [medicationInstructions, setMedicationInstructions] = useState('');
  const [electronicSignature, setElectronicSignature] = useState('');
  const [items, setItems] = useState<Item[]>([{ drug: null, dose: '', amount: 1 }]);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Prescription | null>(null);

  const drugs = useQuery({
    queryKey: ['drugs', ''],
    queryFn: () => api.get<{ drugs: Drug[] }>('/api/drugs?q='),
  });
  const drugById = (id: string) => drugs.data?.drugs.find((d) => d.id === id);

  // When arriving from a patient workspace, resolve + lock that patient.
  const lockedPatient = useQuery({
    queryKey: ['patient', patientParam],
    enabled: !!patientParam,
    queryFn: () => api.get<{ patient: PatientOption }>(`/api/patients/${patientParam}`),
  });

  // Source prescription for Renew (copy) / Update (revise) — prefill fields + items.
  const source = useQuery({
    queryKey: ['prescription', sourceRxId],
    enabled: !!sourceRxId,
    queryFn: () => api.get<{ prescription: Prescription }>(`/api/prescriptions/${sourceRxId}`),
  });

  useEffect(() => {
    if (patientParam) setPatientId(patientParam);
  }, [patientParam]);

  useEffect(() => {
    if (source.data && drugs.data) {
      const rx = source.data.prescription;
      // doctorFullName + doctorLicenseId are intentionally NOT copied from the
      // source — they are re-bound to the current (logged-in) doctor on submit.
      setHospitalName(rx.hospitalName ?? '');
      setDoctorContactNumber(rx.doctorContactNumber ?? '');
      setDrugAllergies(rx.drugAllergies ?? '');
      setMedicationInstructions(rx.medicationInstructions ?? '');
      setElectronicSignature(rx.electronicSignature ?? '');
      setItems(
        rx.items.length
          ? rx.items.map((it) => ({ drug: drugById(it.drugId) ?? null, dose: it.dose, amount: it.amount }))
          : [{ drug: null, dose: '', amount: 1 }],
      );
    }
  }, [source.data, drugs.data]);

  const create = useMutation({
    mutationFn: (body: unknown) => {
      if (isRevise && reviseParam) {
        return api.post<{ prescription: Prescription }>(`/api/prescriptions/${reviseParam}/revise`, body);
      }
      return api.post<{ prescription: Prescription }>('/api/prescriptions', body);
    },
    onSuccess: (res) => setCreated(res.prescription),
  });

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const onSubmit = () => {
    setError(null);
    const base = {
      // Prescriber identity is forced from the authenticated doctor (also re-derived
      // server-side), so it cannot be edited or spoofed from the client.
      doctorFullName: user?.fullName ?? '',
      doctorLicenseId: user?.doctorId ?? undefined,
      hospitalName,
      doctorContactNumber: doctorContactNumber || undefined,
      drugAllergies: drugAllergies || undefined,
      medicationInstructions: medicationInstructions || undefined,
      electronicSignature: electronicSignature || undefined,
      items: items
        .filter((it) => it.drug)
        .map((it) => ({ drugId: it.drug!.id, dose: it.dose, amount: it.amount })),
    };
    // patientId is included for create; the revise endpoint ignores it (keeps original patient).
    const payload = { ...base, patientId };
    const parsed = prescriptionCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'validation_failed');
      return;
    }
    create.mutate(parsed.data);
  };

  const input = 'mt-1 w-full rounded border px-3 py-2';
  const label = 'block text-sm';

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold">{t('writePrescription')}</h2>
      {sourceRxId && (
        <p className="mb-4 text-sm text-slate-500">
          {isRevise ? t('updating') : t('renewing')}: {source.data?.prescription.prescriptionCode ?? sourceRxId}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className={label}>{t('patients')}</label>
            {patientParam ? (
              <input
                value={
                  lockedPatient.data
                    ? `${lockedPatient.data.patient.name} (${lockedPatient.data.patient.patientId})`
                    : patientId
                }
                readOnly
                className={`${input} bg-slate-100`}
              />
            ) : (
              <PatientAutocomplete onSelect={(p) => setPatientId(p.id)} placeholder={t('searchPatientPlaceholder')} />
            )}
          </div>
          <div>
            <label className={label}>{t('doctorName')}</label>
            <input value={user?.fullName ?? ''} readOnly disabled className={`${input} bg-slate-100`} />
          </div>
          <div>
            <label className={label}>{t('doctorId')}</label>
            <input value={user?.doctorId ?? ''} readOnly disabled className={`${input} bg-slate-100`} />
          </div>
          <div>
            <label className={label}>{t('hospitalName')}</label>
            <input value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>{t('doctorContact')}</label>
            <input value={doctorContactNumber} onChange={(e) => setDoctorContactNumber(e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>{t('drugAllergies')}</label>
            <input value={drugAllergies} onChange={(e) => setDrugAllergies(e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>{t('medicationInstructions')}</label>
            <input value={medicationInstructions} onChange={(e) => setMedicationInstructions(e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>{t('signature')}</label>
            <input value={electronicSignature} onChange={(e) => setElectronicSignature(e.target.value)} className={input} />
          </div>
        </div>

        <div className="space-y-3">
          <label className={label}>{t('drug')}</label>
          {items.map((it, i) => (
            <div key={i} className="space-y-2 rounded border p-3">
              <DrugAutocomplete onSelect={(d) => updateItem(i, { drug: d })} />
              <div className="flex gap-2">
                <input
                  placeholder={t('dose')}
                  value={it.dose}
                  onChange={(e) => updateItem(i, { dose: e.target.value })}
                  className="w-1/2 rounded border px-2 py-1"
                />
                <input
                  type="number"
                  placeholder={t('amount')}
                  value={it.amount}
                  onChange={(e) => updateItem(i, { amount: Number(e.target.value) })}
                  className="w-1/2 rounded border px-2 py-1"
                />
              </div>
              {items.length > 1 && (
                <button type="button" className="text-sm text-red-600" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" className="text-sm underline" onClick={() => setItems((p) => [...p, { drug: null, dose: '', amount: 1 }])}>
            + {t('addItem')}
          </button>
          <button type="button" onClick={onSubmit} className="w-full rounded bg-slate-900 px-3 py-2 text-white">
            {t('submit')}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {create.isError && <p className="text-sm text-red-600">{(create.error as Error).message}</p>}
        </div>
      </div>

      {created && (
        <div className="mt-8">
          <button onClick={() => window.print()} className="mb-2 rounded border px-3 py-1 text-sm">
            {t('print')}
          </button>
          <PrescriptionPrint prescription={created} />
        </div>
      )}
    </div>
  );
}
