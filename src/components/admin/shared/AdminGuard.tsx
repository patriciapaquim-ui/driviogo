import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { hasPermission } from '@/lib/admin/permissions';
import type { AdminRole } from '@/types/admin';

interface AdminGuardProps {
  children: React.ReactNode;
  requiredRole?: AdminRole;
}

export function AdminGuard({ children, requiredRole = 'VIEWER' }: AdminGuardProps) {
  const { isAdmin, role, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!hasPermission(role, requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Acesso restrito</h2>
          <p className="text-slate-500 text-sm">
            Você não tem permissão para acessar esta área.
            Fale com o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
