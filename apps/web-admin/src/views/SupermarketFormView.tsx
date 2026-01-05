import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import { ViewType } from '../types';

interface SupermarketFormViewProps {
  onNavigate: (view: ViewType) => void;
}

const SupermarketFormView: React.FC<SupermarketFormViewProps> = ({ onNavigate }) => {
  const { settings } = useBranding();

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto">
       <div className="flex items-center gap-6 mb-10">
          <button onClick={() => onNavigate('supermarkets_list')} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all">
             <ChevronRight className="rotate-180" size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Novo Cadastro PDV</h1>
            <p className="text-slate-500 font-bold">Preencha os dados operacionais da unidade.</p>
          </div>
       </div>
       <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="md:col-span-2">
                <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Nome Fantasia do Supermercado</label>
                <input type="text" className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" placeholder="Ex: Pão de Açúcar - Loja 102" />
             </div>
             <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Rede / Grupo</label>
                <select className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-black text-slate-700">
                   <option>GPA (Grupo Pão de Açúcar)</option>
                   <option>Carrefour Brasil</option>
                   <option>Grupo Big</option>
                   <option>Independente</option>
                </select>
             </div>
             <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Cidade</label>
                <input type="text" className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" placeholder="Cidade" />
             </div>
          </div>
          <div className="mt-12 pt-10 border-t border-slate-100 flex justify-end gap-6">
             <button onClick={() => onNavigate('supermarkets_list')} className="px-8 py-4 font-black text-slate-400 hover:text-slate-600 transition-all">Descartar</button>
             <button 
                className="px-12 py-4 text-white font-black rounded-2xl shadow-2xl shadow-blue-200 hover:scale-105 transition-all"
                style={{ backgroundColor: settings.primaryColor }}
                onClick={() => {
                  alert('Cadastro salvo com sucesso! (Mock)');
                  onNavigate('supermarkets_list');
                }}
             >
               Efetivar Cadastro
             </button>
        </div>
     </div>
  </div>
  );
};

export default SupermarketFormView;
