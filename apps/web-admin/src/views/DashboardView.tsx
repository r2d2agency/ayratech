import React, { useEffect, useState } from 'react';
import { 
  MapPinned, Camera, Activity, Target, TrendingUp, RefreshCw
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import { ViewType } from '../types';
import api from '../api/client';
import { useBranding } from '../context/BrandingContext';

interface DashboardViewProps {
  onNavigate: (view: ViewType) => void;
}

interface DashboardStats {
  visits: { value: string; trend: string };
  photos: { value: string; trend: string };
  execution: { value: string; trend: string };
  ruptures: { value: string; sub: string };
  clients: Array<{
    id: string;
    name: string;
    logo: string;
    percentage: number;
  }>;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { settings } = useBranding();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week'>('today');

  useEffect(() => {
    fetchDashboardStats();
  }, [period]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/dashboard/stats?period=${period}`);
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard Operacional</h1>
          <p className="text-slate-500 font-medium text-lg">Seu hub de controle Ayratech.</p>
        </div>
        <div className="bg-white p-1 rounded-2xl border border-slate-200 flex gap-1 shadow-sm">
          <button 
            onClick={() => setPeriod('today')}
            className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${
              period === 'today' 
                ? 'text-white shadow-md shadow-blue-200' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
            style={{ backgroundColor: period === 'today' ? settings.primaryColor : 'transparent' }}
          >
            HOJE
          </button>
          <button 
            onClick={() => setPeriod('week')}
            className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${
              period === 'week' 
                ? 'text-white shadow-md shadow-blue-200' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
            style={{ backgroundColor: period === 'week' ? settings.primaryColor : 'transparent' }}
          >
            ESTA SEMANA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<MapPinned className="text-blue-600" />} 
          label="Visitas Realizadas" 
          value={stats?.visits.value || '0'} 
          trend={stats?.visits.trend} 
          color="bg-blue-50" 
        />
        <StatCard 
          icon={<Camera className="text-purple-600" />} 
          label="Fotos Enviadas" 
          value={stats?.photos.value || '0'} 
          trend={stats?.photos.trend} 
          color="bg-purple-50" 
        />
        <StatCard 
          icon={<Activity className="text-emerald-600" />} 
          label="Execução Perfeita" 
          value={stats?.execution.value || '0%'} 
          trend={stats?.execution.trend} 
          color="bg-emerald-50" 
        />
        <StatCard 
          icon={<Target className="text-amber-600" />} 
          label="Rupturas Alertas" 
          value={stats?.ruptures.value || '00'} 
          sub={stats?.ruptures.sub} 
          color="bg-amber-50" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <SectionHeader icon={<TrendingUp style={{ color: settings.primaryColor }} size={22} />} title="Performance por Marca" />
          <div className="mt-8 space-y-6">
            {stats?.clients.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                    Nenhuma marca com dados no período.
                </div>
            ) : (
                stats?.clients.map(c => (
                <div key={c.id} className="group">
                    <div className="flex items-center gap-5 mb-3">
                    <div className="w-12 h-12 rounded-xl border border-slate-100 flex items-center justify-center p-2 bg-white transition-all group-hover:scale-110">
                        {c.logo && c.logo.startsWith('http') ? (
                            <img src={c.logo} alt={c.name} className="object-contain w-full h-full" />
                        ) : (
                            <div className="text-xs font-bold text-slate-300">{c.name.substring(0, 2).toUpperCase()}</div>
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-end">
                        <span className="text-base font-black text-slate-900">{c.name}</span>
                        <span className="text-sm font-black" style={{ color: settings.primaryColor }}>{c.percentage}%</span>
                        </div>
                    </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                        className="h-full transition-all duration-1000" 
                        style={{ width: `${c.percentage}%`, backgroundColor: settings.primaryColor }} 
                    />
                    </div>
                </div>
                ))
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <SectionHeader icon={<MapPinned style={{ color: settings.primaryColor }} size={22} />} title="Mapa Rápido" />
          <div className="mt-8 rounded-2xl bg-slate-50 h-64 border border-slate-100 flex items-center justify-center relative overflow-hidden group shadow-inner">
            <img src="https://picsum.photos/800/400?grayscale" className="absolute inset-0 w-full h-full object-cover opacity-50 transition-all duration-700 group-hover:scale-105" alt="Map" />
            <button 
              onClick={() => onNavigate('live_map')}
              className="relative z-10 bg-white px-8 py-3 rounded-2xl shadow-2xl font-black hover:scale-105 transition-all hover:bg-slate-50"
              style={{ color: settings.primaryColor }}
            >
              Abrir Monitoramento Full
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
