import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function PortalPage({
  titleKey,
  children,
}: {
  titleKey: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
      {!children && <p className="mt-2 text-slate-500">{t('portalSubtitle')}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}
