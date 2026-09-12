import React from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import HeroSection from '../components/landing/HeroSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import BeforeAfterSection from '../components/landing/BeforeAfterSection';
import RegionalLanguageSection from '../components/landing/RegionalLanguageSection';
import TrustSection from '../components/landing/TrustSection';
import CtaSection from '../components/landing/CtaSection';

export const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5]">
      {/* Top Sticky Navbar */}
      <Navbar />

      {/* Main Landing Page Sections */}
      <main className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <BeforeAfterSection />
        <RegionalLanguageSection />
        <TrustSection />
        <CtaSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;
