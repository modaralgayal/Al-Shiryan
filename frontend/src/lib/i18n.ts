import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      home: 'Home',
      portals: 'Portals',
      journals: 'Journals',
      medicalLibrary: 'Medical Library',
      authorities: 'Authorities',
      events: 'Events',
      login: 'Login',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      register: 'Create account',
      brand: 'AORTAIQ',
      heroTitle: 'AORTAIQ',
      heroSubtitle:
        'Medical portal — press releases, general articles, and medical advice videos.',
      cardPressReleases: 'Press Releases',
      cardGeneralArticles: 'General Articles',
      cardMedicalAdviceVideos: 'Medical Advice Videos',
      learnMore: 'LEARN MORE ABOUT HOW AORTAIQ IS MAKING A DIFFERENCE',
      research: 'RESEARCH',
      portalSubtitle: 'Content for this section will be provided by the client.',
      invalidInvite: 'Invalid or missing invite link.',
    },
  },
  ar: {
    translation: {
      home: 'الرئيسية',
      portals: 'البوابات',
      journals: 'المجلات',
      medicalLibrary: 'المكتبة الطبية',
      authorities: 'الجهات',
      events: 'الفعاليات',
      login: 'تسجيل الدخول',
      logout: 'تسجيل الخروج',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      register: 'إنشاء حساب',
      brand: 'AORTAIQ',
      heroTitle: 'AORTAIQ',
      heroSubtitle: 'البوابة الطبية — البيانات الصحفية والمقالات العامة ومقاطع النصائح الطبية.',
      cardPressReleases: 'البيانات الصحفية',
      cardGeneralArticles: 'المقالات العامة',
      cardMedicalAdviceVideos: 'مقاطع النصائح الطبية',
      learnMore: 'تعرف على المزيد حول كيف يحدث AORTAIQ فرقاً',
      research: 'الأبحاث',
      portalSubtitle: 'سيتم توفير محتوى هذا القسم من قبل العميل.',
      invalidInvite: 'رابط الدعوة غير صالح أو مفقود.',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
