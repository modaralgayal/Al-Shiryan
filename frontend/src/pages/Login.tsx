import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/useAuth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type Form = z.infer<typeof schema>;

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try {
      await login(data.email, data.password);
      const to = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';
      navigate(to);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto mt-10 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">{t('login')}</h1>
      <div>
        <label className="block text-sm">{t('email')}</label>
        <input {...register('email')} className="mt-1 w-full rounded border px-3 py-2" />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-sm">{t('password')}</label>
        <input
          type="password"
          {...register('password')}
          className="mt-1 w-full rounded border px-3 py-2"
        />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>
      <button
        disabled={isSubmitting}
        className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
      >
        {t('login')}
      </button>
    </form>
  );
}
