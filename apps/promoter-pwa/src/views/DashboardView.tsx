import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MapPin, ArrowRight, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DashboardView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todaysRoutes, setTodaysRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysRoutes();
  }, []);

  const fetchTodaysRoutes = async () => {
    try {
      // Fetch routes for today
      // Ideally backend should support ?date=today&promoterId=me
      // For now fetching all and filtering (MVP)
      const response = await client.get('/routes');
      const today = new Date().toISOString().split('T')[0];
      
      const filtered = response.data.filter((r: any) => {
        // Check if user is a manager (admin, supervisor, etc.)
        const userRole = user?.role?.toLowerCase() || '';
        const isManager = ['admin', 'superadmin', 'supervisor', 'gerente', 'coordenador'].some(role => userRole.includes(role));

        return r.date.startsWith(today) && (
          isManager || // Managers see all routes
          !user?.employee?.id || // Fallback if no employee linked
          r.promoter?.id === user.employee.id // Promoters see only their routes
        );
      });
      
      setTodaysRoutes(filtered);
    } catch (error) {
      console.error('Error fetching routes:', error);
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

  return (
    <div className="p-4 space-y-6 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm">{getGreeting()},</p>
          <h1 className="text-2xl font-bold text-gray-800">
            {user?.employee?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Promotor'}
          </h1>
        </div>
        <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
          {format(new Date(), 'dd/MM', { locale: ptBR })}
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-500 text-white p-4 rounded-2xl shadow-sm">
          <p className="text-blue-100 text-xs mb-1">Visitas Hoje</p>
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
        
        {loading ? (
          <div className="text-center py-8 text-gray-400">Carregando roteiro...</div>
        ) : todaysRoutes.length === 0 ? (
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
                  
                  return (
                    <div 
                      key={item.id}
                      onClick={() => navigate(`/routes/${route.id}`)}
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
    </div>
  );
};

export default DashboardView;
