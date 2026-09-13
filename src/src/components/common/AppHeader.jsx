import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  ChevronDown,
  MapPin,
  Sprout,
  ShieldAlert,
  Droplets,
  LayoutDashboard,
  CloudSun
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GoogleTranslateDropdown } from './GoogleTranslate';

const MODULE_ICONS = {
  dashboard: { icon: LayoutDashboard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  disease: { icon: ShieldAlert, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  irrigation: { icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50' },
};

/**
 * Unified top navigation header used across all application pages.
 * Ensures consistent layout, height, branding, and farmer profile.
 */
export default function AppHeader({
  title,
  subtitle,
  moduleId = 'dashboard',
  onMenuClick,
  centerContent,
  rightActions,
  badgeText,
  badgeType = 'emerald'
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const farmerName = user?.name || 'Farmer';
  const initial = farmerName.charAt(0).toUpperCase();
  const mod = MODULE_ICONS[moduleId] || MODULE_ICONS.dashboard;
  const ModIcon = mod.icon;

  const badgeStyles = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-20 shadow-xs gap-4">
      {/* Left: Mobile hamburger & module title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${mod.bg} flex items-center justify-center flex-shrink-0 shadow-xs`}>
            <ModIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${mod.color}`} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-extrabold text-gray-900 leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-gray-500 font-medium hidden sm:block truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Center content (if any, e.g. search, farm selector) */}
      {centerContent && (
        <div className="flex-1 flex items-center justify-center min-w-0">
          {centerContent}
        </div>
      )}

      {/* Right: Actions, Badges & Logged-in Farmer Profile */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">
        <GoogleTranslateDropdown variant="appHeader" />

        {rightActions}

        {badgeText && (
          <span className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${badgeStyles[badgeType] || badgeStyles.emerald}`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {badgeText}
          </span>
        )}

        {/* Farmer Profile Card (Identical across all pages) */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-100">
          <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-black shadow-sm flex-shrink-0">
            {initial}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-black text-gray-900 leading-none truncate max-w-[140px]">
              {farmerName}
            </p>
            <p className="text-[10px] font-semibold text-gray-400 truncate max-w-[140px] mt-0.5">
              {user?.email || 'Active Farmer'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
