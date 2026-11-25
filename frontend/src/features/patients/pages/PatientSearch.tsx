import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Prescription, Drug } from '@aorta-iq/shared';
import { api } from '../../../shared/lib/api';
import { useAuth } from '../../../shared/lib/useAuth';
import type { PatientOption } from '../../../shared/components/PatientAutocomplete';

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

export default function PatientSearch() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<PatientOption | null>(null);
  // Accordion: only one prescription expanded at a time.
  const [openRxId, setOpenRxId] = useState<string | null>(null);

  // Load the full patient list once; filter client-side as the doctor types.
  const all = useQuery({
    queryKey: ['all-patients'],
    queryFn: () => api.get<{ patients: PatientOption[] }>('/api/patients'),
  });

  const rxs = useQuery({
    queryKey: ['patient-prescriptions', selected?.id],
    enabled: !!selected,
    queryFn: () => api.get<{ prescriptions: Prescription[] }>(`/api/prescriptions?patientId=${selected!.id}`),
  });

  const drugs = useQuery({
    queryKey: ['drugs', ''],
    queryFn: () => api.get<{ drugs: Drug[] }>('/api/drugs?q='),
  });
  const drugName = (id: string) => drugs.data?.drugs.find((d) => d.id === id)?.name ?? id;

  const term = q.trim().toLowerCase();
  const filtered = (all.data?.patients ?? []).filter(
    (p) => !term || p.name.toLowerCase().includes(term) || (p.patientId ?? '').toLowerCase().includes(term),
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t('findPatient')}</h2>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('searchPatientPlaceholder')}
        className="w-full max-w-md rounded border px-3 py-2"
      />

      <div className="space-y-2">
        {(all.isLoading
          ? []
          : filtered
        ).map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelected(p);
              setOpenRxId(null);
            }}
            className={`flex w-full max-w-md items-center justify-between rounded border px-4 py-2 text-left shadow-sm transition hover:border-slate-300 ${
              selected?.id === p.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
            }`}
          >
            <span>
              <span className="font-medium">{p.name}</span>{' '}
              <span className="text-sm text-slate-500">({p.patientId})</span>
            </span>
            <span className="text-sm text-slate-400">{t('selectPatient')} →</span>
          </button>
        ))}
        {all.isError && <p className="text-sm text-red-600">{(all.error as Error).message}</p>}
        {!all.isLoading && filtered.length === 0 && (
          <p className="text-sm text-slate-500">{t('noPatientSelected')}</p>
        )}
      </div>

      {selected && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{selected.name}</p>
              <p className="text-sm text-slate-500">
                {selected.patientId} · {selected.age} · {selected.gender}
              </p>
            </div>
            {!isAdmin && (
              <button
                onClick={() => navigate(`/prescriptions/new?patient=${selected.id}`)}
                className="rounded bg-slate-900 px-3 py-2 text-white"
              >
                + {t('newPrescription')}
              </button>
            )}
          </div>

          <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {t('patientPrescriptions')}
          </h3>

          <div className="space-y-3">
            {(rxs.data?.prescriptions ?? []).map((rx) => {
              const isOpen = openRxId === rx.id;

              // Admins get an oversight-only card: issuing doctor (name + ID),
              // patient (name + ID) and status. No expansion, no clinical detail,
              // no Renew/Update (those are prescriber actions).
              if (isAdmin) {
                return (
                  <div key={rx.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{rx.prescriptionCode ?? rx.id}</p>
                        <p className="text-sm text-slate-500">
                          {t('patients')}: {selected.name} ({selected.patientId})
                        </p>
                        <p className="text-sm text-slate-500">
                          {t('doctorName')}: {rx.doctorFullName ?? '—'}
                          {rx.doctorLicenseId ? ` · ${t('doctorId')}: ${rx.doctorLicenseId}` : ''}
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
                        <span className="text-sm text-slate-400">
                          {new Date(rx.issuedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={rx.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenRxId(isOpen ? null : rx.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpenRxId(isOpen ? null : rx.id);
                      }
                    }}
                    className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{rx.prescriptionCode ?? rx.id}</p>
                      <p className="text-sm text-slate-500">{rx.doctorFullName ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[rx.status] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {rx.status}
                      </span>
                      <span className="text-sm text-slate-400">
                        {new Date(rx.issuedAt).toLocaleDateString()}
                      </span>
                      <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100 p-4">
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
                            navigate(`/prescriptions/new?patient=${selected.id}&copy=${rx.id}`);
                          }}
                          className="rounded border px-3 py-1 text-sm"
                        >
                          {t('renew')}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/prescriptions/new?revise=${rx.id}&patient=${selected.id}`);
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
            {rxs.data && rxs.data.prescriptions.length === 0 && (
              <p className="text-sm text-slate-500">{t('noPrescriptions')}</p>
            )}
            {rxs.isError && <p className="text-sm text-red-600">{(rxs.error as Error).message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
