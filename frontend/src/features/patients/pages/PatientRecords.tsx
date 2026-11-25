import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { patientCreateSchema, type PatientCreate, type Role } from '@aorta-iq/shared';
import { api } from '../../../shared/lib/api';
import { useAuth } from '../../../shared/lib/useAuth';

export default function PatientRecords() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PatientCreate>({
    resolver: zodResolver(patientCreateSchema),
  });

  const list = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<{ patients: Record<string, unknown>[] }>('/api/patients'),
  });

  const create = useMutation({
    mutationFn: (data: PatientCreate) => api.post('/api/patients', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      reset();
    },
  });

  const onSubmit = (data: PatientCreate) => create.mutate(data);

  const field = (label: string, name: keyof PatientCreate, type = 'text', opts = {}) => (
    <div>
      <label className="block text-sm">{t(label)}</label>
      <input
        type={type}
        {...register(name, type === 'number' ? { valueAsNumber: true } : opts)}
        className="mt-1 w-full rounded border px-3 py-2"
      />
      {errors[name] && <p className="text-sm text-red-600">{(errors[name] as { message?: string })?.message}</p>}
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h2 className="mb-4 text-xl font-semibold">{t('newPatient')}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {field('name', 'name')}
          {field('patientId', 'patientId')}
          {field('age', 'age', 'number')}
          {field('gender', 'gender')}
          {field('dateOfBirth', 'dateOfBirth')}
          {field('idNumber', 'idNumber')}
          {field('weightKg', 'weightKg', 'number')}
          {field('phone', 'phone')}
          {field('emergencyContact', 'emergencyContact')}
          <button
            disabled={isSubmitting}
            className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
          >
            {t('submit')}
          </button>
          {create.isError && <p className="text-sm text-red-600">{(create.error as Error).message}</p>}
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">{t('patients')}</h2>
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
            {(list.data?.patients ?? []).map((p, i) => (
              <tr key={(p.id as string) ?? i} className="border-b">
                <td className="py-2">{(p.name as string) ?? '—'}</td>
                <td>{(p.patientId as string) ?? '—'}</td>
                <td>{(p.age as number)?.toString() ?? '—'}</td>
                <td>{(p.gender as string) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {user?.role !== ('doctor' as Role) && user?.role !== ('admin' as Role) && (
          <p className="mt-2 text-sm text-red-600">{t('noAccess')}</p>
        )}
      </section>
    </div>
  );
}
