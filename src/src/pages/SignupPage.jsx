import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

export const SignupPage = () => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

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
      setErrorMsg(err.friendlyMessage || 'Unable to create account. Please try again.');
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
              {t('auth.signupTitle', 'Create Your AgriSmart Account')}
            </h1>
            <p className="text-sm text-stone-600 font-medium">
              {t('auth.signupSubtitle', 'Join thousands of farmers protecting their crops daily.')}
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
            {/* Name Field */}
            <div>
              <label className="block text-sm font-extrabold text-stone-900 mb-1.5">
                {t('auth.name', 'Your Name')}
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder={t('auth.namePlaceholder', 'Enter your name (e.g. Ramesh Patel)')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-stone-300 focus:border-agri-600 focus:ring-0 text-base font-semibold text-stone-900 placeholder:text-stone-400 farmer-touch-target"
                />
              </div>
            </div>

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
              <label className="block text-sm font-extrabold text-stone-900 mb-1.5">
                {t('auth.password', 'Password')}
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder={t('auth.passwordPlaceholder', 'Create a password (min 6 chars)')}
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
              loadingText="Creating account..."
            >
              {t('auth.signupBtn', 'Create Account')}
            </Button>
          </form>

          {/* Switch to Login */}
          <div className="text-center pt-2 border-t border-stone-200 text-sm font-semibold text-stone-600">
            <Link to="/login" className="text-agri-700 hover:text-agri-900 font-extrabold underline">
              {t('auth.alreadyAccount', 'Already have an account? Login')}
            </Link>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SignupPage;
