import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff, ArrowLeft, X, CheckCircle, AlertCircle, AlertTriangle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import { GoogleTranslateDropdown } from '../components/common/GoogleTranslate';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if coming from register page
  const registeredState = location.state?.registered;
  const registeredName = location.state?.name;

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotForm, setForgotForm] = useState({
    identifier: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password.trim()) {
      setErrorMsg('Please enter both mobile/email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResetSuccessMsg(null);

    try {
      await login(formData.email, formData.password);
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(err.friendlyMessage || err.response?.data?.detail || 'Invalid login details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError(null);

    if (!forgotForm.identifier.trim()) {
      setForgotError('Please enter your username, email, or mobile number.');
      return;
    }
    if (forgotForm.newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }
    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setForgotError('Passwords do not match. Please verify.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authService.resetPassword(forgotForm.identifier, forgotForm.newPassword);
      setShowForgotModal(false);
      setResetSuccessMsg(res.message || 'Password changed successfully! Please log in with your new password.');
      setFormData(prev => ({
        ...prev,
        email: forgotForm.identifier,
        password: '',
      }));
      setForgotForm({ identifier: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setForgotError(err.response?.data?.detail || err.friendlyMessage || 'Could not reset password. Please check your username or email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden text-slate-800 selection:bg-[#c5eed4] selection:text-[#0b261e]">
      {/* Scenic Atmospheric Wallpaper Layer */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <img
          alt="Lush green rolling farmland"
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

      {/* Main Login Card Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[490px]">
          <section className="bg-white/95 backdrop-blur-xl border border-[rgba(27,77,62,0.12)] rounded-[28px] shadow-[0_20px_40px_-15px_rgba(22,66,51,0.12),0_0_1px_1px_rgba(22,66,51,0.05)] p-7 sm:p-10 relative overflow-hidden transition-all duration-300">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#61c691] via-[#1b4d3e] to-emerald-600" />

            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Go back"
              className="absolute top-5 left-5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1b4d3e] hover:text-[#0b261e] bg-white/80 hover:bg-[#ecfef3] border border-[#c5eed4] rounded-xl shadow-xs transition-all duration-150 group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#216f4b] group-hover:-translate-x-0.5 transition-transform duration-150" />
              <span>Back</span>
            </button>

            {/* Header of Card */}
            <div className="text-center mb-6 pt-2">
              {/* Emblem */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1b4d3e] text-white shadow-md shadow-[#1b4d3e]/25 mb-3.5 transform hover:scale-105 transition-transform duration-200">
                <img
                  src="/auth_emblem_login.png"
                  onError={(e) => {
                    e.target.src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFM_ppPHbFX6GL-2dWNNFxVqdAZ35dJA3V-ghyURHUSbXI42DhUGkOa3xHA0uMbEmRvRXGLsBEH_xEJY4oxou2oVp268vOmrQx7fCbm4xpvZyjAJ3vLKS_J-RqNn2eEEEvDfIxDEAY5bLC1A39hyKxlcrYQbRO3bD_By_IsL4xq7GDx4JIljxrnM1ATs2yIgSitZjIqNz2IYc97KIBiNDOaTyHDFAYTfmSSi-fwXgwtM5uczHL0rrX4_J2S7bflCgI-NI';
                  }}
                  alt="AgriSmart Emblem"
                  className="w-10 h-10 object-contain"
                />
              </div>

              {/* Editorial Heading */}
              <h1 className="font-serif text-[34px] sm:text-[38px] font-bold text-slate-900 tracking-tight leading-tight mb-2">
                Welcome <span className="italic font-normal text-[#1b4d3e]">Back</span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-[14.5px] text-slate-600 leading-relaxed max-w-sm mx-auto text-balance">
                Log in to check your farm health, crop disease analytics, and saved advisories.
              </p>
            </div>

            {/* Notification Banners */}
            {registeredState && (
              <div className="mb-4 p-3.5 rounded-xl bg-[#e1f7e9] text-[#164233] text-xs sm:text-sm font-semibold border border-[#97deb5] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#216f4b] flex-shrink-0" />
                <span>Account created{registeredName ? ` for ${registeredName}` : ''}! Please log in to continue.</span>
              </div>
            )}

            {resetSuccessMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-[#e1f7e9] text-[#164233] text-xs sm:text-sm font-semibold border border-[#97deb5] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#216f4b] flex-shrink-0" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 text-red-800 text-xs sm:text-sm font-semibold border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mobile Number or Email */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5" htmlFor="login-identifier">
                  Mobile Number or Email
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5 text-[#216f4b]/70" />
                  </div>
                  <input
                    id="login-identifier"
                    name="identifier"
                    type="text"
                    required
                    placeholder="Enter your mobile or email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1b4d3e] focus:ring-3 focus:ring-[#1b4d3e]/15 transition-all duration-150"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider" htmlFor="login-password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setForgotError(null);
                      setForgotForm(prev => ({ ...prev, identifier: formData.email }));
                    }}
                    className="text-xs font-semibold text-[#216f4b] hover:text-[#164233] transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5 text-[#216f4b]/70" />
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="block w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1b4d3e] focus:ring-3 focus:ring-[#1b4d3e]/15 transition-all duration-150"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors cursor-pointer ${
                      showPassword ? 'text-[#1b4d3e]' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-[#1b4d3e] hover:bg-[#164233] active:bg-[#0b261e] rounded-xl shadow-md hover:shadow-lg shadow-[#1b4d3e]/20 active:scale-[0.99] transition-all duration-150 group cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform" />
                  )}
                  <span>{loading ? 'Logging in...' : 'Login'}</span>
                </button>
              </div>
            </form>

            {/* Quick Demo Test Accounts Box */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="bg-[#f7fcf8] border border-[#d6ecdd] rounded-2xl p-3.5 sm:p-4">
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <span className="text-xs font-bold text-[#0b261e] uppercase tracking-wide">
                    Quick Role Logins:
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Click to populate</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ email: 'farmer_demo', password: 'farmer123' })}
                    className="text-left px-3 py-2 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-slate-700 hover:text-emerald-900 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 flex flex-col cursor-pointer"
                  >
                    <span className="font-bold truncate text-emerald-800">🌾 Farmer</span>
                    <span className="text-[10px] text-slate-500">farmer_demo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ email: 'expert_demo', password: 'expert123' })}
                    className="text-left px-3 py-2 bg-white hover:bg-purple-50 border border-purple-200 rounded-xl text-xs text-slate-700 hover:text-purple-900 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50 flex flex-col cursor-pointer"
                  >
                    <span className="font-bold truncate text-purple-800">🔬 Agronomist</span>
                    <span className="text-[10px] text-slate-500">expert_demo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ email: 'officer_demo', password: 'officer123' })}
                    className="text-left px-3 py-2 bg-white hover:bg-red-50 border border-red-200 rounded-xl text-xs text-slate-700 hover:text-red-900 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50 flex flex-col cursor-pointer"
                  >
                    <span className="font-bold truncate text-red-800">🏛️ Officer</span>
                    <span className="text-[10px] text-slate-500">officer_demo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Registration Link */}
            <div className="mt-6 text-center">
              <p className="text-xs sm:text-sm text-slate-600">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-[#1b4d3e] hover:text-[#0b261e] underline underline-offset-4 decoration-[#97deb5] hover:decoration-[#1b4d3e] transition-all"
                >
                  Create one
                </Link>
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#dbece1] space-y-4 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#e1f7e9] text-[#1b4d3e] flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">Reset Password</h3>
                  <p className="text-xs text-slate-500">Set a new password for your account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs font-semibold border border-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>{forgotError}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Username, Email, or Mobile
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. daksh@gmail.com"
                  value={forgotForm.identifier}
                  onChange={(e) => setForgotForm({ ...forgotForm, identifier: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#1b4d3e] focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Enter new password"
                  value={forgotForm.newPassword}
                  onChange={(e) => setForgotForm({ ...forgotForm, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#1b4d3e] focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Re-enter new password"
                  value={forgotForm.confirmPassword}
                  onChange={(e) => setForgotForm({ ...forgotForm, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#1b4d3e] focus:outline-none bg-slate-50/50"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-5 py-2 rounded-xl bg-[#1b4d3e] text-white text-xs font-bold hover:bg-[#164233] transition-colors shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {forgotLoading ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
