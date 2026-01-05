import React from 'react';
import { Users, Store, Target, Activity } from 'lucide-react';
import { mockPromoters } from '../mockData';
import { useBranding } from '../context/BrandingContext';
import SectionHeader from '../components/SectionHeader';
import { ViewType } from '../types';

interface LiveMapViewProps {
  onNavigate: (view: ViewType) => void;
}

const LiveMapView: React.FC<LiveMapViewProps> = ({ onNavigate }) => {
  const { settings } = useBranding();

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
      <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 overflow-hidden relative shadow-inner group">
        <div className="absolute inset-0 bg-[#f0f2f5] flex items-center justify-center">
           <div 
             className="w-full h-full opacity-40 [background-size:24px_24px]"
             style={{ 
               backgroundImage: `radial-gradient(${settings.primaryColor} 1.5px, transparent 1.5px)`
             }} 
           />
           
           {/* Mock Map Pins */}
           {mockPromoters.map((p, index) => (
             <div 
               key={p.id} 
               className="absolute group/pin cursor-pointer transition-all hover:z-50"
               style={{ 
                 top: index === 0 ? '25%' : '66%', 
                 left: index === 0 ? '33%' : '50%' 
               }}
             >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full animate-ping opacity-25 scale-150" style={{ backgroundColor: settings.primaryColor }} />
                  <div className="relative z-10 h-16 w-16 p-1 bg-white rounded-2xl shadow-2xl transition-all group-hover/pin:scale-110">
                     <img src={p.foto} className="w-full h-full rounded-xl object-cover" alt="" />
                  </div>
                </div>
                <div className="absolute top-20 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-100 opacity-0 group-hover/pin:opacity-100 transition-all scale-90 group-hover/pin:scale-100 pointer-events-none">
                  <p className="text-sm font-black text-slate-900">{p.nome}</p>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold mt-1">
                     <Activity size={10} />
                     {p.atividadeAtual}
                  </div>
                </div>
             </div>
           ))}
        </div>
        
        <div className="absolute top-8 left-8">
           <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[1.5rem] shadow-2xl border border-white/50 ring-1 ring-slate-900/5">
              <div className="flex items-center gap-4">
                 <div className="relative h-4 w-4">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-40" />
                    <div className="relative h-4 w-4 bg-emerald-500 rounded-full border-2 border-white" />
                 </div>
                 <span className="text-base font-black text-slate-900 uppercase tracking-tighter">Ayra Live Tracking</span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-2 flex items-center gap-2">
                 <Users size={14} style={{ color: settings.primaryColor }} />
                 48 Promotores Ativos Hoje
              </p>
           </div>
        </div>
      </div>

      <div className="w-full lg:w-[400px] flex flex-col gap-8">
        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 flex-1 overflow-y-auto shadow-sm">
          <SectionHeader icon={<Activity style={{ color: settings.primaryColor }} size={24} />} title="Status Operacional" />
          <div className="mt-8 space-y-6">
            {mockPromoters.map(p => (
              <div key={p.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md group">
                <div className="flex items-center gap-4 mb-5">
                   <img src={p.foto} className="w-14 h-14 rounded-2xl shadow-sm border-2 border-white group-hover:scale-105 transition-all" alt="" />
                   <div>
                      <p className="text-lg font-black text-slate-900">{p.nome}</p>
                      <div className="flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-emerald-500" />
                         <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{p.status}</p>
                      </div>
                   </div>
                </div>
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-100">
                   <div className="flex items-start gap-3">
                      <Store size={16} style={{ color: settings.primaryColor }} className="mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Localização Atual</p>
                        <p className="text-xs font-bold text-slate-800">Pão de Açúcar - Oscar Freire</p>
                      </div>
                   </div>
                   <div className="flex items-start gap-3">
                      <Target size={16} className="text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Atividade em Curso</p>
                        <p className="text-xs font-bold text-slate-800">{p.atividadeAtual}</p>
                      </div>
                   </div>
                </div>
                <button 
                  className="w-full mt-5 py-3.5 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-blue-100 hover:brightness-110"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                   Acessar Execução Digital
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMapView;
