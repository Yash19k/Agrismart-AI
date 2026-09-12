import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bug, 
  CloudSun, 
  Droplets, 
  Sprout, 
  LayoutDashboard, 
  ShieldAlert, 
  Check 
} from 'lucide-react';

export const FeaturesSection = () => {
  const { t } = useTranslation();

  const features = [
    {
      id: 'f1',
      icon: ShieldAlert,
      iconBg: 'bg-red-50 text-red-600 border-red-200',
      title: t('features.f1.title', 'Crop Disease Detection'),
      desc: t('features.f1.desc', 'Check your crop for possible diseases using a photo.'),
      badge: 'Photo Diagnosis',
    },
    {
      id: 'f2',
      icon: Bug,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
      title: t('features.f2.title', 'Pest Identification'),
      desc: t('features.f2.desc', 'Get help identifying common crop pests before they spread.'),
      badge: 'Early Warning',
    },
    {
      id: 'f3',
      icon: CloudSun,
      iconBg: 'bg-sky-50 text-sky-600 border-sky-200',
      title: t('features.f3.title', 'Weather Information'),
      desc: t('features.f3.desc', 'Check weather information that matters for your farm and spraying.'),
      badge: 'Spray Advisory',
    },
    {
      id: 'f4',
      icon: Droplets,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
      title: t('features.f4.title', 'Smart Irrigation'),
      desc: t('features.f4.desc', 'Get guidance to help manage irrigation and save water.'),
      badge: 'Water Management',
    },
    {
      id: 'f5',
      icon: Sprout,
      iconBg: 'bg-agri-50 text-agri-700 border-agri-200',
      title: t('features.f5.title', 'Crop Advisory'),
      desc: t('features.f5.desc', 'Get simple recommendations based on your crop and farm conditions.'),
      badge: 'Custom Tips',
    },
    {
      id: 'f6',
      icon: LayoutDashboard,
      iconBg: 'bg-stone-100 text-stone-700 border-stone-300',
      title: t('features.f6.title', 'Farm Dashboard'),
      desc: t('features.f6.desc', 'Keep your farm information and crop health insights in one place.'),
      badge: 'All in One Place',
    },
  ];

  return (
    <section id="features" className="py-16 sm:py-24 bg-[#faf8f5] border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-agri-100 text-agri-900 text-xs font-extrabold uppercase tracking-wider border border-agri-200">
            🌾 {t('features.tag', 'All-In-One Support')}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 tracking-tight">
            {t('features.title', 'Everything You Need to Care for Your Farm')}
          </h2>
          <p className="text-lg text-stone-600 font-medium">
            {t('features.subtitle', 'Practical agricultural tools crafted to support your daily farming decisions.')}
          </p>
        </div>

        {/* 6 Features Grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-7 border-2 border-stone-200 hover:border-agri-500 hover:shadow-farmer transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${item.iconBg} shadow-xs group-hover:scale-105 transition-transform`}>
                      <Icon className="w-7 h-7 stroke-[2.2]" />
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-stone-900 mb-2.5">
                    {item.title}
                  </h3>
                  <p className="text-stone-600 text-base font-medium leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center text-xs font-bold text-agri-700">
                  <Check className="w-4 h-4 mr-1.5 text-agri-600 stroke-[3]" />
                  <span>Available in 12 Indian Languages</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default FeaturesSection;
