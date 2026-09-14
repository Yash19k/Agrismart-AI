import React, { useState, useEffect } from 'react';
import { LANDING_TRANSLATIONS } from '../data/landingTranslations';
import { useLanguage } from '../context/LanguageContext';

import StitchNavbar from '../components/landing/StitchNavbar';
import StitchHero from '../components/landing/StitchHero';
import StitchStatsAndServices from '../components/landing/StitchStatsAndServices';
import StitchDiseasePreview from '../components/landing/StitchDiseasePreview';
import StitchWorkflowAndTech from '../components/landing/StitchWorkflowAndTech';
import StitchSupportedCrops from '../components/landing/StitchSupportedCrops';
import SolutionsSection from '../components/landing/SolutionsSection';
import StitchCta from '../components/landing/StitchCta';
import StitchFooter from '../components/landing/StitchFooter';

export const LandingPage = () => {
  const { currentLang: globalLang } = useLanguage();

  // Primary language state for instantaneous reactive translation
  const [lang, setLang] = useState(() => {
    try {
      const saved =
        localStorage.getItem('agrishield_language') ||
        localStorage.getItem('agrishield_google_lang');
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'gu')) {
        return saved;
      }
      return 'en';
    } catch {
      return 'en';
    }
  });

  // Sync if global context changes to en/hi/gu
  useEffect(() => {
    if (globalLang && (globalLang === 'en' || globalLang === 'hi' || globalLang === 'gu')) {
      setLang(globalLang);
    }
  }, [globalLang]);

  const handleSelectLanguage = (newLang) => {
    setLang(newLang);
    try {
      localStorage.setItem('agrishield_language', newLang);
      localStorage.setItem('agrishield_google_lang', newLang);
    } catch {
      // safe fallback
    }
  };

  const t = LANDING_TRANSLATIONS[lang] || LANDING_TRANSLATIONS.en;

  return (
    <div className="w-full min-h-screen bg-white text-stone-800 font-sans antialiased flex flex-col selection:bg-emerald-200">
      {/* 1. Full-Width Sticky Navigation Header */}
      <StitchNavbar
        t={t}
        currentLang={lang}
        onSelectLanguage={handleSelectLanguage}
      />

      {/* 2. Full-Width Continuous Main Content Flow */}
      <main className="w-full flex-1 flex flex-col">
        {/* Hero Section with New High-Resolution Agricultural Artwork */}
        <StitchHero t={t} />

        {/* Impact / Performance Stats & Core Capabilities */}
        <StitchStatsAndServices t={t} />

        {/* Primary Product: AI Crop Disease Detection Workspace */}
        <StitchDiseasePreview t={t} />

        {/* How It Works (Simple 4-Step Process) & Technology Pipeline */}
        <StitchWorkflowAndTech t={t} />

        {/* Supported Crops & Disease Classes */}
        <StitchSupportedCrops t={t} />

        {/* Solutions for Agriculture (Full-Width Major Website Section at Bottom) */}
        <SolutionsSection t={t} />

        {/* Final Call to Action */}
        <StitchCta t={t} />
      </main>

      {/* 3. Professional Agricultural Technology Footer */}
      <StitchFooter t={t} />
    </div>
  );
};

export default LandingPage;
