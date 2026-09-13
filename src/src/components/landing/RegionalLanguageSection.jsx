import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { Globe, Volume2, Check, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const RegionalLanguageSection = () => {
  const { t } = useTranslation();
  const { currentLang, changeLanguage, languages } = useLanguage();
  const [activePreviewCode, setActivePreviewCode] = useState(currentLang || 'hi');

  const REGIONAL_SAMPLES = {
    en: {
      native: 'English',
      headline: 'Your crop may be affected by Early Leaf Blight.',
      advice: 'Remove lower infected leaves and spray copper oxychloride.',
      voiceSample: 'Your tomato crop shows signs of early leaf blight. Remove the spotted lower leaves today.',
    },
    hi: {
      native: 'हिन्दी',
      headline: 'आपकी फसल में अगेती झुलसा (पत्ती रोग) हो सकता है।',
      advice: 'प्रभावित निचली पत्तियों को तोड़ें और जैविक नीम या कॉपर दवा का छिड़काव करें।',
      voiceSample: 'आपकी टमाटर की फसल में अगेती झुलसा रोग के लक्षण हैं। प्रभावित पत्तों को तुरंत हटाएं।',
    },
    gu: {
      native: 'ગુજરાતી',
      headline: 'તમારા પાકમાં પાનનો આગોતરો સુકારો રોગ હોઈ શકે છે.',
      advice: 'રોગગ્રસ્ત પાંદડા તોડીને દૂર કરો અને ભલામણ કરેલ લીમડાના તેલનો છંટકાવ કરો.',
      voiceSample: 'તમારા ટામેટાના પાકમાં સુકારો રોગ દેખાય છે. નીચેના બગડેલા પાંદડા તાત્કાલિક દૂર કરો.',
    },
    mr: {
      native: 'मराठी',
      headline: 'आपल्या पिकामध्ये करपा रोगाची लागण असू शकते.',
      advice: 'बाधित पाने तोडून नष्ट करा आणि तांबेयुक्त बुरशीनाशकाची फवारणी करा.',
      voiceSample: 'आपल्या पिकात करपा रोगाची लक्षणे आढळली आहेत. वेळेवर फवारणी करा.',
    },
    bn: {
      native: 'বাংলা',
      headline: 'আপনার ফসলে আর্লি ব্লাইট (পাতা পোড়া) রোগ দেখা দিতে পারে।',
      advice: 'আক্রান্ত পাতা কেটে ফেলুন এবং তামাঘটিত ছত্রাকনাশক স্প্রে করুন।',
      voiceSample: 'ফসলে পাতা পোড়া রোগের লক্ষণ রয়েছে। আক্রান্ত পাতাগুলি অপসারণ করুন।',
    },
    te: {
      native: 'తెలుగు',
      headline: 'మీ పంట ఆకు మాడు తెగులుతో ప్రభావితం కావచ్చు.',
      advice: 'బాధిత ఆకులను తొలగించి కాపర్ శిలీంద్ర సంహారిణిని పిచికారీ చేయండి.',
      voiceSample: 'మీ పంటలో ఆకు మాడు తెగులు ఉంది. వేపనూనె పిచికారీ చేయండి.',
    },
    ta: {
      native: 'தமிழ்',
      headline: 'உங்கள் பயிரில் ஆரம்பக்கால கருகல் நோய் தாக்கியிருக்கலாம்.',
      advice: 'பாதிக்கப்பட்ட இலைகளை அகற்றிவிட்டு பரிந்துரைக்கப்பட்ட மருந்தை தெளிக்கவும்.',
      voiceSample: 'பயிரில் கருகல் நோய் அறிகுறி உள்ளது. பாதிக்கப்பட்ட இலைகளை உடனே நீக்குங்கள்.',
    },
    kn: {
      native: 'ಕನ್ನಡ',
      headline: 'ನಿಮ್ಮ ಬೆಳೆಯಲ್ಲಿ ಎಲೆ ಮುಂಚಿನ ಬ್ಲೈಟ್ ರೋಗ ಕಂಡುಬಂದಿರಬಹುದು.',
      advice: 'ರೋಗಪೀಡಿತ ಎಲೆಗಳನ್ನು ತೆಗೆದುಹಾಕಿ ಮತ್ತು ಶಿಲೀಂಧ್ರನಾಶಕ ಸಿಂಪಡಿಸಿ.',
      voiceSample: 'ಬೆಳೆಯಲ್ಲಿ ಎಲೆ ರೋಗ ಕಂಡುಬಂದಿದೆ. ತಕ್ಷಣ ಕ್ರಮ ಕೈಗೊಳ್ಳಿ.',
    },
    ml: {
      native: 'മലയാളം',
      headline: 'നിങ്ങളുടെ വിളയിൽ ഇലകരിച്ചിൽ രോഗം ബാധിച്ചിട്ടുണ്ടാകാം.',
      advice: 'രോഗം ബാധിച്ച ഇലകൾ നീക്കം ചെയ്ത് കുമിൾനാശിനി തളിക്കുക.',
      voiceSample: 'വിളയിൽ ഇലകരിച്ചിൽ രോഗം കണ്ടെത്തി. ഇലകൾ ഉടൻ നീക്കം ചെയ്യുക.',
    },
    pa: {
      native: 'ਪੰਜਾਬੀ',
      headline: 'ਤੁਹਾਡੀ ਫ਼ਸਲ ਵਿੱਚ ਅਗੇਤਾ ਝੁਲਸਾ ਰੋਗ ਹੋ ਸਕਦਾ ਹੈ।',
      advice: 'ਬਿਮਾਰੀ ਵਾਲੇ ਪੱਤੇ ਤੋੜੋ ਅਤੇ ਉੱਲੀਨਾਸ਼ਕ ਦਵਾਈ ਦਾ ਛਿੜਕਾਅ ਕਰੋ।',
      voiceSample: 'ਫ਼ਸਲ ਵਿੱਚ ਝੁਲਸਾ ਰੋਗ ਦੇ ਲੱਛਣ ਹਨ। ਸਪਰੇਅ ਸਮੇਂ ਸਿਰ ਕਰੋ।',
    },
    or: {
      native: 'ଓଡ଼ିଆ',
      headline: 'ଆପଣଙ୍କ ଫସଲରେ ଆଗୁଆ ଝାଉଁଳା ରୋଗ ହୋଇପାରେ।',
      advice: 'ରୋଗାକ୍ରାନ୍ତ ପତ୍ର କାଟି ନଷ୍ଟ କରନ୍ତୁ ଏବଂ ନିମ୍ବ ତେଲ ସିଞ୍ଚନ କରନ୍ତୁ।',
      voiceSample: 'ଫସଲରେ ପତ୍ର ଝାଉଁଳା ରୋଗ ଦେଖାଦେଇଛି। ଉପଯୁକ୍ତ ସିଞ୍ଚନ କରନ୍ତୁ।',
    },
    as: {
      native: 'অসমীয়া',
      headline: 'আপোনাৰ শস্যত আগতীয়া পাত পোৰা ৰোগ হ’ব পাৰে।',
      advice: 'আক্ৰান্ত পাতবোৰ আঁতৰাই পেলাওক আৰু উপযুক্ত ঔষধ ছটিওৱা ব্যৱস্থা কৰক।',
      voiceSample: 'শস্যত পাত পোৰা ৰোগৰ লক্ষণ দেখা গৈছে। যথাসময়ত যত্ন লওক।',
    },
  };

  const currentSample = REGIONAL_SAMPLES[activePreviewCode] || REGIONAL_SAMPLES.hi;

  const handleLanguageSelect = (code) => {
    setActivePreviewCode(code);
    changeLanguage(code);
  };

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-[#faf8f5] to-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-agri-100 text-agri-900 text-xs font-extrabold uppercase tracking-wider border border-agri-300">
            <Globe className="w-3.5 h-3.5 text-agri-700" />
            <span>{t('regional.tag', 'Multilingual Accessibility')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 tracking-tight">
            {t('regional.title', 'Agriculture That Speaks Your Language')}
          </h2>
          <p className="text-lg text-stone-600 font-medium leading-relaxed">
            {t('regional.subtitle', 'Get important crop information in a language that\'s comfortable for you. 12 Indian regional languages supported natively.')}
          </p>
        </div>

        {/* Interactive Language Selector Tabs */}
        <div className="mt-12 space-y-8">
          <div className="text-center text-sm font-bold text-stone-700">
            {t('regional.selectPrompt', 'Try selecting your language to see instant local guidance:')}
          </div>

          {/* Language Pill Badges (Scrollable on small mobile, grid on larger) */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-4xl mx-auto">
            {languages.map((lang) => {
              const isSelected = activePreviewCode === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-sm transition-all farmer-touch-target border-2 ${
                    isSelected
                      ? 'bg-agri-700 text-white border-agri-800 shadow-farmer scale-105'
                      : 'bg-white text-stone-800 border-stone-200 hover:border-agri-400 hover:bg-agri-50'
                  }`}
                >
                  <span className="text-base">{lang.nativeName}</span>
                  <span className={`ml-1.5 text-xs opacity-75 font-normal ${isSelected ? 'text-agri-200' : 'text-stone-500'}`}>
                    ({lang.name})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live Translation Demonstration Card */}
          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-9 border-2 border-agri-300 shadow-farmer-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-agri-100/50 rounded-bl-full pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-agri-600 text-white flex items-center justify-center font-bold">
                  🌱
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-stone-900">
                    {t('regional.sampleTitle', 'Sample Crop Advisory')}
                  </h4>
                  <span className="text-xs font-semibold text-agri-700">
                    Active Script: {currentSample.native}
                  </span>
                </div>
              </div>

              <div className="px-3 py-1 rounded-full bg-agri-100 text-agri-900 text-xs font-extrabold border border-agri-200">
                100% Native Text
              </div>
            </div>

            {/* Simulated Live Advisory in Selected Native Script */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Diagnosis / रोग पहचान
                </span>
                <p className="text-xl sm:text-2xl font-extrabold text-stone-900 mt-1">
                  {currentSample.headline}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-agri-50 border border-agri-200">
                <span className="text-xs font-bold uppercase tracking-wider text-agri-900 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[3] text-agri-700" />
                  Recommended Action / सलाह
                </span>
                <p className="text-base sm:text-lg font-bold text-agri-950 mt-1">
                  {currentSample.advice}
                </p>
              </div>
            </div>

            {/* Audio Speech Demo */}
            <div className="mt-6 pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-600">
              <div className="flex items-center gap-2 font-bold text-stone-800">
                <Volume2 className="w-4 h-4 text-agri-600" />
                <span>Text-to-Speech audio support available in regional voice</span>
              </div>
              <span className="text-agri-700 font-bold bg-agri-100 px-2.5 py-1 rounded-lg">
                Farmer Literacy Inclusive
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default RegionalLanguageSection;
