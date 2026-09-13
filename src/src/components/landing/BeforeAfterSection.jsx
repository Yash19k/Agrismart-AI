import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  ShieldCheck, 
  ArrowRight, 
  Check, 
  Sparkles, 
  Info 
} from 'lucide-react';

export const BeforeAfterSection = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('comparison');

  return (
    <section className="py-16 sm:py-24 bg-white border-b border-stone-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold uppercase tracking-wider border border-amber-300">
            🔍 {t('beforeAfter.tag', 'Real Farm Value')}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 tracking-tight">
            {t('beforeAfter.title', 'From "What\'s Wrong?" to "What Should I Do?"')}
          </h2>
          <p className="text-lg text-stone-600 font-medium">
            {t('beforeAfter.subtitle', 'Turn confusion into practical, straightforward next steps for your crops.')}
          </p>
        </div>

        {/* Before vs After Side-by-Side Cards */}
        <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* BEFORE CARD */}
          <div className="bg-red-50/40 rounded-3xl p-7 sm:p-9 border-2 border-red-200 flex flex-col justify-between relative shadow-sm">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1.5 rounded-full bg-red-100 text-red-800 font-extrabold text-xs tracking-wide uppercase border border-red-300">
                  {t('beforeAfter.before.badge', 'Without AgriSmart')}
                </span>
                <span className="text-2xl">❌</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-stone-900 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  <span>{t('beforeAfter.before.heading', 'Damaged Leaf & Uncertainty')}</span>
                </h3>
                <div className="p-4 rounded-2xl bg-white border border-red-200 text-stone-700 italic font-medium">
                  {t('beforeAfter.before.quote', '"Something is wrong with my crop. Is it pest, fungus, or nutrient loss?"')}
                </div>
              </div>

              {/* Damaged leaf photo */}
              <div className="rounded-2xl overflow-hidden border-2 border-stone-300 shadow-inner h-48 bg-stone-100 relative">
                <img
                  src="https://images.unsplash.com/photo-1592417817098-8f3d6910985b?auto=format&fit=crop&w=600&q=80"
                  alt="Damaged leaf symptom"
                  className="w-full h-full object-cover filter grayscale contrast-125"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-red-950/30 flex items-center justify-center">
                  <div className="bg-white/95 px-4 py-2 rounded-xl text-xs font-bold text-red-700 shadow-md border border-red-200">
                    ❓ Unidentified Crop Issue
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-stone-600 font-medium">
                <div className="flex items-center gap-2 text-red-700 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>Delay in treatment while disease spreads across plants</span>
                </div>
                <div className="flex items-center gap-2 text-red-700 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>Risk of buying costly or inappropriate chemical sprays</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-red-200 text-xs font-bold text-red-800">
              ⚠️ {t('beforeAfter.before.state', 'Risk of crop loss or wrong pesticide purchase')}
            </div>
          </div>

          {/* AFTER CARD */}
          <div className="bg-gradient-to-br from-agri-50 to-[#f2f9f4] rounded-3xl p-7 sm:p-9 border-2 border-agri-400 flex flex-col justify-between relative shadow-farmer">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1.5 rounded-full bg-agri-600 text-white font-extrabold text-xs tracking-wide uppercase shadow-xs">
                  {t('beforeAfter.after.badge', 'With AgriSmart')}
                </span>
                <span className="text-2xl">🌱</span>
              </div>

              {/* AI result header */}
              <div className="bg-white rounded-2xl p-5 border-2 border-agri-300 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      {t('beforeAfter.after.possibleIssue', 'Possible Issue')}
                    </span>
                    <h3 className="text-2xl font-extrabold text-agri-950 leading-tight">
                      {t('beforeAfter.after.issueName', 'Tomato Early Blight')}
                    </h3>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block px-3 py-1 rounded-full bg-agri-100 text-agri-900 font-extrabold text-xs border border-agri-300">
                      {t('beforeAfter.after.confidenceVal', '94% Confidence')}
                    </span>
                    <span className="block text-[10px] text-stone-500 mt-0.5">
                      {t('beforeAfter.after.confidenceLabel', 'AI-assisted result')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100">
                  <h4 className="text-sm font-extrabold text-stone-900 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-agri-600" />
                    <span>{t('beforeAfter.after.actionHeading', 'Recommended Next Steps:')}</span>
                  </h4>
                  <ul className="space-y-2 text-sm text-stone-700 font-semibold">
                    <li className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-agri-100 text-agri-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <span>{t('beforeAfter.after.action1', 'Remove and safely discard affected lower leaves')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-agri-100 text-agri-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <span>{t('beforeAfter.after.action2', 'Improve airflow and avoid overhead watering on leaves')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-agri-100 text-agri-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <span>{t('beforeAfter.after.action3', 'Apply recommended organic neem spray or copper fungicide')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Disclaimer for transparent trust */}
            <div className="mt-6 pt-4 border-t border-agri-200 text-xs text-agri-900 font-medium flex items-start gap-2">
              <Info className="w-4 h-4 text-agri-700 flex-shrink-0 mt-0.5" />
              <span>{t('beforeAfter.disclaimer', 'AI-assisted guidance for farmer decision support. For severe outbreaks, always consult your local Krishi Vigyan Kendra (KVK).')}</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default BeforeAfterSection;
