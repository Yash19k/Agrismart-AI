import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShieldAlert,
  CloudSun,
  Droplets,
  Sprout,
  MapPin,
  LogOut,
  X
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'disease', label: 'Disease Detection', icon: ShieldAlert },
  { id: 'weather', label: 'Weather & Advisory', icon: CloudSun },
  { id: 'irrigation', label: 'Irrigation', icon: Droplets },
  { id: 'crop', label: 'Crop Recommendation', icon: Sprout },
  { id: 'myfarm', label: 'My Farm', icon: MapPin },
];

/**
 * AppSidebar
 *
 * Shared across all application pages (Dashboard, Disease Detection, etc.)
 * Matches the user's reference screenshot:
 * - Green square logo with sprout icon
 * - "AgriSmart" & "Farmer-First AI Agriculture"
 * - Consistent navigation list with active soft green pill
 * - Bottom red "Log out" button
 */
export default function AppSidebar({
  activeItem = 'dashboard',
  onItemClick,
  mobileOpen = false,
  setMobileOpen,
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleNavClick = (id) => {
    if (onItemClick) {
      onItemClick(id);
    } else {
      if (id === 'dashboard') navigate('/dashboard');
      if (id === 'disease') navigate('/disease');
      if (id === 'irrigation') navigate('/irrigation');
      if (id === 'myfarm') navigate('/dashboard?modal=farm');
      if (id === 'weather') navigate('/dashboard?modal=weather');
      if (id === 'crop') navigate('/dashboard');
    }
    if (setMobileOpen) setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between bg-white border-r border-gray-100 w-56 flex-shrink-0 select-none">
      <div>
        {/* Brand Logo Header */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-[#047857] flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Sprout className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-gray-900 leading-none">AgriSmart</div>
            <div className="text-[10px] text-emerald-600 font-bold truncate mt-1">
              Farmer-First AI Agriculture
            </div>
          </div>
          {setMobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden ml-auto text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeItem === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleNavClick(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all text-left ${
                  isActive
                    ? 'bg-[#eefcf3] text-[#065f46] font-extrabold border border-emerald-100/80 shadow-xs'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-[#065f46] stroke-[2.4]' : 'text-gray-400 stroke-[2]'
                  }`}
                />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logged in Farmer Profile & Logout */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-gray-50/90 border border-gray-100 mb-2">
          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-black shadow-sm flex-shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'F'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-gray-900 truncate leading-none">
              {user?.name || 'Farmer'}
            </p>
            <p className="text-[10px] font-semibold text-gray-400 truncate mt-1">
              {user?.email || 'Active Account'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 stroke-[2.2]" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sticky sidebar */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setMobileOpen && setMobileOpen(false)}
          />
          <div className="relative z-10 h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
