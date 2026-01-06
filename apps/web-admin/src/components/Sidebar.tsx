import React, { useState } from 'react';
import { 
  LayoutGrid, 
  MapPinned, 
  Store, 
  Briefcase, 
  Package, 
  Users, 
  Calendar, 
  Camera, 
  ChevronDown, 
  ChevronRight,
  Settings,
  LogOut,
  ChevronLeft,
  Shield
} from 'lucide-react';
import { ViewType } from '../types';
import { useBranding } from '../context/BrandingContext';

interface SidebarProps {
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
  expanded: boolean;
  setExpanded: (val: boolean) => void;
  userRole?: string;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, expanded, setExpanded, userRole, onLogout }) => {
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const { settings } = useBranding();
  
  const canViewEmployees = userRole && ['admin', 'rh', 'manager'].includes(userRole);

  const toggleSubmenu = (id: string) => {
    if (!expanded) {
      setExpanded(true);
      setOpenSubmenu(id);
      return;
    }
    setOpenSubmenu(openSubmenu === id ? null : id);
  };

  const navItem = (id: ViewType, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => onNavigate(id)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all relative group ${
        activeView === id 
          ? 'text-white shadow-lg shadow-blue-200' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
      style={activeView === id ? { backgroundColor: settings.primaryColor } : {}}
    >
      <div className="min-w-[24px] flex justify-center">{icon}</div>
      <span className={`font-bold text-sm transition-all duration-300 overflow-hidden whitespace-nowrap ${
        expanded ? 'w-auto opacity-100' : 'w-0 opacity-0'
      }`}>
        {label}
      </span>
      {!expanded && (
        <div className="absolute left-16 bg-slate-900 text-white text-xs py-1.5 px-3 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
          {label}
        </div>
      )}
    </button>
  );

  return (
    <aside 
      className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 transition-all duration-300 z-[60] flex flex-col ${
        expanded ? 'w-64' : 'w-20'
      }`}
    >
      {/* Header / Logo */}
      <div className="p-4 h-16 flex items-center gap-3 mb-4">
        <div 
          onClick={() => onNavigate('dashboard')}
          className="flex h-10 w-10 min-w-[40px] items-center justify-center rounded-xl text-white cursor-pointer shadow-md"
          style={{ backgroundColor: settings.primaryColor }}
        >
          {settings.logoUrl ? (
             <img src={settings.logoUrl} alt="" className="w-6 h-6 object-contain brightness-0 invert" />
          ) : (
             <LayoutGrid size={24} />
          )}
        </div>
        <span className={`font-black text-xl text-slate-900 tracking-tighter transition-all duration-300 truncate ${
          expanded ? 'opacity-100' : 'opacity-0 w-0'
        }`}>
          {settings.companyName}
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 space-y-1 overflow-y-auto">
        <p className={`text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2 h-4 overflow-hidden transition-all ${expanded ? 'opacity-100' : 'opacity-0'}`}>
          Principal
        </p>
        {navItem('dashboard', <LayoutGrid size={20} />, 'Dashboard')}
        {navItem('live_map', <MapPinned size={20} />, 'Monitoramento')}

        <div className="pt-4" />
        <p className={`text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2 h-4 overflow-hidden transition-all ${expanded ? 'opacity-100' : 'opacity-0'}`}>
          Cadastros
        </p>
        
        {/* Gestão Submenu */}
        <div>
          <button
            onClick={() => toggleSubmenu('gestao')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-slate-500 hover:bg-slate-100 hover:text-slate-900 relative group`}
          >
            <div className="min-w-[24px] flex justify-center"><Briefcase size={20} /></div>
            <span className={`font-bold text-sm flex-1 text-left transition-all duration-300 overflow-hidden whitespace-nowrap ${
              expanded ? 'w-auto opacity-100' : 'w-0 opacity-0'
            }`}>
              Gestão
            </span>
            {expanded && (
              openSubmenu === 'gestao' ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            )}
            {!expanded && (
              <div className="absolute left-16 bg-slate-900 text-white text-xs py-1.5 px-3 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                Gestão
              </div>
            )}
          </button>

          {(openSubmenu === 'gestao' && expanded) && (
            <div className="mt-1 ml-4 space-y-1 border-l border-slate-100 pl-4 animate-in slide-in-from-top-2 duration-200">
              <button 
                onClick={() => onNavigate('clients')}
                className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all ${activeView === 'clients' ? 'text-[var(--primary-color)] bg-blue-50' : 'text-slate-500 hover:text-[var(--primary-color)]'}`}
              >
                Clientes / Indústrias
              </button>
              {canViewEmployees && (
              <button 
                onClick={() => onNavigate('employees')}
                className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all ${activeView === 'employees' ? 'text-[var(--primary-color)] bg-blue-50' : 'text-slate-500 hover:text-[var(--primary-color)]'}`}
              >
                Funcionários
              </button>
              )}
              <button 
                onClick={() => onNavigate('products')}
                className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all ${activeView === 'products' ? 'text-[var(--primary-color)] bg-blue-50' : 'text-slate-500 hover:text-[var(--primary-color)]'}`}
              >
                Produtos
              </button>
              <button 
                onClick={() => onNavigate('supermarkets_list')}
                className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all ${activeView === 'supermarkets_list' ? 'text-[var(--primary-color)] bg-blue-50' : 'text-slate-500 hover:text-[var(--primary-color)]'}`}
              >
                Supermercados
              </button>
              <button 
                onClick={() => onNavigate('supermarket_groups_list')}
                className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all ${activeView === 'supermarket_groups_list' ? 'text-[var(--primary-color)] bg-blue-50' : 'text-slate-500 hover:text-[var(--primary-color)]'}`}
              >
                Redes / Grupos
              </button>
            </div>
          )}
        </div>

        <div className="pt-4" />
        <p className={`text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2 h-4 overflow-hidden transition-all ${expanded ? 'opacity-100' : 'opacity-0'}`}>
          Operação
        </p>
        {navItem('routes', <Calendar size={20} />, 'Planejador de Rotas')}
        
        <div className="pt-4" />
        <p className={`text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2 h-4 overflow-hidden transition-all ${expanded ? 'opacity-100' : 'opacity-0'}`}>
          Sistema
        </p>
        {navItem('admin', <Settings size={20} />, 'Administração')}
      </div>

      {/* Footer Actions */}
      <div className="p-4 space-y-1">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-slate-100 transition-all"
        >
          <div className="min-w-[24px] flex justify-center">
            {expanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </div>
          <span className={`font-bold text-sm transition-all ${expanded ? 'opacity-100' : 'opacity-0 w-0'}`}>Recolher Menu</span>
        </button>
        <button 
          onClick={() => {
            if (onLogout) onLogout();
          }}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-50 transition-all"
        >
          <div className="min-w-[24px] flex justify-center"><LogOut size={20} /></div>
          <span className={`font-bold text-sm transition-all ${expanded ? 'opacity-100' : 'opacity-0 w-0'}`}>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
