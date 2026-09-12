import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import hi from './hi.json';
import gu from './gu.json';
import mr from './mr.json';
import bn from './bn.json';
import te from './te.json';
import ta from './ta.json';
import kn from './kn.json';
import ml from './ml.json';
import pa from './pa.json';
import or from './or.json';
import as from './as.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'All India' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'North / Central India' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'Gujarat' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'Maharashtra' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'West Bengal / East India' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'Andhra Pradesh / Telangana' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'Tamil Nadu' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'Karnataka' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'Kerala' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'Punjab / North' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'Odisha' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', region: 'Assam / North East' },
];

const savedLang = localStorage.getItem('agrishield_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      gu: { translation: gu },
      mr: { translation: mr },
      bn: { translation: bn },
      te: { translation: te },
      ta: { translation: ta },
      kn: { translation: kn },
      ml: { translation: ml },
      pa: { translation: pa },
      or: { translation: or },
      as: { translation: as },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
