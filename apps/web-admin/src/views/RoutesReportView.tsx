import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import { 
  BarChart2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  Filter, 
  Download, 
  Users,
  X,
  MapPin,
  Clock,
  User,
  Image as ImageIcon,
  Upload,
  Camera,
  Save,
  Edit,
  Shield
} from 'lucide-react';
import { jwtDecode } from "jwt-decode";
import api, { API_URL } from '../api/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';

interface RouteReportItem {
  id: string;
  date: string;
  status: string;
  promoterId?: string;
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
    checkInTime?: string;
    checkOutTime?: string;
    manualEntryBy?: string;
    manualEntryAt?: string;
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
      product: {
        id: string;
        name: string;
        sku?: string;
        brand?: {
          name: string;
        };
      };
    }>;
  }>;
}

const RoutesReportView: React.FC = () => {
  const { settings } = useBranding();
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<RouteReportItem[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRoute, setSelectedRoute] = useState<RouteReportItem | null>(null);
  
  // Computed stats
  const [stats, setStats] = useState({
    total: 0,
    executed: 0,
    notExecuted: 0,
    withIssues: 0
  });

  const [supervisorData, setSupervisorData] = useState<any[]>([]);
  const [promoterData, setPromoterData] = useState<any[]>([]);

  // Manual Entry State
  const [isAdmin, setIsAdmin] = useState(false);
  const [promotersList, setPromotersList] = useState<any[]>([]);
  const [manualForm, setManualForm] = useState<{
    itemId: string;
    checkInTime: string;
    checkOutTime: string;
    promoterId: string;
    observation: string;
    products: { 
      productId: string; 
      checked: boolean; 
      isStockout: boolean; 
      observation: string; 
      photos: string[];
      productName: string;
    }[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchRoutes();
  }, [startDate, endDate]);

  const checkAdmin = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const role = decoded.role?.toLowerCase() || '';
        const admin = ['admin', 'manager', 'superadmin', 'administrador do sistema', 'supervisor de operações'].includes(role);
        setIsAdmin(admin);
        if (admin) fetchPromoters();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const fetchPromoters = async () => {
    try {
      const res = await api.get('/employees');
      setPromotersList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const resizeImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxSize = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          }, file.type, 0.9);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    
    // Fix for images saved with localhost or different domains
    if (url.includes('/uploads/')) {
      const relativePath = url.substring(url.indexOf('/uploads/'));
      return `${API_URL}${relativePath}`;
    }
    
    // If it's a full URL, we need to check if it's mixed content (http on https)
    // or if it points to localhost when we are in production
    if (url.startsWith('http')) {
        // If we are in prod (https) and the url is http, try to upgrade or fix
        if (window.location.protocol === 'https:' && url.startsWith('http:')) {
             // If it's our own API but with http, replace with API_URL (which should be https in prod)
             // Or if it's localhost, also replace with API_URL
             if (url.includes('localhost') || url.includes('api.ayratech.app.br')) {
                 // Try to extract the path part
                 const pathPart = url.split('/uploads/')[1];
                 if (pathPart) {
                     return `${API_URL}/uploads/${pathPart}`;
                 }
             }
        }
        return url;
    }

    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handlePhotoUpload = async (file: File, productIndex: number) => {
    try {
      const resized = await resizeImage(file);
      const formData = new FormData();
      formData.append('file', resized);

      const res = await api.post('/upload', formData);
      // Prefer using the relative path if available to avoid domain issues
      const url = res.data.path || res.data.url;

      if (manualForm) {
        const newProducts = [...manualForm.products];
        newProducts[productIndex].photos = [...(newProducts[productIndex].photos || []), url];
        setManualForm({ ...manualForm, products: newProducts });
      }
    } catch (err) {
      console.error('Upload failed', err);
      alert('Erro ao enviar foto.');
    }
  };

  const openManualEntry = (item: any, routePromoterId: string) => {
    // Determine initial times
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const toLocalISO = (date: Date) => {
      const pad = (n: number) => n < 10 ? '0' + n : n;
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const initialCheckIn = item.checkInTime ? new Date(item.checkInTime) : now;
    const initialCheckOut = item.checkOutTime ? new Date(item.checkOutTime) : oneHourLater;

    setManualForm({
      itemId: item.id,
      checkInTime: toLocalISO(initialCheckIn),
      checkOutTime: toLocalISO(initialCheckOut),
      promoterId: routePromoterId,
      observation: item.observation || '',
      products: item.products.map((p: any) => ({
        productId: p.product.id,
        checked: p.checked || false,
        isStockout: p.isStockout || false,
        observation: p.observation || '',
        photos: p.photos || [],
        productName: p.product.name
      }))
    });
  };

  const submitManualEntry = async () => {
    if (!manualForm) return;
    setSubmitting(true);
    try {
      await api.post(`/routes/items/${manualForm.itemId}/manual-execution`, {
        checkInTime: manualForm.checkInTime,
        checkOutTime: manualForm.checkOutTime,
        promoterId: manualForm.promoterId,
        products: manualForm.products
      });
      alert('Lançamento realizado com sucesso!');
      setManualForm(null);
      setSelectedRoute(null); // Close detail modal to refresh
      fetchRoutes(); // Refresh data
    } catch (err) {
      console.error(err);
      alert('Erro ao realizar lançamento manual.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/routes');
      const allRoutes: RouteReportItem[] = res.data;

      // Filter by date range
      const filtered = allRoutes.filter(r => {
        const routeDate = r.date.split('T')[0];
        return routeDate >= startDate && routeDate <= endDate;
      });
      
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
      const isExecuted = route.items.some(i => ['CHECKOUT', 'COMPLETED'].includes(i.status));
      if (isExecuted) executedCount++;

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

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <SectionHeader 
        icon={<BarChart2 className="text-blue-600" />}
        title="Relatório de Rotas"
        subtitle="Análise de execução, performance e rupturas"
      />

      {/* Filters & Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter size={20} />
          <span className="font-bold text-sm">Filtros:</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase">De</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Até</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
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

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2">
                <Users size={20} className="text-slate-400" />
                Execução por Promotor
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={promoterData.slice(0, 10)} layout="vertical" margin={{ left: 40 }}>
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
                    <tr 
                      key={route.id} 
                      onClick={() => setSelectedRoute(route)}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
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

      {/* Detail Modal */}
      {selectedRoute && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900">Detalhes da Rota</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {new Date(selectedRoute.date).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User size={14} />
                    Promotor: <strong className="text-slate-700">{selectedRoute.promoter.fullName}</strong>
                  </span>
                  {selectedRoute.promoter.supervisor && (
                    <span className="flex items-center gap-1.5">
                      <Users size={14} />
                      Supervisor: <strong className="text-slate-700">{selectedRoute.promoter.supervisor.fullName}</strong>
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedRoute(null)}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-red-500 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-8 bg-slate-50/30">
              {selectedRoute.items.map((item, index) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Item Header */}
                  <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4 bg-slate-50/50">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{item.supermarket.fantasyName}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <MapPin size={12} />
                        {item.supermarket.city || 'Cidade não inf.'} - {item.supermarket.state || 'UF'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {isAdmin && (
                         <button 
                           onClick={() => openManualEntry(item, selectedRoute.promoterId || selectedRoute.promoter.id)}
                           className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                         >
                           <Edit size={14} />
                           {['CHECKOUT', 'COMPLETED'].includes(item.status) ? 'Editar Execução' : 'Lançamento Manual'}
                         </button>
                      )}

                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        <Clock size={14} className="text-slate-400" />
                        <span>In: {formatTime(item.checkInTime)}</span>
                        <span className="text-slate-300">|</span>
                        <span>Out: {formatTime(item.checkOutTime)}</span>
                      </div>
                      
                      {item.manualEntryBy && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title={`Lançado manualmente por ${item.manualEntryBy} em ${new Date(item.manualEntryAt!).toLocaleString('pt-BR')}`}>
                          <Monitor size={14} />
                          Verificado por {item.manualEntryBy} em {new Date(item.manualEntryAt!).toLocaleString('pt-BR')}
                        </div>
                      )}

                      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        ['CHECKOUT', 'COMPLETED'].includes(item.status) 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {item.status}
                      </div>
                    </div>
                  </div>

                  {/* Products Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100">
                        <tr>
                          <th className="p-3 w-10">#</th>
                          <th className="p-3">Produto</th>
                          <th className="p-3">Marca</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Observação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {item.products.map((p, pIndex) => (
                          <tr key={p.id} className={p.isStockout ? 'bg-red-50/30' : ''}>
                            <td className="p-3 text-slate-400 text-xs">{pIndex + 1}</td>
                            <td className="p-3 font-medium text-slate-700">{p.product.name}</td>
                            <td className="p-3 text-slate-500">{p.product.brand?.name || '-'}</td>
                            <td className="p-3">
                              {p.isStockout ? (
                                <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold">
                                  <AlertTriangle size={12} /> Ruptura
                                </span>
                              ) : p.checked ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                  <CheckCircle2 size={12} /> Verificado
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="p-3 text-slate-500 italic text-xs max-w-xs truncate">
                              {p.observation || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Photos */}
                  {item.products.some(p => p.photos && p.photos.length > 0) && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                      <h4 className="font-bold text-slate-700 text-xs uppercase mb-3 flex items-center gap-2">
                        <ImageIcon size={14} />
                        Fotos da Visita
                      </h4>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {item.products.flatMap(p => p.photos || []).map((photo, i) => (
                          <a 
                            key={i} 
                            href={photo} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:ring-2 ring-blue-500 transition-all"
                          >
                            <img src={photo} alt="Visita" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {manualForm && (
        <div className="fixed inset-0 bg-slate-900/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h2 className="text-xl font-black text-slate-900">Lançamento Manual de Visita</h2>
               <button 
                  onClick={() => setManualForm(null)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all"
                >
                  <X size={20} />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {/* Header Inputs */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Horário Entrada</label>
                    <input 
                      type="datetime-local" 
                      value={manualForm.checkInTime}
                      onChange={e => setManualForm({...manualForm, checkInTime: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Horário Saída</label>
                    <input 
                      type="datetime-local" 
                      value={manualForm.checkOutTime}
                      onChange={e => setManualForm({...manualForm, checkOutTime: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Promotor Responsável</label>
                    <select 
                      value={manualForm.promoterId}
                      onChange={e => setManualForm({...manualForm, promoterId: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Selecione um promotor...</option>
                      {promotersList.map(p => (
                        <option key={p.id} value={p.id}>{p.fullName}</option>
                      ))}
                    </select>
                  </div>
               </div>

               {/* Products List */}
               <div className="space-y-4">
                 <h3 className="font-bold text-slate-800">Produtos da Rota</h3>
                 {manualForm.products.map((prod, idx) => (
                   <div key={prod.productId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                     <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">{prod.productName}</span>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={prod.checked}
                              onChange={e => {
                                const newProds = [...manualForm.products];
                                newProds[idx].checked = e.target.checked;
                                setManualForm({...manualForm, products: newProds});
                              }}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            Conferido
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-red-600 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={prod.isStockout}
                              onChange={e => {
                                const newProds = [...manualForm.products];
                                newProds[idx].isStockout = e.target.checked;
                                setManualForm({...manualForm, products: newProds});
                              }}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                            />
                            Ruptura
                          </label>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <input 
                          type="text" 
                          placeholder="Observação (opcional)"
                          value={prod.observation}
                          onChange={e => {
                            const newProds = [...manualForm.products];
                            newProds[idx].observation = e.target.value;
                            setManualForm({...manualForm, products: newProds});
                          }}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                       />
                       <div className="flex items-center gap-2">
                         <label className="flex-1 cursor-pointer flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-colors">
                           <Camera size={16} />
                           <span className="truncate">Adicionar Fotos</span>
                           <input 
                             type="file" 
                             accept="image/*"
                             multiple
                             className="hidden"
                             onChange={(e) => handlePhotoUpload(e.target.files, idx)}
                           />
                         </label>
                       </div>
                     </div>

                     {/* Thumbnails */}
                     {prod.photos && prod.photos.length > 0 && (
                       <div className="flex gap-2 overflow-x-auto py-1">
                         {prod.photos.map((pUrl, pIdx) => (
                           <div key={pIdx} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 relative group">
                              <img 
                                src={getImageUrl(pUrl)} 
                                alt="" 
                                className="w-full h-full object-cover" 
                              />
                              <button 
                               onClick={() => {
                                 const newProds = [...manualForm.products];
                                 newProds[idx].photos = newProds[idx].photos.filter((_, i) => i !== pIdx);
                                 setManualForm({...manualForm, products: newProds});
                               }}
                               className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                               <X size={12} />
                             </button>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             </div>

             <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
               <button 
                 onClick={() => setManualForm(null)}
                 className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
               >
                 Cancelar
               </button>
               <button 
                 onClick={submitManualEntry}
                 disabled={submitting}
                 className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {submitting ? 'Salvando...' : 'Salvar Lançamento'}
                 <Save size={18} />
               </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default RoutesReportView;
