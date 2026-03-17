import type { AdminRole } from '@/types/admin';

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  VIEWER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
};

/** Returns true if `userRole` meets or exceeds `requiredRole`. */
export function hasPermission(userRole: AdminRole | null | undefined, requiredRole: AdminRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function getRoleLabel(role: AdminRole): string {
  const labels: Record<AdminRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Administrador',
    VIEWER: 'Visualizador',
  };
  return labels[role];
}

/** Extracts admin role from Supabase JWT app_metadata. */
export function extractAdminRole(appMetadata: Record<string, unknown> | undefined): AdminRole | null {
  const role = appMetadata?.role as string | undefined;
  if (role === 'super_admin') return 'SUPER_ADMIN';
  if (role === 'admin') return 'ADMIN';
  if (role === 'viewer') return 'VIEWER';
  return null;
}
