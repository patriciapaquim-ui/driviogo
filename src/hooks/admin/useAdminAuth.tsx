import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AdminRole } from '@/types/admin';

// ─── Demo / bypass mode ───────────────────────────────────────────────────────
// Set to true to skip authentication entirely and present the admin module
// with a mock super-admin session (no database required).
const ADMIN_BYPASS = true;
// ─────────────────────────────────────────────────────────────────────────────

interface AdminUserRow {
  role: AdminRole;
  name: string;
  is_active: boolean;
}

interface AdminAuthContextType {
  isAdmin: boolean;
  role: AdminRole | null;
  adminName: string;
  adminEmail: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// admin_users is not in the auto-generated types yet; cast to bypass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(ADMIN_BYPASS);
  const [role, setRole] = useState<AdminRole | null>(ADMIN_BYPASS ? 'SUPER_ADMIN' : null);
  const [adminName, setAdminName] = useState(ADMIN_BYPASS ? 'Admin Demo' : '');
  const [adminEmail, setAdminEmail] = useState(ADMIN_BYPASS ? 'admin_drivio@driviogo.com' : '');
  const [loading, setLoading] = useState(!ADMIN_BYPASS);

  const checkAdminSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setIsAdmin(false);
      setRole(null);
      setLoading(false);
      return;
    }

    // Query admin_users directly — no app_metadata dependency
    const { data: row } = await db
      .from('admin_users')
      .select('role, name, is_active')
      .eq('id', session.user.id)
      .maybeSingle();

    const adminUser = row as AdminUserRow | null;

    if (!adminUser || !adminUser.is_active) {
      setIsAdmin(false);
      setRole(null);
      setAdminName('');
      setAdminEmail('');
      setLoading(false);
      return;
    }

    setRole(adminUser.role);
    setIsAdmin(true);
    setAdminName(adminUser.name || session.user.email?.split('@')[0] || 'Admin');
    setAdminEmail(session.user.email ?? '');
    setLoading(false);
  };

  useEffect(() => {
    if (ADMIN_BYPASS) return;
    checkAdminSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminSession();
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (ADMIN_BYPASS) return { error: null };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'E-mail ou senha incorretos.' };
      }
      return { error: 'Não foi possível fazer login. Tente novamente.' };
    }

    // Update last_login_at (fire and forget)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      db.from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', session.user.id)
        .then(() => {});
    }

    return { error: null };
  };

  const signOut = async () => {
    if (ADMIN_BYPASS) return;
    await supabase.auth.signOut();
    setIsAdmin(false);
    setRole(null);
    setAdminName('');
    setAdminEmail('');
  };

  return (
    <AdminAuthContext.Provider value={{ isAdmin, role, adminName, adminEmail, loading, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};
