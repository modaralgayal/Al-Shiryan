import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === 'ar' ? 'en' : 'ar';
  return (
    <button
      onClick={() => i18n.changeLanguage(next)}
      className="rounded border px-2 py-1 text-sm"
      aria-label="Toggle language"
    >
      {next === 'ar' ? 'العربية' : 'EN'}
    </button>
  );
}
