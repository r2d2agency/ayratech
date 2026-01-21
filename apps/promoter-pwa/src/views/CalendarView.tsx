import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Calendar as CalendarIcon, ChevronRight, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CalendarView = () => {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Group routes by month
  const groupedRoutes = routes.reduce((acc: any, route) => {
    const month = format(parseISO(route.date), 'MMMM yyyy', { locale: ptBR });
    if (!acc[month]) acc[month] = [];
    acc[month].push(route);
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4 pb-20">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Minha Agenda</h1>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : Object.keys(groupedRoutes).length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p>Nenhum agendamento futuro.</p>
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