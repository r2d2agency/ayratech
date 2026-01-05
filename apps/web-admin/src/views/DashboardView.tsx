import React from 'react';
import { 
  MapPinned, Camera, Activity, Target, TrendingUp 
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import { mockClients } from '../mockData';
import { ViewType } from '../types';

interface DashboardViewProps {
  onNavigate: (view: ViewType) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard Operacional</h1>
        <p className="text-slate-500 font-medium text-lg">Seu hub de controle Ayratech.</p>
      </div>
      <div className="bg-white p-1 rounded-2xl border border-slate-200 flex gap-1 shadow-sm">
        <button className="px-6 py-2 text-xs font-black bg-[var(--primary-color)] text-white rounded-xl shadow-md shadow-blue-200">HOJE</button>
        <button className="px-6 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">ESTA SEMANA</button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard icon={<MapPinned className="text-blue-600" />} label="Visitas Realizadas" value="128" trend="+15%" color="bg-blue-50" />
      <StatCard icon={<Camera className="text-purple-600" />} label="Fotos Enviadas" value="452" trend="+8%" color="bg-purple-50" />
      <StatCard icon={<Activity className="text-emerald-600" />} label="Execução Perfeita" value="88%" trend="+2%" color="bg-emerald-50" />
      <StatCard icon={<Target className="text-amber-600" />} label="Rupturas Alertas" value="07" sub="Ação requerida" color="bg-amber-50" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <SectionHeader icon={<TrendingUp className="text-[var(--primary-color)]" size={22} />} title="Performance por Marca" />
        <div className="mt-8 space-y-6">
          {mockClients.map(c => (
            <div key={c.id} className="group">
              <div className="flex items-center gap-5 mb-3">
                <div className="w-12 h-12 rounded-xl border border-slate-100 flex items-center justify-center p-2 bg-white transition-all group-hover:scale-110">
                  <img src={c.logo} alt={c.nome} className="object-contain" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-end">
                    <span className="text-base font-black text-slate-900">{c.nome}</span>
                    <span className="text-sm font-black text-[var(--primary-color)]">92%</span>
                  </div>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-[var(--primary-color)] h-full transition-all duration-1000" style={{ width: '92%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <SectionHeader icon={<MapPinned className="text-[var(--primary-color)]" size={22} />} title="Mapa Rápido" />
        <div className="mt-8 rounded-2xl bg-slate-50 h-64 border border-slate-100 flex items-center justify-center relative overflow-hidden group shadow-inner">
          <img src="https://picsum.photos/800/400?grayscale" className="absolute inset-0 w-full h-full object-cover opacity-50 transition-all duration-700 group-hover:scale-105" alt="Map" />
          <button 
            onClick={() => onNavigate('live_map')}
            className="relative z-10 bg-white px-8 py-3 rounded-2xl shadow-2xl font-black text-[var(--primary-color)] hover:scale-105 transition-all hover:bg-slate-50"
          >
            Abrir Monitoramento Full
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default DashboardView;
