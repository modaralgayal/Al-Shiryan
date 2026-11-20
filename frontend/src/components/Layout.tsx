import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/useAuth';
import { LanguageToggle } from './LanguageToggle';

const NAV = [
  { to: '/portals', key: 'portals' },
  { to: '/journals', key: 'journals' },
  { to: '/medical-library', key: 'medicalLibrary' },
  { to: '/authorities', key: 'authorities' },
  { to: '/events', key: 'events' },
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Drive the document direction + language so the ENTIRE page (text alignment,
  // scrollbars, form controls, flex/grid flow) flips for Arabic — not just the header.
  useEffect(() => {
    document.documentElement.setAttribute('dir', i18n.dir());
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="font-bold">
            {t('brand')}
          </Link>
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm hover:underline">
              {t(n.key)}
            </Link>
          ))}
          {/* ms-auto = margin-inline-end auto: pushes the group to the end in both LTR and RTL */}
          <div className="ms-auto flex items-center gap-3">
            <LanguageToggle />
            {user ? (
              <button
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="text-sm"
              >
                {t('logout')}
              </button>
            ) : (
              <Link to="/login" className="text-sm hover:underline">
                {t('login')}
              </Link>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
