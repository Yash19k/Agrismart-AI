import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { Camera, Bot, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export const HowItWorksSection = () => {
  const { t } = useTranslation();

  const steps = [
    {
      num: '1',
      icon: Camera,
      iconColor: 'text-amber-600 bg-amber-100 border-amber-300',
      title: t('howItWorks.step1.title', 'Take a Photo'),
      desc: t('howItWorks.step1.desc', 'Take a clear photo of your crop or affected leaf with your mobile phone.'),
      tip: 'Natural daylight works best • clear leaf focus',
    },
    {
      num: '2',
      icon: Bot,
      iconColor: 'text-blue-600 bg-blue-100 border-blue-300',
      title: t('howItWorks.step2.title', 'Get Help'),
      desc: t('howItWorks.step2.desc', 'AgriSmart checks the image and identifies possible crop problems in seconds.'),
      tip: 'Checks 50+ common Indian crop diseases',
    },
    {
      num: '3',
      icon: Sparkles,
      iconColor: 'text-agri-700 bg-agri-100 border-agri-300',
      title: t('howItWorks.step3.title', 'Take Action'),
      desc: t('howItWorks.step3.desc', 'Get simple guidance on what you can do next to protect your harvest.'),
      tip: 'Organic remedies & recommended sprays in your language',
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-agri-100 text-agri-800 text-xs font-extrabold uppercase tracking-wider border border-agri-200">
            🌱 {t('howItWorks.tag', 'Easy 3-Step Process')}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 tracking-tight">
            {t('howItWorks.title', 'Simple Steps. Smarter Farming.')}
          </h2>
          <p className="text-lg text-stone-600 font-medium">
            {t('howItWorks.subtitle', 'No complex technical knowledge needed. Designed to give you fast, clear help in seconds.')}
          </p>
        </div>

        {/* 3 Steps Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative bg-[#faf8f5] hover:bg-agri-50/50 rounded-3xl p-8 border-2 border-stone-200 hover:border-agri-400 shadow-sm hover:shadow-farmer transition-all duration-200 flex flex-col justify-between group"
              >
                {/* Step Number Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${step.iconColor} shadow-sm group-hover:scale-105 transition-transform`}>
                    <Icon className="w-8 h-8 stroke-[2.2]" />
                  </div>
                  <span className="text-4xl font-extrabold text-stone-300 group-hover:text-agri-600 transition-colors">
                    0{step.num}
                  </span>
                </div>

                {/* Content */}
                <div className="space-y-3 flex-1">
                  <h3 className="text-2xl font-extrabold text-stone-900">
                    {step.title}
                  </h3>
                  <p className="text-stone-600 text-base font-medium leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {/* Helpful Tip Badge */}
                <div className="mt-6 pt-4 border-t border-stone-200/80 flex items-center gap-2 text-xs font-bold text-agri-800">
                  <CheckCircle2 className="w-4 h-4 text-agri-600 flex-shrink-0" />
                  <span>{step.tip}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default HowItWorksSection;
