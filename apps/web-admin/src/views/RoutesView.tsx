import React from 'react';
import { Calendar, MapPinned } from 'lucide-react';
import { mockPromoters } from '../mockData';
import { useBranding } from '../context/BrandingContext';

const RoutesView: React.FC = () => {
  const { settings } = useBranding();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Planejador Inteligente</h1>
          <p className="text-slate-500 font-medium text-lg">Defina roteiros e metas de visitação.</p>
        </div>
        <button 
          className="text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-blue-200"
          style={{ backgroundColor: settings.primaryColor }}
        >
          <Calendar size={20} /> Criar Novo Roteiro
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
           <h3 className="text-xs font-black text-slate-400 uppercase mb-8 tracking-[0.2em]">Passo 1: Promotor</h3>
           <div className="space-y-3">
              {mockPromoters.map(p => (
                <button key={p.id} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 transition-all text-left group hover:bg-blue-50"
                  style={{ borderColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = settings.primaryColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <img src={p.foto} className="w-10 h-10 rounded-xl group-hover:scale-110 transition-all" alt="" />
                  <span className="text-sm font-black text-slate-800">{p.nome}</span>
                </button>
              ))}
           </div>
        </div>
        <div className="lg:col-span-3 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 flex flex-col items-center justify-center text-center">
           <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <MapPinned size={48} className="text-slate-300" />
           </div>
           <h3 className="text-2xl font-black text-slate-400 mb-2">Editor Visual de Rotas</h3>
           <p className="text-slate-400 max-w-sm font-medium">Selecione um promotor à esquerda para começar a adicionar pontos de venda e marcas ao roteiro do dia.</p>
        </div>
      </div>
    </div>
  );
};

export default RoutesView;
