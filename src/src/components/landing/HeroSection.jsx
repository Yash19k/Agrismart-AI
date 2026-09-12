import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles, 
  Smartphone, 
  Leaf, 
  Volume2, 
  Check, 
  Sprout
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';

export const HeroSection = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handlePrimaryCta = () => {
    navigate('/signup');
  };

  const handleSecondaryCta = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 bg-gradient-to-b from-[#f2f9f4] via-[#faf8f5] to-white border-b border-agri-100">
      {/* Decorative background leaf accents */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-agri-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -left-32 w-80 h-80 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Core Message & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-agri-100/90 border border-agri-300 text-agri-900 font-bold text-sm shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="w-2.5 h-2.5 rounded-full bg-agri-600 animate-ping" />
              <span>{t('hero.badge', '🌱 Designed for Indian Farmers')}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-agri-950 tracking-tight leading-[1.15] text-balance">
              {t('hero.title', 'Protect Your Crop. Grow With Confidence.')}
            </h1>

            {/* Short farmer-friendly subtitle */}
            <p className="text-lg sm:text-xl text-stone-700 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {t('hero.subtitle', 'Understand possible crop problems, and get simple guidance to help protect your farm and harvest.')}
            </p>

            {/* Primary & Secondary Call to Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-4">
              <button
                onClick={handlePrimaryCta}
                className="inline-flex items-center justify-center gap-3 px-8 py-4.5 rounded-2xl bg-gradient-to-r from-agri-600 via-agri-700 to-agri-800 hover:from-agri-700 hover:to-agri-900 text-white text-xl font-extrabold shadow-farmer-lg hover:shadow-2xl active:scale-[0.98] transition-all duration-200 farmer-touch-target border-2 border-agri-400/30"
              >
                <Sprout className="w-6 h-6 text-amber-300 stroke-[2.5]" />
                <span>{t('nav.getStarted', 'Get Started Free')}</span>
              </button>

              <button
                onClick={handleSecondaryCta}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white hover:bg-agri-50 text-agri-900 text-lg font-bold border-2 border-agri-200 hover:border-agri-400 shadow-sm transition-all farmer-touch-target"
              >
                <span>{t('hero.secondaryCta', 'See How It Works →')}</span>
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-4 grid grid-cols-3 gap-2 max-w-lg mx-auto lg:mx-0 border-t border-agri-200/70">
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-1.5 text-stone-800 text-sm font-bold">
                <div className="w-7 h-7 rounded-full bg-agri-100 text-agri-700 flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-4 h-4" />
                </div>
                <span>{t('hero.trust1', 'Simple to use')}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-1.5 text-stone-800 text-sm font-bold">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span>{t('hero.trust2', 'Your language')}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-1.5 text-stone-800 text-sm font-bold">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span>{t('hero.trust3', 'Built for farmers')}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Smartphone with Crop Advisory Preview */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-sm sm:max-w-md">
              
              {/* Smartphone Frame */}
              <div className="relative bg-agri-950 p-3.5 rounded-[40px] shadow-2xl border-4 border-stone-800">
                {/* Speaker notch */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-stone-900 rounded-full z-20 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-stone-800 mr-2" />
                  <div className="w-10 h-1 bg-stone-700 rounded-full" />
                </div>

                {/* Smartphone Screen */}
                <div className="bg-[#faf8f5] rounded-[32px] overflow-hidden pt-8 pb-4 px-4 space-y-3 relative text-stone-900">
                  
                  {/* In-app Header */}
                  <div className="flex items-center justify-between px-1 border-b border-stone-200 pb-2">
                    <div className="flex items-center gap-1.5 font-extrabold text-agri-900 text-sm">
                      <Leaf className="w-4 h-4 text-agri-600" />
                      <span>AgriSmart Advisory</span>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-agri-100 text-agri-800">
                      Crop Health
                    </span>
                  </div>

                  {/* Crop Leaf Photo */}
                  <div className="relative rounded-2xl overflow-hidden border-2 border-agri-300 shadow-sm aspect-[4/3] bg-stone-900">
                    <img
                      src="https://images.unsplash.com/photo-1592417817098-8f3d6910985b?auto=format&fit=crop&w=600&q=80"
                      alt="Crop leaf under inspection"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Tag */}
                    <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-amber-400/40 text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>{t('hero.card.cropName', 'Tomato Plant')}</span>
                    </div>

                    <div className="absolute bottom-2 right-2 bg-agri-800/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                      Health Advisory
                    </div>
                  </div>

                  {/* Farmer Guidance Result Card */}
                  <div className="bg-white rounded-2xl p-3.5 border-2 border-agri-200 shadow-md space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                          Identified Condition
                        </span>
                        <h4 className="text-base font-extrabold text-stone-900 leading-tight">
                          {t('hero.card.issueTitle', 'Tomato Early Blight')}
                        </h4>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold border border-amber-300 flex-shrink-0">
                        {t('hero.card.severity', 'Moderate')}
                      </span>
                    </div>

                    {/* Actionable Farmer Step */}
                    <div className="bg-agri-50 rounded-xl p-2.5 border border-agri-200 text-xs text-agri-950 font-semibold space-y-1">
                      <div className="flex items-center gap-1 text-agri-800 font-bold">
                        <Check className="w-3.5 h-3.5 stroke-[3] text-agri-600" />
                        <span>Recommended Farmer Action:</span>
                      </div>
                      <p className="text-stone-700 pl-4 font-medium">
                        {t('hero.card.quickAction', 'Remove lower spotted leaves and improve airflow between plants.')}
                      </p>
                    </div>

                    {/* Audio read-aloud bar */}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-stone-600">
                      <span className="flex items-center gap-1 font-bold text-agri-800">
                        <Volume2 className="w-3.5 h-3.5 text-agri-600" />
                        Voice Guidance in 12 Languages
                      </span>
                      <span className="text-agri-700 font-bold">Free</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Floating Pill Badges */}
              <div className="absolute -bottom-5 -left-4 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border-2 border-agri-200 flex items-center gap-2.5 hidden sm:flex">
                <div className="w-8 h-8 rounded-full bg-agri-100 text-agri-700 flex items-center justify-center font-bold">
                  🌱
                </div>
                <div className="text-xs">
                  <div className="font-extrabold text-stone-900">100% Free for Farmers</div>
                  <div className="text-stone-500 font-medium">Personalized crop assistance</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
