import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Prescription } from '@aorta-iq/shared';
import { api } from '../../../shared/lib/api';
import { useAuth } from '../../../shared/lib/useAuth';

export default function PharmacistFulfillment() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const list = useQuery({
    queryKey: ['fulfill'],
    queryFn: () => api.get<{ prescriptions: Prescription[] }>('/api/pharmacist/prescriptions'),
  });

  const dispense = useMutation({
    mutationFn: (vars: { id: string; itemIds: string[] }) =>
      api.post(`/api/pharmacist/prescriptions/${vars.id}/dispense`, { pharmacistId: user!.id, itemIds: vars.itemIds }),
    onSuccess: () => {
      setSelected({});
      qc.invalidateQueries({ queryKey: ['fulfill'] });
    },
  });

  const rxs = list.data?.prescriptions ?? [];

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{t('fulfill')}</h2>
      <div className="mb-4 rounded bg-slate-100 p-3 text-sm">
        {t('signedInAs')}: <span className="font-semibold">{user?.fullName}</span>
        {user?.pharmacistId && (
          <>
            {' · '}
            {t('pharmacistId')}: <span className="font-semibold">{user.pharmacistId}</span>
          </>
        )}
      </div>
      {rxs.length === 0 && <p className="text-slate-500">{t('portalSubtitle')}</p>}
      <div className="space-y-4">
        {rxs.map((rx) => {
          const pending = rx.items.filter((it) => it.status === 'pending');
          const chosen = pending.filter((it) => selected[it.id]);
          return (
            <div key={rx.id} className="rounded border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{t('prescriptionCode')}: {rx.prescriptionCode ?? rx.id}</span>
                <span className="text-sm text-slate-500">{t('status')}: {rx.status}</span>
              </div>
              <ul className="space-y-1 text-sm">
                {pending.map((it) => (
                  <li key={it.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!selected[it.id]}
                      onChange={(e) => setSelected((s) => ({ ...s, [it.id]: e.target.checked }))}
                    />
                    <span>{it.drugId}</span>
                    <span className="text-slate-500">{it.dose} × {it.amount}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled={chosen.length === 0}
                onClick={() => dispense.mutate({ id: rx.id, itemIds: chosen.map((c) => c.id) })}
                className="mt-2 rounded bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                {t('dispenseSelected')} ({chosen.length})
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
