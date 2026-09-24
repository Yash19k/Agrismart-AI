import React, { useEffect } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNavItemsForRole } from '../../config/navigation';
import { Sprout, LogOut, X, ChevronRight } from 'lucide-react';

const ROLE_LABELS = {
  farmer: 'Farmer / Producer',
  expert: 'Agronomist / Expert',
  officer: 'Agriculture Officer',
};

const ROLE_COLORS = {
  farmer: 'bg-emerald-700',
  expert: 'bg-blue-700',
  officer: 'bg-purple-700',
};

export default function AppSidebar({
  mobileOpen = false,
  setMobileOpen,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, userRole, isDemoUser } = useAuth();

  // Close mobile sidebar on route change
  useEffect(() => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const visibleItems = getNavItemsForRole(userRole);
  const primaryItems = visibleItems.filter((i) => i.group !== 'more_tools');
  const moreToolsItems = visibleItems.filter((i) => i.group === 'more_tools');

  const roleLabel = ROLE_LABELS[userRole] || 'User';
  const roleBgColor = ROLE_COLORS[userRole] || 'bg-emerald-700';

  const renderNavButton = (item) => {
    const Icon = item.icon;
    const isActive = matchPath({ path: item.path, end: true }, location.pathname) ||
      (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          navigate(item.path);
          if (setMobileOpen) setMobileOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all text-left ${
          isActive
            ? 'bg-[#eefcf3] text-[#065f46] font-extrabold border border-emerald-200/80 shadow-xs'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <Icon
          className={`w-4 h-4 flex-shrink-0 ${
            isActive ? 'text-[#065f46] stroke-[2.4]' : 'text-gray-400 stroke-[2]'
          }`}
        />
        <span className="truncate">{item.label}</span>
        {item.badge && (
          <span className="ml-auto text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md border border-emerald-200/80">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between bg-white border-r border-gray-100 w-60 flex-shrink-0 select-none overflow-y-auto">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-[#047857] flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Sprout className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-gray-900 leading-none">AgriSmart-AI</div>
            <div className="text-[10px] text-emerald-700 font-bold truncate mt-1">
              Intelligent Agriculture
            </div>
          </div>
          {setMobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden ml-auto text-gray-400 hover:text-gray-600 p-1"
              aria-label="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Demo Mode Notice */}
        {isDemoUser && (
          <div className="mx-3 mt-3 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Demo Account</span>
          </div>
        )}

        {/* Primary Workflow Navigation */}
        <nav className="p-3 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
            Workflow Stages
          </div>
          {primaryItems.map(renderNavButton)}

          {/* Secondary Tools Group */}
          {moreToolsItems.length > 0 && (
            <div className="pt-4 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
                More Tools
              </div>
              {moreToolsItems.map(renderNavButton)}
            </div>
          )}
        </nav>
      </div>

      {/* User Card & Logout */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white border border-gray-100 mb-2 shadow-xs">
          <div className={`w-8 h-8 rounded-full ${roleBgColor} text-white flex items-center justify-center text-xs font-black shadow-sm flex-shrink-0`}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-gray-900 truncate leading-none">
              {user?.name || 'User'}
            </p>
            <p className="text-[10px] font-semibold text-gray-500 truncate mt-0.5">
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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
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
