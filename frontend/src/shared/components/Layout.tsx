import { useEffect, useState } from 'react';
import { NAV_MENUS } from '../lib/navMenus';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/useAuth';
import { LanguageToggle } from './LanguageToggle';

const NAV = [
  { to: '/portals', key: 'portals' },
  { to: '/journals', key: 'journals', menu: 'journals' },
  { to: '/education-portal', key: 'educationPortal' },
  { to: '/authorities', key: 'authorities', menu: 'authorities' },
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

  // Which header dropdown (if any) is open. Closes on navigation and on Escape.
  const [openMenu, setOpenMenu] = useState<'journals' | 'authorities' | null>(null);
  useEffect(() => setOpenMenu(null), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenMenu(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Drive the document direction + language so the ENTIRE page (text alignment,
  // scrollbars, form controls, flex/grid flow) flips for Arabic — not just the header.
  useEffect(() => {
    document.documentElement.setAttribute('dir', i18n.dir());
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  const appLinks = user ? APP_NAV.filter((n) => (n.roles as readonly string[]).includes(user.role)) : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="relative border-b bg-white" onMouseLeave={() => setOpenMenu(null)}>
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/" className="font-bold">
            {t('brand')}
          </Link>
          {NAV.map((n) => {
            const menu = 'menu' in n ? n.menu : undefined;
            if (!menu) {
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onMouseEnter={() => setOpenMenu(null)}
                  className={`rounded px-2 py-1 text-sm transition ${
                    isActive(n.to)
                      ? 'bg-slate-900 font-semibold text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t(n.key)}
                </Link>
              );
            }
            const open = openMenu === menu;
            return (
              <button
                key={n.to}
                type="button"
                aria-expanded={open}
                aria-controls={`menu-${menu}`}
                onMouseEnter={() => setOpenMenu(menu)}
                onClick={() => setOpenMenu(open ? null : menu)}
                className={`flex items-center gap-1 rounded px-2 py-1 text-sm transition ${
                  open ? 'bg-[#2b6ff0] font-semibold text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t(n.key)}
                <svg viewBox="0 0 20 20" className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="m5 8 5 5 5-5" />
                </svg>
              </button>
            );
          })}
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
        {openMenu && (
          <div id={`menu-${openMenu}`} className="absolute inset-x-0 top-full z-20 bg-[#2b6ff0] text-white shadow-lg">
            <ul className="mx-auto max-w-6xl columns-1 gap-12 px-4 py-8 sm:columns-2 lg:columns-3">
              {NAV_MENUS[openMenu].map((l) => (
                <li key={l.href} className="break-inside-avoid">
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="block border-b border-white/80 py-3 text-start font-semibold hover:opacity-80"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
