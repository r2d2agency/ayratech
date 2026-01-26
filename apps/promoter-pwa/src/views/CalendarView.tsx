import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Calendar as CalendarIcon, ChevronRight, MapPin, Filter } from 'lucide-react';
import { format, parseISO, isSameDay, isSameWeek, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FilterType = 'day' | 'week' | 'month';

const CalendarView = () => {
  const [routes, setRoutes] = useState<any[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('day');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await client.get('/routes');
        // Sort by date ASC
        const sorted = response.data
          .filter((r: any) => !r.isTemplate)
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setRoutes(sorted);
      } catch (error) {
        console.error('Error fetching routes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  useEffect(() => {
    const today = new Date();
    
    const filtered = routes.filter(route => {
      const routeDate = parseISO(route.date);
      
      if (activeFilter === 'day') {
        return isSameDay(routeDate, today);
      } else if (activeFilter === 'week') {
        return isSameWeek(routeDate, today, { locale: ptBR });
      } else {
        // Month (or all future if intended, but let's stick to current month view or just all)
        // User said "filtro por mes". Let's show all grouped by month as before if filter is month
        return true; 
      }
    });

    setFilteredRoutes(filtered);
  }, [routes, activeFilter]);

  // Group routes by month (only for week/month views or all)
  const groupedRoutes = filteredRoutes.reduce((acc: any, route) => {
    const month = format(parseISO(route.date), 'MMMM yyyy', { locale: ptBR });
    if (!acc[month]) acc[month] = [];
    acc[month].push(route);
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Minha Agenda</h1>
      </div>

      {/* Filters */}
      <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
        <button 
          onClick={() => setActiveFilter('day')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeFilter === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Dia
        </button>
        <button 
          onClick={() => setActiveFilter('week')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeFilter === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Semana
        </button>
        <button 
          onClick={() => setActiveFilter('month')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeFilter === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Mês
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : Object.keys(groupedRoutes).length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p>Nenhum agendamento para {activeFilter === 'day' ? 'hoje' : activeFilter === 'week' ? 'esta semana' : 'este período'}.</p>
        </div>
      ) : (
        Object.entries(groupedRoutes).map(([month, monthRoutes]: [string, any]) => (
          <div key={month} className="space-y-3">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider sticky top-14 bg-gray-50 py-2 z-0">
              {month}
            </h2>
            <div className="space-y-3">
              {monthRoutes.map((route: any) => (
                <div 
                  key={route.id}
                  onClick={() => navigate(`/routes/${route.id}`)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform"
                >
                  <div className="flex-col items-center justify-center text-center min-w-[3rem] border-r border-gray-100 pr-4">
                    <span className="block text-2xl font-bold text-blue-600">
                      {format(parseISO(route.date), 'dd')}
                    </span>
                    <span className="block text-xs text-gray-400 uppercase">
                      {format(parseISO(route.date), 'EEE', { locale: ptBR })}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {route.items.length} visitas agendadas
                    </p>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <MapPin size={10} />
                      {route.items.map((i: any) => i.supermarket.name).join(', ').slice(0, 30)}...
                    </p>
                  </div>

                  <ChevronRight className="text-gray-300" size={20} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default CalendarView;