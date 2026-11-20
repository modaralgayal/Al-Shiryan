import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type Form = z.infer<typeof schema>;

export default function Register() {
  const { t } = useTranslation();
  const { register: doRegister } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get('token') ?? '';
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setError(null);
    try {
      if (!inviteToken) throw new Error('Missing invite token');
      if (!firebaseAuth) throw new Error('auth_unavailable');
      const cred = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password);
      const idToken = await cred.user.getIdToken();
      await doRegister(idToken, inviteToken);
      navigate('/');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!inviteToken) {
    return <p className="mt-10 text-center text-red-600">{t('invalidInvite')}</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto mt-10 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">{t('register')}</h1>
      <input
        {...register('email')}
        placeholder={t('email')}
        className="w-full rounded border px-3 py-2"
      />
      {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      <input
        type="password"
        {...register('password')}
        placeholder={t('password')}
        className="w-full rounded border px-3 py-2"
      />
      {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
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
