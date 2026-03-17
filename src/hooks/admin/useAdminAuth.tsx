import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractAdminRole } from '@/lib/admin/permissions';
import type { AdminRole } from '@/types/admin';

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

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const checkAdminSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsAdmin(false);
      setRole(null);
      setLoading(false);
      return;
    }

    const appMetadata = session.user.app_metadata as Record<string, unknown>;
    const adminRole = extractAdminRole(appMetadata);

    // DEV fallback: treat any authenticated user as ADMIN when no role is set
    // Remove this in production after configuring app_metadata on Supabase
    const effectiveRole = adminRole ?? (import.meta.env.DEV ? 'ADMIN' : null);

    setRole(effectiveRole);
    setIsAdmin(effectiveRole !== null);
    setAdminName(
      (session.user.user_metadata?.full_name as string) ||
      session.user.email?.split('@')[0] ||
      'Admin'
    );
    setAdminEmail(session.user.email ?? '');
    setLoading(false);
  };

  useEffect(() => {
    checkAdminSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminSession();
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'E-mail ou senha incorretos.' };
      }
      return { error: 'Não foi possível fazer login. Tente novamente.' };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setRole(null);
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
