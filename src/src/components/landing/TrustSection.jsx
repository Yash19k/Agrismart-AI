import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, 
  Smartphone, 
  Globe2, 
  Sparkles, 
  Compass, 
  Wifi, 
  HeartHandshake 
} from 'lucide-react';

export const TrustSection = () => {
  const { t } = useTranslation();

  const trustItems = [
    {
      icon: Smartphone,
      title: t('trust.item1', 'Simple and easy to use on any smartphone'),
      desc: 'Large buttons, big clear fonts, and minimal reading required.',
    },
    {
      icon: Globe2,
      title: t('trust.item2', 'Regional language support with native script'),
      desc: '12 Indian languages natively written without confusing jargon.',
    },
    {
      icon: Sparkles,
      title: t('trust.item3', 'AI-powered crop assistance in plain language'),
      desc: 'Straightforward advice you can take directly to your field.',
    },
    {
      icon: Compass,
      title: t('trust.item4', 'Personalized guidance for your crop & soil'),
      desc: 'Tailored recommendations based on your state, district, and crop.',
    },
    {
      icon: Wifi,
      title: t('trust.item5', 'Fast loading on 3G, 4G, and rural networks'),
      desc: 'Lightweight interface that works smoothly with intermittent connections.',
    },
    {
      icon: HeartHandshake,
      title: t('trust.item6', 'Designed specifically for Indian agriculture'),
      desc: 'Honest support built around the practical realities of our farmers.',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-agri-100 text-agri-900 text-xs font-extrabold uppercase tracking-wider border border-agri-300">
            <ShieldCheck className="w-3.5 h-3.5 text-agri-700" />
            <span>{t('trust.tag', 'Farmer First')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 tracking-tight">
            {t('trust.title', 'Built for Farmers')}
          </h2>
          <p className="text-lg text-stone-600 font-medium">
            {t('trust.subtitle', 'Transparent, respectful, and reliable support without exaggerated promises.')}
          </p>
        </div>

        {/* 6 Trust Grid Items */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {trustItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-[#faf8f5] rounded-3xl p-7 border-2 border-stone-200/80 hover:border-agri-400 hover:bg-agri-50/40 transition-all shadow-xs flex items-start gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-agri-100 text-agri-700 border border-agri-200 flex items-center justify-center flex-shrink-0 group-hover:bg-agri-600 group-hover:text-white transition-colors">
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-stone-900 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-sm text-stone-600 font-medium leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default TrustSection;
