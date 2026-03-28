import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
  requireMPApproval?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  requireMPApproval = false 
}) => {
  const { user, loading, role, profile } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check required role
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/auth" replace />;
  }

  // Check MP approval if required
  if (requireMPApproval && role === 'mp' && !profile?.is_approved) {
    return <Navigate to="/mp-pending" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
