import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type SetupState =
  | { status: 'loading' }
  | { status: 'already_initialized' }
  | { status: 'no_session' }
  | { status: 'ready'; email: string; userId: string }
  | { status: 'success' }
  | { status: 'error'; message: string };

export default function AdminSetup() {
  const navigate = useNavigate();
  const [state, setState] = useState<SetupState>({ status: 'loading' });
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const check = async () => {
      // 1. Check if already initialized
      const { data: initialized } = await db.rpc('check_admin_initialized');
      if (initialized) {
        setState({ status: 'already_initialized' });
        return;
      }

      // 2. Check if there's an active session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ status: 'no_session' });
        return;
      }

      setState({
        status: 'ready',
        email: session.user.email ?? '',
        userId: session.user.id,
      });
    };

    check();
  }, []);

  const handleSetup = async () => {
    if (state.status !== 'ready') return;
    setWorking(true);

    const { error } = await db
      .from('admin_users')
      .insert({
        id: state.userId,
        email: state.email,
        name: state.email.split('@')[0],
        role: 'SUPER_ADMIN',
        is_active: true,
      });

    if (error) {
      setState({ status: 'error', message: error.message });
      setWorking(false);
      return;
    }

    setState({ status: 'success' });
    setTimeout(() => navigate('/admin/login'), 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4">
            <Car className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-white">DrivioGo Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Configuração inicial</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {state.status === 'loading' && (
            <div className="text-center py-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Verificando...</p>
            </div>
          )}

          {state.status === 'already_initialized' && (
            <>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Admin já configurado</h2>
              <p className="text-sm text-slate-500 mb-4">
                O módulo administrativo já foi inicializado. Faça login normalmente.
              </p>
              <Button className="w-full" onClick={() => navigate('/admin/login')}>
                Ir para o login
              </Button>
            </>
          )}

          {state.status === 'no_session' && (
            <>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Autenticação necessária</h2>
              <p className="text-sm text-slate-500 mb-4">
                Crie uma conta com o e-mail <strong>admin_drivio@driviogo.com</strong> em{' '}
                <a href="/auth" className="text-primary underline">/auth</a> e volte aqui para
                concluir a configuração.
              </p>
              <Button className="w-full" onClick={() => navigate('/auth')}>
                Criar conta
              </Button>
            </>
          )}

          {state.status === 'ready' && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-slate-800">Inicializar admin</h2>
              </div>
              <p className="text-sm text-slate-500 mb-1">
                Conta autenticada como:
              </p>
              <p className="text-sm font-medium text-slate-800 mb-6">{state.email}</p>
              <p className="text-xs text-slate-400 mb-6">
                Esta ação cria o primeiro administrador (SUPER_ADMIN) e só pode ser feita
                uma vez. Após isso, novos admins devem ser criados dentro do painel.
              </p>
              <Button className="w-full" disabled={working} onClick={handleSetup}>
                {working ? 'Configurando...' : 'Criar primeiro administrador'}
              </Button>
            </>
          )}

          {state.status === 'success' && (
            <div className="text-center py-4">
              <ShieldCheck className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Pronto!</h2>
              <p className="text-sm text-slate-500">Redirecionando para o login...</p>
            </div>
          )}

          {state.status === 'error' && (
            <>
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" onClick={() => navigate('/admin/login')}>
                Voltar ao login
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
