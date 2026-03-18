import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  Tag,
  Upload,
  ClipboardList,
  History,
  LogOut,
  ChevronRight,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { getRoleLabel } from '@/lib/admin/permissions';
import { toast } from 'sonner';

const NAV_ITEMS = [
  {
    label: 'Painel',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Veículos',
    href: '/admin/veiculos',
    icon: Car,
  },
  {
    label: 'Tabela de Preços',
    href: '/admin/precos',
    icon: Tag,
  },
  {
    label: 'Importar Planilha',
    href: '/admin/importar',
    icon: Upload,
  },
  {
    label: 'Histórico de Importações',
    href: '/admin/importacoes',
    icon: History,
  },
  {
    label: 'Descontos',
    href: '/admin/descontos',
    icon: Percent,
  },
  {
    label: 'Logs do Sistema',
    href: '/admin/logs',
    icon: ClipboardList,
  },
];

export function AdminSidebar() {
  const { adminName, adminEmail, role, signOut } = useAdminAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.info('Sessão encerrada.');
    navigate('/admin/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-slate-900 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Car className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">DrivioGo</p>
            <p className="text-slate-400 text-xs">Painel Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="px-3 py-2 mb-1">
          <p className="text-white text-sm font-medium truncate">{adminName}</p>
          <p className="text-slate-400 text-xs truncate">{adminEmail}</p>
          {role && (
            <p className="text-slate-500 text-xs mt-0.5">{getRoleLabel(role)}</p>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
