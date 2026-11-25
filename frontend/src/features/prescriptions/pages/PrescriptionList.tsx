import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Prescription, Drug } from '@aorta-iq/shared';
import { api } from '../../../shared/lib/api';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-700">{value}</dd>
    </div>
  );
}

export default function PrescriptionList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState<string | null>(null);

  const rxs = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => api.get<{ prescriptions: Prescription[] }>('/api/prescriptions'),
  });
  const patients = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<{ patients: { id: string; name: string }[] }>('/api/patients'),
  });
  // Empty q returns the full seeded list (server caps at 20); enough to resolve names.
  const drugs = useQuery({
    queryKey: ['drugs', ''],
    queryFn: () => api.get<{ drugs: Drug[] }>('/api/drugs?q='),
  });

  const patientName = (id: string) =>
    patients.data?.patients.find((p) => p.id === id)?.name ?? id;
  const drugName = (id: string) => drugs.data?.drugs.find((d) => d.id === id)?.name ?? id;

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{t('prescriptions')}</h2>
      <div className="space-y-3">
        {(rxs.data?.prescriptions ?? []).map((rx) => {
          const isOpen = open === rx.id;
          return (
            <div
              key={rx.id}
              role="button"
              tabIndex={0}
              onClick={() => setOpen(isOpen ? null : rx.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpen(isOpen ? null : rx.id);
                }
              }}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{rx.prescriptionCode ?? rx.id}</p>
                  <p className="text-sm text-slate-500">
                    {patientName(rx.patientId)} · {rx.doctorFullName ?? '—'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[rx.status] ?? 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {rx.status}
                  </span>
                  <span className="text-sm text-slate-400">{new Date(rx.issuedAt).toLocaleDateString()}</span>
                  <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    {rx.hospitalName && <Detail label={t('hospitalName')} value={rx.hospitalName} />}
                    {rx.doctorContactNumber && <Detail label={t('doctorContact')} value={rx.doctorContactNumber} />}
                    {rx.drugAllergies && <Detail label={t('drugAllergies')} value={rx.drugAllergies} />}
                    {rx.medicationInstructions && (
                      <Detail label={t('medicationInstructions')} value={rx.medicationInstructions} />
                    )}
                    {rx.notes && <Detail label={t('notes')} value={rx.notes} />}
                    <Detail
                      label={t('signature')}
                      value={rx.electronicSignature ? `✓ ${t('signed')}` : t('notSigned')}
                    />
                  </dl>

                  <h4 className="mb-2 mt-4 text-sm font-semibold">{t('drug')}</h4>
                  <ul className="divide-y divide-slate-100 rounded border border-slate-100">
                    {rx.items.map((it) => (
                      <li key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>
                          <span className="font-medium">{drugName(it.drugId)}</span>
                          {' · '}
                          {it.dose} ×{it.amount}
                        </span>
                        <span className="text-slate-500">{it.status}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/prescriptions/new?patient=${rx.patientId}&copy=${rx.id}`);
                      }}
                      className="rounded border px-3 py-1 text-sm"
                    >
                      {t('renew')}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/prescriptions/new?revise=${rx.id}&patient=${rx.patientId}`);
                      }}
                      className="rounded border px-3 py-1 text-sm"
                    >
                      {t('updateRx')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {rxs.isError && <p className="text-sm text-red-600">{(rxs.error as Error).message}</p>}
    </div>
  );
}
