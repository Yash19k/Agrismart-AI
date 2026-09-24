import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  CloudSun,
  Leaf,
  Bot,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GoogleTranslateDropdown } from './GoogleTranslate';
import api from '../../services/api';

const MODULE_ICONS = {
  dashboard: { icon: LayoutDashboard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  disease: { icon: ShieldAlert, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  assistant: { icon: Bot, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  irrigation: { icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50' },
  sustainability: { icon: Leaf, color: 'text-emerald-700', bg: 'bg-emerald-50' },
};

const ROLE_LABELS = {
  farmer: 'Farmer',
  expert: 'Expert',
  officer: 'Officer',
};

/**
 * Unified top navigation header with alert bell icon.
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
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const farmerName = user?.name || 'User';
  const initial = farmerName.charAt(0).toUpperCase();
  const mod = MODULE_ICONS[moduleId] || MODULE_ICONS.dashboard;
  const ModIcon = mod.icon;
  const roleLabel = ROLE_LABELS[userRole] || '';

  // Fetch unread alert count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/alerts/unread-count/');
      setUnreadCount(res.data?.unread_count || 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch alerts when dropdown opens
  const handleBellClick = async () => {
    if (!showAlertDropdown) {
      try {
        const res = await api.get('/alerts/');
        setAlerts(res.data || []);
      } catch {
        setAlerts([]);
      }
    }
    setShowAlertDropdown(!showAlertDropdown);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/alerts/mark-all-read/');
      setUnreadCount(0);
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    } catch { /* ignore */ }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.post(`/alerts/${id}/mark-read/`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch { /* ignore */ }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowAlertDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      {/* Right: Actions, Bell, Badges & Profile */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">
        <GoogleTranslateDropdown variant="appHeader" />

        {rightActions}

        {/* 🔔 Alert Bell Icon with Unread Count */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleBellClick}
            className="relative p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black px-1 shadow-sm animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Alert Dropdown */}
          {showAlertDropdown && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-900">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {alerts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    No notifications yet
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`px-4 py-3 flex gap-3 items-start cursor-pointer hover:bg-gray-50 transition-colors ${
                        !alert.is_read ? 'bg-emerald-50/50' : ''
                      }`}
                      onClick={() => !alert.is_read && handleMarkRead(alert.id)}
                    >
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!alert.is_read ? 'bg-emerald-500' : 'bg-transparent'}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-relaxed ${!alert.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {alert.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(alert.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {badgeText && (
          <span className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${badgeStyles[badgeType] || badgeStyles.emerald}`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {badgeText}
          </span>
        )}

        {/* User Profile Card */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-100">
          <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-black shadow-sm flex-shrink-0">
            {initial}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-black text-gray-900 leading-none truncate max-w-[140px]">
              {farmerName}
            </p>
            <p className="text-[10px] font-semibold text-gray-400 truncate max-w-[140px] mt-0.5">
              {roleLabel || user?.email || 'Active User'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
