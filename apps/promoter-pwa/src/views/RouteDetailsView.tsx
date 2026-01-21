import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { MapPin, ArrowLeft, CheckCircle, Circle, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { toast, Toaster } from 'react-hot-toast';

// Helper function to calculate distance
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d * 1000; // Distance in meters
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

const RouteDetailsView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // State for active item (being visited)
  const [activeItem, setActiveItem] = useState<any>(null);

  useEffect(() => {
    fetchRoute();
  }, [id]);

  const fetchRoute = async () => {
    try {
      const response = await client.get(`/routes/${id}`);
      setRoute(response.data);
      // Find active item (status CHECKIN)
      const active = response.data.items.find((i: any) => i.status === 'CHECKIN');
      setActiveItem(active || null);
    } catch (error) {
      console.error('Error fetching route:', error);
      toast.error('Erro ao carregar rota');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (itemId: string) => {
    if (activeItem) {
      toast.error('Finalize a visita atual antes de iniciar outra.');
      return;
    }
    
    // Find the item to check coordinates
    const itemToCheck = route.items.find((i: any) => i.id === itemId);
    if (!itemToCheck) return;

    setProcessing(true);
    try {
      // Get location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          try {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // Validate Distance (Max 300 meters)
            if (itemToCheck.supermarket?.latitude && itemToCheck.supermarket?.longitude) {
              const distance = getDistanceFromLatLonInM(
                userLat,
                userLng,
                Number(itemToCheck.supermarket.latitude),
                Number(itemToCheck.supermarket.longitude)
              );

              if (distance > 300) {
                toast.error(`Você está a ${Math.round(distance)}m do local. Aproxime-se para fazer check-in (Max: 300m).`);
                setProcessing(false);
                return;
              }
            } else {
               // Warn if supermarket has no coordinates but allow check-in (or block depending on strictness)
               // For now, we proceed but maybe we should warn the user or the admin.
               console.warn('Supermarket has no coordinates');
            }

            await client.post(`/routes/items/${itemId}/check-in`, {
              lat: userLat,
              lng: userLng,
              timestamp: new Date().toISOString()
            });
            toast.success('Check-in realizado!');
            fetchRoute();
          } catch (err) {
            console.error(err);
            toast.error('Erro ao realizar check-in');
          }
        }, (error) => {
           toast.error('Erro de geolocalização: ' + error.message);
           setProcessing(false);
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      } else {
        toast.error('Geolocalização não suportada');
        setProcessing(false);
      }
    } catch (error) {
      setProcessing(false);
    }
  };

  const handleCheckOut = async (itemId: string) => {
    setProcessing(true);
    try {
       // Get location
       navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          await client.post(`/routes/items/${itemId}/check-out`, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: new Date().toISOString()
          });
          toast.success('Visita finalizada!');
          setActiveItem(null);
          fetchRoute();
        } catch (err) {
          toast.error('Erro ao finalizar visita');
        } finally {
          setProcessing(false);
        }
      });
    } catch (error) {
      setProcessing(false);
    }
  };

  const handleProductCheck = async (itemId: string, productId: string, checked: boolean) => {
    try {
      await client.patch(`/routes/items/${itemId}/products/${productId}/check`, {
        checked
      });
      // Optimistic update or refetch
      fetchRoute();
    } catch (error) {
      toast.error('Erro ao atualizar produto');
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;
  if (!route) return <div className="p-8 text-center">Rota não encontrada</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="p-1">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="font-bold text-gray-800">Detalhes da Rota</h1>
          <p className="text-xs text-gray-500">{format(new Date(route.date), 'dd/MM/yyyy')}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {route.items.sort((a: any, b: any) => a.order - b.order).map((item: any, index: number) => {
           const isActive = activeItem?.id === item.id;
           const isCompleted = item.status === 'CHECKOUT' || item.status === 'COMPLETED';
           // const isPending = item.status === 'PENDING' || !item.status;

           return (
             <div key={item.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isActive ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'}`}>
               <div className="p-4">
                 <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-3">
                     <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                       isCompleted ? 'bg-green-100 text-green-600' : 
                       isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                     }`}>
                       {isCompleted ? <CheckCircle size={16} /> : <span className="text-xs font-bold">{index + 1}</span>}
                     </div>
                     <div>
                       <h3 className="font-bold text-gray-800">{item.supermarket.name}</h3>
                       <p className="text-xs text-gray-500 flex items-center gap-1">
                         <MapPin size={10} /> {item.supermarket.address}
                       </p>
                     </div>
                   </div>
                   <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                     isCompleted ? 'bg-green-50 text-green-700' :
                     isActive ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                   }`}>
                     {isActive ? 'Em Andamento' : isCompleted ? 'Concluído' : 'Pendente'}
                   </span>
                 </div>

                 {/* Actions Area */}
                 <div className="mt-4 pt-3 border-t border-gray-50">
                   {isActive ? (
                     <div className="space-y-3">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-blue-800 font-medium mb-2">Tarefas:</p>
                          <div className="space-y-2">
                            {item.products?.map((prod: any) => (
                              <div key={prod.id} className="flex items-center gap-2 bg-white p-2 rounded border border-blue-100">
                                <button 
                                  onClick={() => handleProductCheck(item.id, prod.productId, !prod.checked)}
                                  className={`p-1 rounded-full ${prod.checked ? 'text-green-500' : 'text-gray-300'}`}
                                >
                                  {prod.checked ? <CheckCircle size={20} /> : <Circle size={20} />}
                                </button>
                                <span className={`text-sm ${prod.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                  {prod.product?.name}
                                </span>
                              </div>
                            ))}
                            {(!item.products || item.products.length === 0) && (
                              <p className="text-xs text-gray-500 italic">Nenhum produto listado.</p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium">
                            <Camera size={16} /> Fotos
                          </button>
                          <button 
                            onClick={() => handleCheckOut(item.id)}
                            disabled={processing}
                            className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            Finalizar Visita
                          </button>
                        </div>
                     </div>
                   ) : isCompleted ? (
                     <div className="flex items-center gap-2 text-green-700 text-sm">
                       <CheckCircle size={16} />
                       <span>Visita realizada</span>
                       {item.checkOutTime && (
                         <span className="text-xs text-gray-400">
                           ({format(new Date(item.checkOutTime), 'HH:mm')})
                         </span>
                       )}
                     </div>
                   ) : (
                     <button 
                       onClick={() => handleCheckIn(item.id)}
                       disabled={processing || !!activeItem}
                       className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-300"
                     >
                       Iniciar Visita (Check-in)
                     </button>
                   )}
                 </div>
               </div>
             </div>
           );
        })}
      </div>
    </div>
  );
};

export default RouteDetailsView;