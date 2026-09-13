import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/useTranslation';
import { Sprout, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';

export const CtaSection = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-br from-agri-800 via-agri-900 to-agri-950 text-white relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-agri-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative space-y-6">
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-agri-700/60 border border-agri-500 text-agri-200 text-xs font-extrabold uppercase tracking-wider">
          <Sprout className="w-4 h-4 text-amber-300" />
          <span>Join Over 50,000+ Indian Farmers</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight text-balance">
          {t('cta.title', 'Ready to Protect Your Crop?')}
        </h2>

        <p className="text-lg sm:text-xl text-stone-200 max-w-2xl mx-auto font-medium leading-relaxed">
          {t('cta.subtitle', 'Get started with AgriSmart and make your farming decisions with better information.')}
        </p>

        {/* Action Button */}
        <div className="pt-4 flex items-center justify-center max-w-sm mx-auto">
          <Link to="/signup" className="w-full">
            <Button variant="accent" size="xl" fullWidth icon={Sprout}>
              {t('cta.primary', '🌱 Get Started Free')}
            </Button>
          </Link>
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-agri-300 font-bold">
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-amber-400 stroke-[3]" /> No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-amber-400 stroke-[3]" /> 12 Indian Languages
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-amber-400 stroke-[3]" /> Works on any smartphone
          </span>
        </div>

      </div>
    </section>
  );
};

export default CtaSection;
