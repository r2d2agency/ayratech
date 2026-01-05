
import React from 'react';
import { Search, Bell } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm h-16">
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#196ee6]" size={18} />
          <input 
            type="text" 
            placeholder="Busca global..." 
            className="h-10 w-64 xl:w-80 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#196ee6]/10 focus:border-[#196ee6] transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 transition-colors border border-slate-200">
          <Bell size={20} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-slate-900">Admin Ayratech</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Supervisor Operacional</p>
          </div>
          <div className="h-10 w-10 overflow-hidden rounded-xl ring-2 ring-slate-100 cursor-pointer transition-all hover:ring-blue-100">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
