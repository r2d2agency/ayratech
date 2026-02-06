import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { offlineService } from '../services/offline.service';
import { MapPin, ArrowRight, CheckCircle, WifiOff, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SupervisorDashboardView from './SupervisorDashboardView';
import toast from 'react-hot-toast';

const DashboardView = () => {
  const { user } = useAuth();
  const { settings } = useBranding();
  const navigate = useNavigate();
  const [todaysRoutes, setTodaysRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Check if user is a manager (admin, supervisor, etc.)
  const userRole = user?.role?.toLowerCase() || '';
  const isManager = ['admin', 'superadmin', 'supervisor', 'gerente', 'coordenador'].some(role => userRole.includes(role));

  useEffect(() => {
    fetchTodaysRoutes();
  }, []);

  const fetchTodaysRoutes = async () => {
    // Use local date to avoid UTC issues (e.g. previous/next day in evening)
    const date = new Date();
    const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    try {
      // Fetch routes for today
      // Ideally backend should support ?date=today&promoterId=me
      // For now fetching all and filtering (MVP)
      const response = await client.get('/routes');
      
      const filtered = response.data.filter((r: any) => {
        return r.date.startsWith(today) && (
          isManager || // Managers see all routes
          r.promoter?.id === user.employee.id || // Legacy single promoter check
          (r.promoters && r.promoters.some((p: any) => p.id === user.employee.id)) // Multi-promoter check
        );
      });
      
      setTodaysRoutes(filtered);
      setIsOffline(false);

      // Cache routes offline
      if (filtered.length > 0) {
        // Clear old routes for this date to avoid duplicates/stale data? 
        // Dexie put overwrites by ID, so it's fine.
        filtered.forEach((route: any) => {
          offlineService.saveRoute(route);
        });
        console.log(`Cached ${filtered.length} routes for offline use.`);
      }

    } catch (error) {
      console.error('Error fetching routes, trying offline cache:', error);
      setIsOffline(true);
      
      try {
        let cachedRoutes = await offlineService.getRoutesByDate(today);
        
        // Fallback: If strict date match fails, get all and filter (robustness)
        if (!cachedRoutes || cachedRoutes.length === 0) {
            console.log('No routes found by exact date index, scanning all...');
            const allRoutes = await offlineService.getAllRoutes();
            cachedRoutes = allRoutes.filter(r => r.date && r.date.startsWith(today));
        }

        console.log(`Loaded ${cachedRoutes?.length} routes from offline cache for ${today}`);
        
        if (cachedRoutes && cachedRoutes.length > 0) {
          setTodaysRoutes(cachedRoutes);
          toast('Modo Offline: Exibindo rotas salvas localmente.', { icon: '📡' });
        } else {
          // Try previous day or next day just in case of timezone confusion?
          // For now just show error
          toast.error('Sem conexão e sem rotas salvas para hoje.');
        }
      } catch (cacheError) {
        console.error('Error fetching from offline cache:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Carregando painel...</div>;
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm">{getGreeting()},</p>
          <h1 className="text-2xl font-bold text-gray-800">
            {String(user?.employee?.fullName || user?.name || user?.email || 'Promotor').split(' ')[0]}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
          >
            <Settings size={20} />
          </button>
          <div style={{ backgroundColor: `${settings.primaryColor}20`, color: settings.primaryColor }} className="px-3 py-1 rounded-full text-xs font-bold">
            {format(new Date(), 'dd/MM', { locale: ptBR })}
          </div>
        </div>
      </header>

      {isOffline && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          <WifiOff size={16} />
          <span>Você está offline. Exibindo dados salvos localmente.</span>
        </div>
      )}

      {isManager ? (
        <SupervisorDashboardView routes={todaysRoutes} />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary text-white p-4 rounded-2xl shadow-sm">
              <p className="text-white/80 text-xs mb-1">Visitas Hoje</p>
              <p className="text-3xl font-bold">
                {todaysRoutes.reduce((acc, r) => acc + r.items.length, 0)}
              </p>
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
              <p className="text-gray-400 text-xs mb-1">Pendentes</p>
              <p className="text-3xl font-bold text-gray-800">
                {todaysRoutes.reduce((acc, r) => acc + r.items.filter((i: any) => i.status === 'PENDING').length, 0)}
              </p>
            </div>
          </div>

          {/* Current/Next Route */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">Roteiro de Hoje</h2>
            
            {todaysRoutes.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-dashed border-gray-300">
                <p className="text-gray-500">Nenhuma rota agendada para hoje.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todaysRoutes.map((route) => (
                  <div key={route.id} className="space-y-3">
                    {route.items.sort((a: any, b: any) => a.order - b.order).map((item: any) => {
                      const isCompleted = item.status === 'CHECKOUT' || item.status === 'COMPLETED';
                      const isInProgress = item.status === 'CHECKIN';
                      
                      const currentUserCheckin = item.checkins?.find((c: any) => c.promoterId === user?.id || c.promoterId === user?.employee?.id);
                      const isCurrentUserCheckedIn = !!currentUserCheckin;

                      return (
                        <div 
                          key={item.id}
                          onClick={() => {
                            if (isCurrentUserCheckedIn) {
                                navigate(`/routes/${route.id}/items/${item.id}/check`);
                            } else {
                                navigate(`/routes/${route.id}`, { state: { targetItemId: item.id } });
                            }
                          }}
                          className={`relative bg-white p-4 rounded-xl shadow-sm border flex gap-4 items-center active:scale-[0.98] transition-transform ${
                            isInProgress ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'
                          }`}
                        >
                          <div className="flex-col items-center justify-center min-w-[2.5rem] text-center">
                            <span className={`text-sm font-bold ${isCompleted ? 'text-green-500' : isInProgress ? 'text-blue-500' : 'text-gray-400'}`}>
                              {item.startTime || '--:--'}
                            </span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 truncate">{item.supermarket.name}</h3>
                            <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                              <MapPin size={10} /> {item.supermarket.address}
                            </p>
                          </div>

                          <div className="shrink-0">
                             {isCompleted ? (
                               <CheckCircle className="text-green-500" size={24} />
                             ) : isInProgress ? (
                               <div className="animate-pulse bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-bold">
                                 AGORA
                               </div>
                             ) : (
                               <div className="bg-gray-100 text-gray-400 p-1 rounded-full">
                                 <ArrowRight size={16} />
                               </div>
                             )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default DashboardView;
