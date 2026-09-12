import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, Mail, Lock, LogIn, X, CheckCircle, AlertTriangle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import Button from '../components/common/Button';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

export const LoginPage = () => {
  const { t } = useTranslation();
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
      setErrorMsg('Please enter both email/mobile and password.');
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
      setErrorMsg(err.friendlyMessage || 'Invalid login details. Please try again.');
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
    <div className="min-h-screen flex flex-col bg-[#faf8f5]">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-9 border-2 border-agri-200 shadow-farmer-lg space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-agri-600 to-agri-800 text-white flex items-center justify-center mx-auto shadow-md">
              <Sprout className="w-8 h-8 text-agri-200" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              {t('auth.loginTitle', 'Welcome Back')}
            </h1>
            <p className="text-sm text-stone-600 font-medium">
              {t('auth.loginSubtitle', 'Log in to check your farm health and saved advisories.')}
            </p>
          </div>

          {/* Registered success banner */}
          {registeredState && (
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-900 text-sm font-bold border-2 border-emerald-300 flex items-center gap-2">
              <span className="text-lg">🌱</span>
              <span>Account created{registeredName ? ` for ${registeredName}` : ''}! Please log in to continue.</span>
            </div>
          )}

          {/* Password reset success banner */}
          {resetSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-900 text-sm font-bold border-2 border-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{resetSuccessMsg}</span>
            </div>
          )}

          {/* Error display */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 text-red-800 text-sm font-semibold border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Phone Field */}
            <div>
              <label className="block text-sm font-extrabold text-stone-900 mb-1.5">
                {t('auth.email', 'Mobile Number or Email')}
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder={t('auth.emailPlaceholder', 'Enter your mobile or email')}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-stone-300 focus:border-agri-600 focus:ring-0 text-base font-semibold text-stone-900 placeholder:text-stone-400 farmer-touch-target"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-extrabold text-stone-900">
                  {t('auth.password', 'Password')}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotError(null);
                    setForgotForm(prev => ({ ...prev, identifier: formData.email }));
                  }}
                  className="text-xs font-bold text-agri-700 hover:text-agri-900 cursor-pointer"
                >
                  {t('auth.forgotPassword', 'Forgot password?')}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder={t('auth.loginPasswordPlaceholder', 'Enter your password')}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-stone-300 focus:border-agri-600 focus:ring-0 text-base font-semibold text-stone-900 placeholder:text-stone-400 farmer-touch-target"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              loadingText="Logging in..."
              icon={LogIn}
            >
              {t('auth.loginBtn', 'Login')}
            </Button>
          </form>

          {/* Switch to Signup */}
          <div className="text-center pt-2 border-t border-stone-200 text-sm font-semibold text-stone-600">
            <Link to="/signup" className="text-agri-700 hover:text-agri-900 font-extrabold underline">
              {t('auth.dontHaveAccount', "Don't have an account? Create one")}
            </Link>
          </div>

        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-agri-100 text-agri-800 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-stone-900">Reset Password</h3>
                  <p className="text-xs text-stone-500">Set a new password for your account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
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
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Username, Email, or Mobile
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. laddiya2007 or farmer@agrismart.ai"
                  value={forgotForm.identifier}
                  onChange={(e) => setForgotForm({ ...forgotForm, identifier: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-agri-600 focus:outline-none bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Enter new password"
                  value={forgotForm.newPassword}
                  onChange={(e) => setForgotForm({ ...forgotForm, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-agri-600 focus:outline-none bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Re-enter new password"
                  value={forgotForm.confirmPassword}
                  onChange={(e) => setForgotForm({ ...forgotForm, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-agri-600 focus:outline-none bg-stone-50"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-5 py-2 rounded-xl bg-agri-700 text-white text-xs font-bold hover:bg-agri-800 transition-colors shadow-sm"
                >
                  {forgotLoading ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default LoginPage;
