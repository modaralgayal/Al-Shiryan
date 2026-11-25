import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseAuth } from '../../../shared/lib/firebase';
import { useAuth } from '../../../shared/lib/useAuth';
import { PasswordInput } from '../../../shared/components/PasswordInput';
import { api } from '../../../shared/lib/api';
import type { Role } from '@aorta-iq/shared';

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6, 'passwordMin'),
    confirmPassword: z.string().min(6, 'passwordMin'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'passwordMismatch',
    path: ['confirmPassword'],
  });
type Form = z.infer<typeof schema>;

export default function Register() {
  const { t } = useTranslation();
  const { register: doRegister } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get('token') ?? '';
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [pharmacistId, setPharmacistId] = useState('');
  const [fieldErr, setFieldErr] = useState<{ name?: string; id?: string }>({});

  useEffect(() => {
    if (!inviteToken) return;
    api
      .get<{ role: Role; email: string | null }>(`/api/auth/invite/${inviteToken}`)
      .then((r) => setRole(r.role))
      .catch(() => setLoadError('invalidInvite'));
  }, [inviteToken]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setError(null);
    setFieldErr({});
    const e: { name?: string; id?: string } = {};
    if (!fullName.trim()) e.name = `${t('fullName')} — ${t('fieldRequired')}`;
    if (role === 'doctor' && !doctorId.trim()) e.id = `${t('doctorId')} — ${t('fieldRequired')}`;
    if (role === 'pharmacist' && !pharmacistId.trim()) e.id = `${t('pharmacistId')} — ${t('fieldRequired')}`;
    if (Object.keys(e).length) {
      setFieldErr(e);
      return;
    }
    try {
      if (!firebaseAuth) throw new Error('auth_unavailable');
      const cred = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password);
      const idToken = await cred.user.getIdToken();
      await doRegister(idToken, inviteToken, {
        fullName: fullName.trim(),
        doctorId: role === 'doctor' ? doctorId.trim() : undefined,
        pharmacistId: role === 'pharmacist' ? pharmacistId.trim() : undefined,
      });
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!inviteToken || loadError) {
    return <p className="mt-10 text-center text-red-600">{t('invalidInvite')}</p>;
  }

  const input = 'w-full rounded border px-3 py-2';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto mt-10 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">{t('register')}</h1>
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder={t('fullName')}
        className={`${input} ${fieldErr.name ? 'border-red-500' : ''}`}
      />
      {fieldErr.name && <p className="text-sm text-red-600">{fieldErr.name}</p>}

      {role === 'doctor' && (
        <div>
          <input
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            placeholder={t('doctorId')}
            className={`${input} ${fieldErr.id ? 'border-red-500' : ''}`}
          />
          {fieldErr.id && <p className="text-sm text-red-600">{fieldErr.id}</p>}
        </div>
      )}
      {role === 'pharmacist' && (
        <div>
          <input
            value={pharmacistId}
            onChange={(e) => setPharmacistId(e.target.value)}
            placeholder={t('pharmacistId')}
            className={`${input} ${fieldErr.id ? 'border-red-500' : ''}`}
          />
          {fieldErr.id && <p className="text-sm text-red-600">{fieldErr.id}</p>}
        </div>
      )}

      <input {...register('email')} placeholder={t('email')} className={input} />
      {errors.email && <p className="text-sm text-red-600">{t(errors.email.message ?? '')}</p>}
      <PasswordInput
        label={t('password')}
        placeholder={t('password')}
        registration={register('password')}
        error={errors.password ? t(errors.password.message ?? '') : undefined}
      />
      <PasswordInput
        label={t('confirmPassword')}
        placeholder={t('confirmPassword')}
        registration={register('confirmPassword')}
        error={errors.confirmPassword ? t(errors.confirmPassword.message ?? '') : undefined}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={isSubmitting}
        className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
      >
        {t('register')}
      </button>
    </form>
  );
}
