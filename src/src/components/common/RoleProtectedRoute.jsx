import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * RoleProtectedRoute — wraps routes with role verification and loading guards.
 *
 * Ensures:
 * 1. Waits for /api/auth/me/ session verification before making routing decisions.
 * 2. If unauthenticated: redirects to /login.
 * 3. If role is not allowed: redirects to /dashboard with state containing a notice.
 */
export default function RoleProtectedRoute({ children, allow = [] }) {
  const { isAuthenticated, userRole, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-xs font-semibold">Verifying secure session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allow.length > 0 && !allow.includes(userRole)) {
    return (
      <Navigate
        to="/dashboard"
        state={{
          unauthorizedNotice: `Access restricted. That module is not accessible for the '${userRole}' role.`,
        }}
        replace
      />
    );
  }

  return children;
}
