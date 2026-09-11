import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

export const LoginPage = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password.trim()) {
      setErrorMsg('Please enter both email/mobile and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await login(formData.email, formData.password);
      setSuccessMsg('Login Successful! Welcome back.');
      window.alert('Login Successful! Welcome back.');
    } catch (err) {
      setErrorMsg(err.friendlyMessage || 'Invalid login details. Please try again.');
    } finally {
      setLoading(false);
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

          {/* Success display */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-900 text-sm font-bold border-2 border-emerald-300 flex items-center gap-2">
              <span className="text-lg">✅</span>
              <span>{successMsg}</span>
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
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset SMS will be sent to your registered phone number.'); }} className="text-xs font-bold text-agri-700 hover:text-agri-900">
                  {t('auth.forgotPassword', 'Forgot password?')}
                </a>
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

      <Footer />
    </div>
  );
};

export default LoginPage;
