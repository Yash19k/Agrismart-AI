import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleTranslateDropdown } from '../components/common/GoogleTranslate';

export const SignupPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('Please enter your mobile number or email address.');
      return;
    }
    if (formData.password.length < 6) {
      setErrorMsg('Password should be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await register(formData.name, formData.email, formData.password);
      navigate('/login', { state: { registered: true, name: formData.name } });
    } catch (err) {
      setErrorMsg(err.friendlyMessage || err.response?.data?.detail || 'Unable to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden text-slate-800 selection:bg-[#c5eed4] selection:text-[#0b261e]">
      {/* Scenic Atmospheric Wallpaper Layer */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <img
          alt="Lush agricultural field with gentle green rolling hills"
          className="w-full h-full object-cover object-center transform scale-[1.01]"
          src="/auth_bg.jpg"
          onError={(e) => {
            e.target.src = 'https://lh3.googleusercontent.com/aida/AEtjO1XKJ67aNaTaRRtPG9zh0MQn96_WKD4mLHc55lzE4O_YP4m54Gh70UvUSR3xnk0VBfiBmXaYxmeFAEElRCPhCgY34EBCmgGDmdkQfXfGaMxnEtDcdjWQHBf1dRvqU2dYqFywQ3hh86eCXi65ya5ouloDCy7KXZEZ_pei0u_2-D9idfEojxwaXMqx4jBSHNAeyqVwPKS4xGrEYVGHrMdZaaEcm1iSTGusB6flZpQf2U3S5gOVIM_3ZhgyDufN';
          }}
        />
        {/* Ambient subtle editorial overlay for contrast and depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-black/15 pointer-events-none" />
      </div>

      {/* Site Header / Navigation Bar */}
      <header className="relative z-20 w-full px-4 sm:px-8 pt-5 pb-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[#1b4d3e] rounded-lg p-1"
            aria-label="AgriSmart Home"
          >
            <img
              src="/auth_logo.png"
              onError={(e) => {
                e.target.src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuANHyHK2kDtARAE0QDCFyNBluU-JQziBfKJN7kYVHmFasi0VYr50ebf1YlRrGiFUOIza76ZkR9KurremM4aYjlBruwgTqqp0V9m_v20oxwxKEWw-fa09QEyJLRKZMLnBPBBYhm2wqqvL5j93gIFntTX4lQLdT6iWaRGySNAxVd67lKRuTlVQTmo2xC6YL0OdDCI4AKgOBLJCZJzOlLllBmid55svVzA-PS6rLwmO52Ba4_ioOvuDeAG2pEfjXtr4RbNVU8';
              }}
              alt="AgriSmart"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>

          {/* Right Actions: Language Selector */}
          <div className="flex items-center gap-3">
            <GoogleTranslateDropdown variant="auth" />
          </div>
        </div>
      </header>

      {/* Main Signup Card Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-10">
        <div className="w-full max-w-[490px]">
          <section className="bg-white/95 backdrop-blur-xl border border-[rgba(27,77,62,0.12)] rounded-[28px] shadow-[0_20px_40px_-15px_rgba(22,66,51,0.12),0_0_1px_1px_rgba(22,66,51,0.05)] p-7 sm:p-9 relative overflow-hidden transition-all duration-300">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-[#1b4d3e] to-emerald-300" />

            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Go back"
              className="absolute top-5 left-5 sm:top-7 sm:left-7 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1b4d3e] hover:text-[#0b261e] bg-white/80 hover:bg-[#ecfef3] border border-[#c5eed4] rounded-xl shadow-xs transition-all duration-150 group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#216f4b] group-hover:-translate-x-0.5 transition-transform duration-150" />
              <span>Back</span>
            </button>

            {/* Header of Card */}
            <div className="text-center mb-6 pt-1">
              {/* Emblem */}
              <div className="flex justify-center mb-3.5">
                <div className="w-13 h-13 p-3 rounded-2xl bg-[#eef8f3] border border-[#b4e1c8] text-[#1b4d3e] shadow-sm flex items-center justify-center transform hover:scale-105 transition-transform duration-200">
                  <img
                    src="/auth_emblem_signup.png"
                    onError={(e) => {
                      e.target.src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBU2odCgxyqa-I0MdelAcxtUM0LJQGkyrCH6xT-WvhDHcA_RuOwKXPaXtK4awh9cdSXZWhoITqeYHTZx1UoJzby91YMSr32135fH_LxcQP6HGxlarWnbEKQspfSdapJrXmiRvW6vNcrkVyNu-3vII96SBfIatMQJxxZWSNv9O1FWZrggYo2F3dPIVYp1tt-9nWMdDK32zExXcIK00aW1_x9-iCHbG7h_fTLEhrWPWL6NCBQG0t3Kx_XGoMr7N203X0YGVk';
                    }}
                    alt="AgriSmart Emblem"
                    className="w-8 h-8 object-contain"
                  />
                </div>
              </div>

              {/* Title */}
              <h1 className="font-serif text-3xl sm:text-[34px] leading-tight font-medium text-[#0c2720] tracking-tight">
                Create Your <span className="italic font-normal">AgriSmart</span> Account
              </h1>

              {/* Subtitle */}
              <p className="mt-2 text-[13.5px] sm:text-sm text-slate-600 font-normal leading-relaxed max-w-sm mx-auto">
                Join thousands of farmers protecting their crops daily with AI-powered disease diagnostics.
              </p>
            </div>

            {/* Error and Success banners */}
            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 text-red-800 text-xs sm:text-sm font-semibold border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-[#e1f7e9] text-[#164233] text-xs sm:text-sm font-semibold border border-[#97deb5] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#216f4b] flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0c2720] mb-1.5" htmlFor="full-name">
                  Your Full Name
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4 text-[#216f4b]/70" />
                  </div>
                  <input
                    id="full-name"
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel or Maria Santos"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full pl-10 pr-3.5 py-2.5 sm:py-3 text-sm rounded-xl border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1b4d3e] focus:ring-3 focus:ring-[#1b4d3e]/15 transition-all bg-white hover:bg-white"
                  />
                </div>
              </div>

              {/* Mobile Number or Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0c2720] mb-1.5" htmlFor="contact">
                  Mobile Number or Email
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4 text-[#216f4b]/70" />
                  </div>
                  <input
                    id="contact"
                    name="contact"
                    type="text"
                    required
                    placeholder="e.g. ramesh@farm.org or mobile number"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="block w-full pl-10 pr-3.5 py-2.5 sm:py-3 text-sm rounded-xl border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1b4d3e] focus:ring-3 focus:ring-[#1b4d3e]/15 transition-all bg-white hover:bg-white"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0c2720] mb-1.5" htmlFor="password">
                  Create Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 text-[#216f4b]/70" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min. 6 characters with letters & numbers"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="block w-full pl-10 pr-11 py-2.5 sm:py-3 text-sm rounded-xl border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1b4d3e] focus:ring-3 focus:ring-[#1b4d3e]/15 transition-all bg-white hover:bg-white"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors cursor-pointer ${
                      showPassword ? 'text-[#1b4d3e]' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 sm:py-3.5 px-6 rounded-xl bg-[#1b4d3e] hover:bg-[#143b30] active:bg-[#0c2720] text-white font-semibold text-sm sm:text-[15px] shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#1b4d3e] focus:ring-offset-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Create Free Account</span>
                  )}
                  {!loading && (
                    <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                  )}
                </button>
              </div>
            </form>

            {/* Already Have Account Link */}
            <div className="text-center mt-5 pt-4 border-t border-slate-100">
              <p className="text-[13.5px] text-slate-600 font-medium">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-[#1b4d3e] hover:text-[#0c2720] font-semibold underline underline-offset-4 decoration-[#b4e1c8] hover:decoration-[#1b4d3e] transition-all ml-1"
                >
                  Log In
                </Link>
              </p>
            </div>

            {/* Extension / Officer Account Info */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <p className="text-[11.5px] text-slate-500 leading-relaxed">
                🏛️ <strong>Agricultural Officer or Extension Specialist?</strong><br />
                Staff accounts are verified and credentialed by the Department of Agriculture. Please{' '}
                <Link to="/login" className="text-[#1b4d3e] font-semibold underline underline-offset-2">
                  sign in with your staff credentials
                </Link>.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default SignupPage;
