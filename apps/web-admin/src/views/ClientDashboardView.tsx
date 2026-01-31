import React, { useState, useEffect, useMemo } from 'react';
import { useBranding } from '../context/BrandingContext';
import StatCard from '../components/StatCard';
import { 
  BarChart2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Filter, 
  MapPin,
  Camera,
  Package,
  Store,
  Calendar,
  Clock,
  Search
} from 'lucide-react';
import api from '../api/client';
import { getImageUrl } from '../utils/image';
import SectionHeader from '../components/SectionHeader';
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

interface ClientDashboardStats {
  totalRoutes: number;
  visitedRoutes: number;
  totalProductsChecked: number;
  stockouts: number;
  nearExpiry: number;
  expired: number;
  photosCount: number;
}

interface RouteItem {
  id: string;
  date: string;
  status: string;
  promoter: {
    fullName: string;
  };
  items: Array<{
    id: string;
    status: string;
    checkInTime?: string;
    checkOutTime?: string;
    supermarket: {
      id: string;
      fantasyName: string;
      city?: string;
      state?: string;
    };
    products: Array<{
      id: string;
      isStockout: boolean;
      checked: boolean;
      observation?: string;
      photos?: string[];
      validityDate?: string;
      product: {
        id: string;
        name: string;
        sku?: string;
        image?: string;
      };
    }>;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF4444'];

const ClientDashboardView: React.FC = () => {
  const { settings } = useBranding();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<RouteItem[]>([]);
  
  // Filters
  const [selectedPdv, setSelectedPdv] = useState<string>('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Last 30 days
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [routes, selectedPdv, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/routes/client/all');
      setRoutes(response.data);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...routes];

    // Filter by Date Range
    if (startDate && endDate) {
      filtered = filtered.filter(r => {
        const rDate = r.date.split('T')[0];
        return rDate >= startDate && rDate <= endDate;
      });
    }

    // Filter by PDV (Supermarket) - Filter items within routes
    if (selectedPdv) {
      filtered = filtered.map(r => ({
        ...r,
        items: r.items.filter(i => i.supermarket.id === selectedPdv)
      })).filter(r => r.items.length > 0);
    }

    setFilteredRoutes(filtered);
  };

  const stats = useMemo<ClientDashboardStats>(() => {
    let totalRoutes = 0;
    let visitedRoutes = 0;
    let totalProductsChecked = 0;
    let stockouts = 0;
    let nearExpiry = 0;
    let expired = 0;
    let photosCount = 0;

    filteredRoutes.forEach(route => {
      route.items.forEach(item => {
        totalRoutes++;
        if (item.status === 'COMPLETED' || item.checkInTime) visitedRoutes++;

        item.products.forEach(p => {
          if (p.checked) totalProductsChecked++;
          if (p.isStockout) stockouts++;
          if (p.photos) photosCount += p.photos.length;

          if (p.validityDate) {
            const today = new Date();
            today.setHours(0,0,0,0);
            const valDate = new Date(p.validityDate);
            const diffTime = valDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) expired++;
            else if (diffDays <= 30) nearExpiry++;
          }
        });
      });
    });

    return {
      totalRoutes,
      visitedRoutes,
      totalProductsChecked,
      stockouts,
      nearExpiry,
      expired,
      photosCount
    };
  }, [filteredRoutes]);

  const pdvs = useMemo(() => {
    const uniquePdvs = new Map();
    routes.forEach(r => {
      r.items.forEach(i => {
        if (!uniquePdvs.has(i.supermarket.id)) {
          uniquePdvs.set(i.supermarket.id, i.supermarket.fantasyName);
        }
      });
    });
    return Array.from(uniquePdvs.entries()).map(([id, name]) => ({ id, name }));
  }, [routes]);

  const stockoutByPdvData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredRoutes.forEach(r => {
      r.items.forEach(i => {
        const pdvName = i.supermarket.fantasyName;
        const stockoutsInItem = i.products.filter(p => p.isStockout).length;
        if (stockoutsInItem > 0) {
          data[pdvName] = (data[pdvName] || 0) + stockoutsInItem;
        }
      });
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredRoutes]);

  const expiryStatusData = useMemo(() => {
    return [
      { name: 'Vencidos', value: stats.expired },
      { name: 'Próx. Vencimento', value: stats.nearExpiry },
      { name: 'Em Dia', value: stats.totalProductsChecked - stats.expired - stats.nearExpiry }
    ].filter(d => d.value > 0);
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <SectionHeader 
        title="Dashboard do Cliente" 
        subtitle="Visão geral da performance dos seus produtos nos PDVs"
      />

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Período</label>
          <div className="flex gap-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm"
            />
            <span className="self-center text-slate-400">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Filtrar por PDV</label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={selectedPdv}
              onChange={(e) => setSelectedPdv(e.target.value)}
              className="w-full pl-10 p-2 border rounded-lg text-sm appearance-none bg-white"
            >
              <option value="">Todos os Supermercados</option>
              {pdvs.map(pdv => (
                <option key={pdv.id} value={pdv.id}>{pdv.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <button 
          onClick={() => {
            setSelectedPdv('');
            setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
            setEndDate(new Date().toISOString().split('T')[0]);
          }}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Limpar Filtros"
        >
          <Filter size={20} />
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Package className="text-blue-600" />} 
          label="Produtos Verificados" 
          value={stats.totalProductsChecked.toString()} 
          color="bg-blue-50" 
        />
        <StatCard 
          icon={<XCircle className="text-red-600" />} 
          label="Rupturas Identificadas" 
          value={stats.stockouts.toString()} 
          subValue={`${((stats.stockouts / (stats.totalProductsChecked || 1)) * 100).toFixed(1)}%`}
          color="bg-red-50" 
        />
        <StatCard 
          icon={<AlertTriangle className="text-orange-600" />} 
          label="Próx. Vencimento" 
          value={stats.nearExpiry.toString()} 
          color="bg-orange-50" 
        />
        <StatCard 
          icon={<AlertTriangle className="text-red-800" />} 
          label="Produtos Vencidos" 
          value={stats.expired.toString()} 
          color="bg-red-100" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Stockouts by PDV Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
            <XCircle size={20} className="text-red-500" />
            Rupturas por PDV (Top 10)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockoutByPdvData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} name="Rupturas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expiry Status Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
            <Calendar size={20} className="text-orange-500" />
            Status de Validade
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expiryStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expiryStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Vencidos' ? '#991b1b' : entry.name === 'Próx. Vencimento' ? '#ea580c' : '#22c55e'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Photos Preview */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
         <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
            <Camera size={20} className="text-purple-500" />
            Últimas Fotos Registradas
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {filteredRoutes
               .flatMap(r => r.items)
               .flatMap(i => i.products)
               .filter(p => p.photos && p.photos.length > 0)
               .flatMap(p => p.photos?.map(photo => ({ 
                 url: photo, 
                 productName: p.product.name,
                 date: p.validityDate 
               })))
               .slice(0, 6)
               .map((photo, idx) => (
                 <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                   <img 
                     src={getImageUrl(photo?.url || '')} 
                     alt={photo?.productName}
                     className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                   />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                     <p className="text-white text-xs font-medium truncate w-full">{photo?.productName}</p>
                   </div>
                 </div>
               ))
             }
             {stats.photosCount === 0 && (
               <div className="col-span-full text-center py-10 text-slate-400">
                 Nenhuma foto registrada neste período.
               </div>
             )}
          </div>
      </div>
    </div>
  );
};

export default ClientDashboardView;