import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * RoleProtectedRoute — wraps a route to restrict access by user role.
 *
 * Usage in App.jsx:
 *   <Route path="/expert" element={
 *     <RoleProtectedRoute allow={['expert', 'officer']}>
 *       <ExpertReviewPage />
 *     </RoleProtectedRoute>
 *   } />
 *
 * If the user's role is not in the `allow` list, they are redirected to /dashboard.
 */
export default function RoleProtectedRoute({ children, allow = [] }) {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allow.length > 0 && !allow.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
