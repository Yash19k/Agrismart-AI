import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShieldAlert,
  CloudSun,
  Droplets,
  Sprout,
  Leaf,
  Bot,
  MapPin,
  LogOut,
  X,
  Bug,
  Flame,
  UserCheck,
  CalendarCheck,
  Database,
  Activity,
  Shield
} from 'lucide-react';

/**
 * Navigation items with role visibility configuration.
 * Each item has a `roles` array — only users with a matching role see it.
 * An empty roles array means visible to all authenticated users.
 */
const ALL_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [] },
  { id: 'disease', label: 'Disease Detection', icon: ShieldAlert, roles: ['farmer'] },
  { id: 'pests', label: 'Pest Traps', icon: Bug, roles: ['farmer'] },
  { id: 'hotspots', label: 'Outbreak Hotspots', icon: Flame, roles: [] },
  { id: 'expert', label: 'Review Queue', icon: UserCheck, roles: ['expert', 'officer'] },
  { id: 'followups', label: 'Follow-ups & Recheck', icon: CalendarCheck, roles: ['farmer'] },
  { id: 'regional', label: 'Regional Dashboard', icon: Activity, roles: ['officer'] },
  { id: 'feedback', label: 'Retraining Dataset', icon: Database, roles: ['officer'] },
  { id: 'assistant', label: 'AI Agronomist', icon: Bot, badge: 'Groq', roles: ['farmer'] },
  { id: 'weather', label: 'Weather & Advisory', icon: CloudSun, roles: [] },
  { id: 'irrigation', label: 'Irrigation', icon: Droplets, roles: ['farmer'] },
  { id: 'sustainability', label: 'Sustainability Score', icon: Leaf, roles: ['farmer'] },
  { id: 'crop', label: 'Crop Recommendation', icon: Sprout, roles: ['farmer'] },
  { id: 'myfarm', label: 'My Farm', icon: MapPin, roles: ['farmer'] },
];

// Export filtered items for external use
export const NAV_ITEMS = ALL_NAV_ITEMS;

/**
 * Role badge labels for the user profile section
 */
const ROLE_LABELS = {
  farmer: 'Farmer',
  expert: 'Expert / Extension',
  officer: 'Agriculture Officer',
};

const ROLE_COLORS = {
  farmer: 'bg-emerald-700',
  expert: 'bg-blue-700',
  officer: 'bg-purple-700',
};

/**
 * AppSidebar — Role-aware navigation
 *
 * Renders nav items conditionally based on user.role:
 * - Farmers never see "Review Queue", "Regional Dashboard", "Retraining Dataset"
 * - Experts/Officers never see farmer tools like Disease Detection, Pests, Irrigation
 * - Shared items (Dashboard, Weather, Hotspots) visible to all
 */
export default function AppSidebar({
  activeItem = 'dashboard',
  onItemClick,
  mobileOpen = false,
  setMobileOpen,
}) {
  const navigate = useNavigate();
  const { user, logout, userRole } = useAuth();

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
      if (id === 'pests') navigate('/pests');
      if (id === 'hotspots') navigate('/hotspots');
      if (id === 'expert') navigate('/expert');
      if (id === 'followups') navigate('/followups');
      if (id === 'regional') navigate('/regional-monitoring');
      if (id === 'feedback') navigate('/feedback');
      if (id === 'assistant') navigate('/assistant');
      if (id === 'irrigation') navigate('/irrigation');
      if (id === 'sustainability') navigate('/sustainability');
      if (id === 'myfarm') navigate('/dashboard?modal=farm');
      if (id === 'weather') navigate('/weather');
      if (id === 'crop') navigate('/crop');
    }
    if (setMobileOpen) setMobileOpen(false);
  };

  // Filter nav items based on current user's role
  const visibleItems = ALL_NAV_ITEMS.filter(item => {
    if (item.roles.length === 0) return true; // visible to all
    return item.roles.includes(userRole);
  });

  const roleLabel = ROLE_LABELS[userRole] || 'User';
  const roleBgColor = ROLE_COLORS[userRole] || 'bg-emerald-700';

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

        {/* Navigation list — filtered by role */}
        <nav className="p-3 space-y-1">
          {visibleItems.map(({ id, label, icon: Icon }) => {
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
                {id === 'assistant' && (
                  <span className="ml-auto text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md border border-emerald-200/80">
                    Groq
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logged in User Profile & Logout */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-gray-50/90 border border-gray-100 mb-2">
          <div className={`w-8 h-8 rounded-full ${roleBgColor} text-white flex items-center justify-center text-xs font-black shadow-sm flex-shrink-0`}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-gray-900 truncate leading-none">
              {user?.name || 'User'}
            </p>
            <p className="text-[10px] font-semibold text-gray-400 truncate mt-0.5">
              {roleLabel}
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
