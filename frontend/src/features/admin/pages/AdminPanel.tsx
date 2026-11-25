import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Role } from '@aorta-iq/shared';
import { api } from '../../../shared/lib/api';
import { useAuth } from '../../../shared/lib/useAuth';

export default function AdminPanel() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('doctor');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const accounts = useQuery({
    queryKey: ['admin-accounts'],
    queryFn: () => api.get<{ accounts: { id: string; email: string; role: string; status: string }[] }>('/api/admin/accounts'),
  });
  const patients = useQuery({
    queryKey: ['admin-patients'],
    queryFn: () => api.get<{ patients: { id: string; patientId: string; name: string; age: number; gender: string }[] }>('/api/admin/patients'),
  });
  const rxs = useQuery({
    queryKey: ['admin-prescriptions'],
    queryFn: () =>
      api.get<{
        prescriptions: {
          id: string;
          prescriptionCode: string | null;
          patientId: string;
          doctorFullName: string | null;
          status: string;
          issuedAt: string;
        }[];
      }>('/api/admin/prescriptions'),
  });
  const patientName = (id: string) => patients.data?.patients.find((p) => p.id === id)?.name ?? id;

  const invite = useMutation({
    mutationFn: () => api.post<{ token: string; inviteLink: string }>('/api/admin/invites', { email, role }),
    onSuccess: (data) => {
      setEmail('');
      setInviteLink(data.inviteLink);
      setCopied(false);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>(`/api/admin/accounts/${id}`),
    onSuccess: () => {
      setConfirmingId(null);
      qc.invalidateQueries({ queryKey: ['admin-accounts'] });
    },
  });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-xl font-semibold">{t('invite')}</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm">{t('inviteRole')}</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded border px-3 py-2">
              <option value="doctor">Doctor</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm">{t('email')}</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded border px-3 py-2" />
          </div>
          <button
            onClick={() => {
              setInviteLink(null);
              invite.mutate();
            }}
            className="rounded bg-slate-900 px-3 py-2 text-white"
          >
            {t('invite')}
          </button>
        </div>
        {invite.isError && <p className="text-sm text-red-600">{(invite.error as Error).message}</p>}
        {inviteLink && (
          <div className="mt-3 rounded border bg-slate-50 p-3">
            <p className="mb-1 text-sm font-medium">{t('inviteLink')}</p>
            <p className="mb-2 text-xs text-slate-500">{t('inviteManualNote')}</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteLink}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded border bg-white px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(inviteLink).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
                className="shrink-0 rounded bg-slate-900 px-3 py-1 text-white"
              >
                {copied ? t('copied') : t('copyLink')}
              </button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">{t('accounts')}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">{t('email')}</th>
              <th>{t('inviteRole')}</th>
              <th>{t('status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(accounts.data?.accounts ?? []).map((a) => {
              const isSelf = a.id === user?.id;
              const confirming = confirmingId === a.id;
              return (
                <tr key={a.id} className="border-b">
                  <td className="py-2">{a.email}</td>
                  <td>{a.role}</td>
                  <td>{a.status}</td>
                  <td className="text-right">
                    {isSelf ? (
                      <span className="text-xs text-slate-400">{t('cannotDeleteSelf')}</span>
                    ) : confirming ? (
                      <span className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => del.mutate(a.id)}
                          className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                        >
                          {t('confirmDelete')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          {t('cancel')}
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(a.id)}
                        className="rounded border px-2 py-1 text-xs text-red-600"
                      >
                        {t('delete')}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {del.isError && <p className="mt-2 text-sm text-red-600">{(del.error as Error).message}</p>}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">{t('prescriptions')}</h2>
        <p className="mb-3 text-sm text-slate-500">{t('adminLimitedView')}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">{t('prescriptionCode')}</th>
              <th>{t('patients')}</th>
              <th>{t('doctorName')}</th>
              <th>{t('status')}</th>
              <th>{t('issued')}</th>
            </tr>
          </thead>
          <tbody>
            {(rxs.data?.prescriptions ?? []).map((rx) => (
              <tr key={rx.id} className="border-b">
                <td className="py-2">{rx.prescriptionCode ?? rx.id}</td>
                <td>{patientName(rx.patientId)}</td>
                <td>{rx.doctorFullName ?? '—'}</td>
                <td>{rx.status}</td>
                <td>{new Date(rx.issuedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rxs.data && rxs.data.prescriptions.length === 0 && (
          <p className="mt-2 text-sm text-slate-500">{t('noPrescriptions')}</p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">{t('patients')} ({t('adminPanel')})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">{t('name')}</th>
              <th>{t('patientId')}</th>
              <th>{t('age')}</th>
              <th>{t('gender')}</th>
            </tr>
          </thead>
          <tbody>
            {(patients.data?.patients ?? []).map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.name}</td>
                <td>{p.patientId}</td>
                <td>{p.age}</td>
                <td>{p.gender}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
