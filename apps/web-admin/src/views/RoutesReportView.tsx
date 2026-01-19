import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import { BarChart2, CheckCircle2, XCircle, AlertTriangle, Calendar, Filter, Download, Users } from 'lucide-react';
import api from '../api/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface RouteReportItem {
  id: string;
  date: string;
  promoter: {
    id: string;
    fullName: string;
    supervisor?: {
      id: string;
      fullName: string;
    };
  };
  items: Array<{
    id: string;
    status: string;
    supermarket: {
      fantasyName: string;
    };
    products: Array<{
      isStockout: boolean;
    }>;
  }>;
}

const RoutesReportView: React.FC = () => {
  const { settings } = useBranding();
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<RouteReportItem[]>([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  
  // Computed stats
  const [stats, setStats] = useState({
    total: 0,
    executed: 0,
    notExecuted: 0,
    withIssues: 0
  });

  const [supervisorData, setSupervisorData] = useState<any[]>([]);
  const [promoterData, setPromoterData] = useState<any[]>([]);

  useEffect(() => {
    fetchRoutes();
  }, [dateFilter]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      // In a real scenario, we might want to filter by date in the backend
      // But for now we fetch all and filter client side as requested or implied by existing service
      const res = await api.get('/routes');
      const allRoutes: RouteReportItem[] = res.data;

      // Filter by date
      const filtered = allRoutes.filter(r => r.date.startsWith(dateFilter));
      
      processData(filtered);
      setRoutes(filtered);
    } catch (err) {
      console.error('Error fetching routes report:', err);
    } finally {
      setLoading(false);
    }
  };

  const processData = (data: RouteReportItem[]) => {
    let executedCount = 0;
    let issuesCount = 0;
    
    // Groupings
    const supervisors: Record<string, { name: string, executed: number, total: number }> = {};
    const promoters: Record<string, { name: string, executed: number, total: number }> = {};

    data.forEach(route => {
      // Check execution status based on items
      // A route is "executed" if at least one item is CHECKOUT or COMPLETED (or similar status logic)
      // Or we can check if all items are handled. Let's assume if any item is handled it's "Started/Executed"
      // But typically "Executed" means completed.
      // Let's look at route items.
      const isExecuted = route.items.some(i => ['CHECKOUT', 'COMPLETED'].includes(i.status));
      if (isExecuted) executedCount++;

      // Check issues (ruptures)
      const hasIssues = route.items.some(i => i.products.some(p => p.isStockout));
      if (hasIssues) issuesCount++;

      // Supervisor Stats
      const supName = route.promoter.supervisor?.fullName || 'Sem Supervisor';
      if (!supervisors[supName]) supervisors[supName] = { name: supName, executed: 0, total: 0 };
      supervisors[supName].total++;
      if (isExecuted) supervisors[supName].executed++;

      // Promoter Stats
      const promName = route.promoter.fullName || 'Sem Nome';
      if (!promoters[promName]) promoters[promName] = { name: promName, executed: 0, total: 0 };
      promoters[promName].total++;
      if (isExecuted) promoters[promName].executed++;
    });

    setStats({
      total: data.length,
      executed: executedCount,
      notExecuted: data.length - executedCount,
      withIssues: issuesCount
    });

    setSupervisorData(Object.values(supervisors));
    setPromoterData(Object.values(promoters));
  };

  const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6'];

  const getStatusBadge = (route: RouteReportItem) => {
    const isExecuted = route.items.some(i => ['CHECKOUT', 'COMPLETED'].includes(i.status));
    const hasIssues = route.items.some(i => i.products.some(p => p.isStockout));

    if (!isExecuted) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
          <XCircle size={14} />
          Não Executado
        </span>
      );
    }
    
    if (hasIssues) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
          <AlertTriangle size={14} />
          Com Ruptura
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
        <CheckCircle2 size={14} />
        Verificado
      </span>
    );
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <SectionHeader 
        icon={<BarChart2 className="text-blue-600" />}
        title="Relatório de Rotas"
        subtitle="Análise de execução, performance e rupturas"
      />

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter size={20} />
          <span className="font-bold text-sm">Filtros:</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Data</label>
          <input 
            type="date" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="ml-auto">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          icon={<Calendar />}
          label="Total de Rotas"
          value={stats.total.toString()}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard 
          icon={<CheckCircle2 />}
          label="Executadas"
          value={stats.executed.toString()}
          sub={`${((stats.executed / (stats.total || 1)) * 100).toFixed(1)}% do total`}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          icon={<XCircle />}
          label="Não Executadas"
          value={stats.notExecuted.toString()}
          color="bg-rose-50 text-rose-600"
        />
        <StatCard 
          icon={<AlertTriangle />}
          label="Com Ruptura"
          value={stats.withIssues.toString()}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Supervisor Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2">
            <Users size={20} className="text-slate-400" />
            Execução por Supervisor
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supervisorData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip />
                <Legend />
                <Bar dataKey="executed" name="Executadas" fill="#10B981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="total" name="Total" fill="#E2E8F0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Promoter Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2">
            <Users size={20} className="text-slate-400" />
            Execução por Promotor
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={promoterData.slice(0, 10)} layout="vertical" margin={{ left: 40 }}> {/* Top 10 */}
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip />
                <Legend />
                <Bar dataKey="executed" name="Executadas" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="total" name="Total" fill="#E2E8F0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-lg text-slate-800">Detalhamento das Rotas</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Data</th>
                <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Promotor</th>
                <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Supervisor</th>
                <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">PDVs</th>
                <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routes.map((route) => (
                <tr key={route.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4">
                    <span className="font-bold text-slate-700 text-sm">
                      {new Date(route.date).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {route.promoter.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-700 text-sm">{route.promoter.fullName}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-slate-500">
                      {route.promoter.supervisor?.fullName || '-'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-slate-500">
                      {route.items.length} lojas
                    </span>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(route)}
                  </td>
                </tr>
              ))}
              {routes.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                    Nenhuma rota encontrada para esta data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RoutesReportView;
