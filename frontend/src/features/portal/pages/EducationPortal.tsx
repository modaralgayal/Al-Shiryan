import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LIBRARY_BOOKS, LIBRARY_READER_ROLES, libraryCover, type LibraryBook } from '@aorta-iq/shared';
import { useAuth } from '../../../shared/lib/useAuth';
import { api } from '../../../shared/lib/api';

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z" />
    </svg>
  );
}

function BookCard({ book, canRead }: { book: LibraryBook; canRead: boolean }) {
  const { t } = useTranslation();
  const [state, setState] = useState<'idle' | 'opening' | 'error'>('idle');

  async function open() {
    // Open the tab synchronously (inside the click) so popup blockers allow it.
    const tab = window.open('', '_blank');
    setState('opening');
    try {
      const { url } = await api.get<{ url: string }>(`/api/library/${book.id}/read`);
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setState('idle');
    } catch {
      tab?.close();
      setState('error');
    }
  }

  const body = (
    <>
      <div className="aspect-[3/4] w-full overflow-hidden bg-slate-100">
        <img
          src={libraryCover(book.id)}
          alt=""
          loading="lazy"
          className={`h-full w-full object-cover ${canRead ? '' : 'opacity-90'}`}
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="text-sm text-blue-900">{t('textbook')}</span>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-blue-950" dir="ltr">
          {book.title}
        </h2>
        <div className="mt-auto pt-4">
          {canRead ? (
            <span className="font-medium text-blue-700">
              {state === 'opening' ? t('openingBook') : t('readBook')}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-slate-500">
              <LockIcon />
              {t('bookLocked')}
            </span>
          )}
          {state === 'error' && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {t('bookOpenFailed')}
            </p>
          )}
        </div>
      </div>
    </>
  );

  const cls = 'flex h-full flex-col overflow-hidden rounded bg-white text-start shadow-sm';
  return canRead ? (
    <button type="button" onClick={open} disabled={state === 'opening'} className={`${cls} hover:shadow-md`}>
      {body}
    </button>
  ) : (
    <Link to="/login" className={cls}>
      {body}
    </Link>
  );
}

export default function EducationPortal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canRead = !!user && (LIBRARY_READER_ROLES as readonly string[]).includes(user.role);

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('educationPortal')}</h1>
      <p className="mt-2 text-slate-500">{t('educationSubtitle')}</p>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {LIBRARY_BOOKS.map((b) => (
          <BookCard key={b.id} book={b} canRead={canRead} />
        ))}
      </div>
    </div>
  );
}
