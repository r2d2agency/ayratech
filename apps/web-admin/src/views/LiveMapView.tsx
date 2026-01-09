import React, { useState, useEffect } from 'react';
import { Users, Store, Target, Activity, Search } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useBranding } from '../context/BrandingContext';
import SectionHeader from '../components/SectionHeader';
import { ViewType } from '../types';
import api from '../api/client';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LiveMapViewProps {
  onNavigate: (view: ViewType) => void;
}

const LiveMapView: React.FC<LiveMapViewProps> = ({ onNavigate }) => {
  const { settings } = useBranding();
  
  const [loading, setLoading] = useState(true);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [supermarkets, setSupermarkets] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterSupervisorId, setFilterSupervisorId] = useState('');
  const [filterPromoterId, setFilterPromoterId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const [employeesRes, supermarketsRes, clientsRes, routesRes] = await Promise.all([
        api.get('/employees'),
        api.get('/supermarkets'),
        api.get('/clients'),
        api.get('/routes') // We might want to filter by date in backend if possible, or filter here
      ]);

      const allEmployees = employeesRes.data;
      
      // Filter Promoters
      const prom = allEmployees.filter((e: any) => 
        e.role && (e.role.name.toLowerCase() === 'promotor' || e.role.name.toLowerCase() === 'promoter')
      );
      
      // Filter Supervisors
      const sups = allEmployees.filter((e: any) => 
        e.role && (
          e.role.name.toLowerCase().includes('supervisor') ||
          e.role.name.toLowerCase().includes('coordenador') ||
          e.role.name.toLowerCase().includes('gerente')
        )
      );

      setPromoters(prom);
      setSupervisors(sups);
      setSupermarkets(supermarketsRes.data);
      setClients(clientsRes.data);
      
      // Filter routes for today (or fetch only today's routes if API supports it)
      // Assuming /routes returns all routes, we filter client-side for now
      const todayRoutes = routesRes.data.filter((r: any) => {
          // Check if route date is today
          // Assuming route.date is YYYY-MM-DD
          return r.date === today; 
      });
      setRoutes(todayRoutes);

    } catch (error) {
      console.error("Error fetching live map data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Logic to map promoters to supermarkets based on today's routes
  const getPromoterLocation = (promoterId: string) => {
    const route = routes.find(r => r.promoterId === promoterId || (r.promoter && r.promoter.id === promoterId));
    if (route) {
        const supermarket = supermarkets.find(s => s.id === route.supermarketId || (route.supermarket && route.supermarket.id === s.id));
        return supermarket;
    }
    return null;
  };

  const getSupermarketPromoters = (supermarketId: string) => {
    return routes
        .filter(r => (r.supermarketId === supermarketId || (r.supermarket && r.supermarket.id === supermarketId)))
        .map(r => {
            const pId = r.promoterId || (r.promoter && r.promoter.id);
            return promoters.find(p => p.id === pId);
        })
        .filter(Boolean);
  };

  // Filter Logic
  const filteredPromoters = promoters.filter(p => {
    // Search Term (Name or Email)
    const matchesSearch = (p.fullName && p.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filter by Supervisor
    const matchesSupervisor = !filterSupervisorId || (p.supervisorId === filterSupervisorId) || (p.supervisor && p.supervisor.id === filterSupervisorId);

    // Filter by Specific Promoter Selection
    const matchesPromoter = !filterPromoterId || p.id === filterPromoterId;

    return matchesSearch && matchesSupervisor && matchesPromoter;
  });

  // Filter Supermarkets (for Map)
  const filteredSupermarkets = supermarkets.filter(s => {
      // Filter by Client
      const matchesClient = !filterClientId || (s.clients && s.clients.some((c: any) => c.id === filterClientId));
      
      // If filtering by promoter/supervisor, show only supermarkets that have relevant routes?
      // Or just show all supermarkets that match the client filter?
      // Let's show all supermarkets that match client filter, 
      // AND if a promoter filter is active, maybe highlight the one they are at?
      // For now, let's just filter by Client.
      
      return matchesClient;
  });

  if (loading) return <div className="p-8">Carregando mapa ao vivo...</div>;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4 animate-in fade-in duration-500">
      
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="relative h-3 w-3">
                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                <div className="relative h-3 w-3 bg-emerald-500 rounded-full" />
             </div>
             <h1 className="text-xl font-black text-slate-900">Live Map</h1>
          </div>

          <div className="flex flex-col md:flex-row gap-3 flex-1 w-full md:w-auto justify-end">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                    type="text" 
                    placeholder="Buscar promotor..." 
                    className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 w-full md:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>

              <select
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Todos os Clientes</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial || c.nome || c.fantasyName}</option>)}
              </select>

              <select
                value={filterSupervisorId}
                onChange={(e) => setFilterSupervisorId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Todos os Supervisores</option>
                {supervisors.map(s => <option key={s.id} value={s.id}>{s.fullName || s.name}</option>)}
              </select>
          </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 overflow-hidden relative shadow-inner z-0">
           <MapContainer center={[-14.2350, -51.9253]} zoom={4} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {filteredSupermarkets.filter(s => s.latitude && s.longitude).map(s => {
                  const promotersAtLocation = getSupermarketPromoters(s.id);
                  const hasPromoters = promotersAtLocation.length > 0;
                  
                  return (
                      <Marker 
                        key={s.id} 
                        position={[parseFloat(s.latitude), parseFloat(s.longitude)]}
                        opacity={hasPromoters ? 1 : 0.6}
                      >
                          <Popup>
                              <div className="min-w-[200px]">
                                  <strong className="block text-base mb-1">{s.fantasyName}</strong>
                                  <p className="text-xs text-gray-500 mb-2">{s.city} - {s.state}</p>
                                  
                                  {hasPromoters ? (
                                      <div className="mt-2 border-t pt-2">
                                          <p className="text-xs font-bold text-emerald-600 mb-1">Promotores no local:</p>
                                          <ul className="space-y-1">
                                              {promotersAtLocation.map((p: any) => (
                                                  <li key={p.id} className="text-xs flex items-center gap-1">
                                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                      {p.fullName || p.name}
                                                  </li>
                                              ))}
                                          </ul>
                                      </div>
                                  ) : (
                                      <p className="text-xs text-slate-400 italic mt-2">Nenhum promotor agendado hoje</p>
                                  )}
                              </div>
                          </Popup>
                      </Marker>
                  );
              })}
           </MapContainer>
        </div>
        
        {/* Sidebar List */}
        <div className="w-full lg:w-[350px] flex flex-col gap-4 overflow-hidden">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 flex-1 overflow-y-auto shadow-sm">
            <SectionHeader icon={<Activity style={{ color: settings.primaryColor }} size={20} />} title="Promotores Ativos" />
            
            <div className="mt-6 space-y-4">
              {filteredPromoters.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhum promotor encontrado.</p>
              ) : (
                  filteredPromoters.map(p => {
                    const location = getPromoterLocation(p.id);
                    return (
                        <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs overflow-hidden">
                                    {p.avatarUrl ? (
                                        <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        (p.fullName || p.name || 'P').charAt(0)
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900">{p.fullName || p.name}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">{p.email}</p>
                                </div>
                            </div>
                            
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                                <div className="flex items-start gap-2">
                                    <Store size={14} className="text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Localização Hoje</p>
                                        <p className={`text-xs font-bold ${location ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                            {location ? location.fantasyName : 'Sem rota definida'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMapView;
