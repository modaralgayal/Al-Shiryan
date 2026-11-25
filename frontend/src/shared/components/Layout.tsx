import { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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

// Role-gated app links (only shown to authenticated users with the right role).
const APP_NAV = [
  { to: '/patients', key: 'patients', roles: ['doctor', 'admin'] as const },
  { to: '/patient-prescriptions', key: 'findPatient', roles: ['doctor', 'admin'] as const },
  { to: '/prescriptions/new', key: 'writePrescription', roles: ['doctor'] as const },
  { to: '/fulfill', key: 'fulfill', roles: ['pharmacist'] as const },
  { to: '/admin', key: 'adminPanel', roles: ['admin'] as const },
];

export function Layout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = (to: string) => pathname === to || (to !== '/' && pathname.startsWith(to + '/'));

  // Drive the document direction + language so the ENTIRE page (text alignment,
  // scrollbars, form controls, flex/grid flow) flips for Arabic — not just the header.
  useEffect(() => {
    document.documentElement.setAttribute('dir', i18n.dir());
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  const appLinks = user ? APP_NAV.filter((n) => (n.roles as readonly string[]).includes(user.role)) : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="font-bold">
            {t('brand')}
          </Link>
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`rounded px-2 py-1 text-sm transition ${
                isActive(n.to)
                  ? 'bg-slate-900 font-semibold text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t(n.key)}
            </Link>
          ))}
          {appLinks.length > 0 && (
            <>
              <span className="mx-1 text-slate-300">|</span>
              {appLinks.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded px-2 py-1 text-sm transition ${
                    isActive(n.to)
                      ? 'bg-slate-900 font-semibold text-white'
                      : 'font-medium text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t(n.key)}
                </Link>
              ))}
            </>
          )}
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
