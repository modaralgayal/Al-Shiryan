import { useTranslation } from 'react-i18next';

function Card({ title }: { title: string }) {
  return <div className="rounded-xl border bg-white p-4 shadow-sm">{title}</div>;
}

export default function Home() {
  const { t } = useTranslation();
  return (
    <div>
      <section>
        <h1 className="text-3xl font-bold">{t('heroTitle')}</h1>
        <p className="mt-2 text-slate-600">{t('heroSubtitle')}</p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title={t('cardPressReleases')} />
        <Card title={t('cardGeneralArticles')} />
        <Card title={t('cardMedicalAdviceVideos')} />
      </section>

      <section className="mt-10 space-y-4 border-t pt-6">
        <h2 className="text-xl font-semibold">{t('learnMore')}</h2>
        <h2 className="text-xl font-semibold">{t('research')}</h2>
      </section>
    </div>
  );
}
