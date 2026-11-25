import { useTranslation } from 'react-i18next';
import type { Prescription } from '@aorta-iq/shared';

/** Print-friendly prescription. `prescription-print` is the only thing visible when printing. */
export function PrescriptionPrint({ prescription }: { prescription: Prescription }) {
  const { t } = useTranslation();
  return (
    <div className="prescription-print mx-auto max-w-2xl border p-6 text-black">
      <h1 className="text-center text-2xl font-bold">{t('brand')}</h1>
      <p className="text-center text-sm">{t('writePrescription')}</p>
      <hr className="my-3" />
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><strong>{t('prescriptionCode')}:</strong> {prescription.prescriptionCode ?? prescription.id}</div>
        <div><strong>{t('status')}:</strong> {prescription.status}</div>
        <div><strong>{t('doctorName')}:</strong> {prescription.doctorFullName ?? '—'}</div>
        <div><strong>{t('hospitalName')}:</strong> {prescription.hospitalName ?? '—'}</div>
        <div><strong>{t('doctorContact')}:</strong> {prescription.doctorContactNumber ?? '—'}</div>
        <div><strong>{t('drugAllergies')}:</strong> {prescription.drugAllergies ?? '—'}</div>
      </div>
      <table className="mt-4 w-full border text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left">{t('drug')}</th>
            <th className="text-left">{t('dose')}</th>
            <th className="text-left">{t('amount')}</th>
            <th className="text-left">{t('status')}</th>
          </tr>
        </thead>
        <tbody>
          {prescription.items.map((it) => (
            <tr key={it.id} className="border-b">
              <td>{it.drugId}</td>
              <td>{it.dose}</td>
              <td>{it.amount}</td>
              <td>{it.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {prescription.medicationInstructions && (
        <p className="mt-3 text-sm"><strong>{t('medicationInstructions')}:</strong> {prescription.medicationInstructions}</p>
      )}
      {prescription.electronicSignature && (
        <p className="mt-3 text-sm"><strong>{t('signature')}:</strong> {prescription.electronicSignature}</p>
      )}
      <p className="mt-4 text-xs">© 2026 Alshiryan Alabhar. All rights reserved.</p>
    </div>
  );
}
