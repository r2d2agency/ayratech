import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { offlineService } from '../services/offline.service';
import { processImage } from '../utils/image-processor';
import { MapPin, ArrowLeft, CheckCircle, Circle, Camera, Navigation, Wifi, WifiOff, RefreshCw, X } from 'lucide-react';
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  
  // State for active item (being visited)
  const [activeItem, setActiveItem] = useState<any>(null);

  // Photo Capture State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<{ blob: Blob, url: string } | null>(null);

  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    fetchRoute();
    updatePendingCount();
    
    // Network listeners
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Start watching position for distance updates
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('Error watching position:', error),
        { enableHighAccuracy: true }
      );
      return () => {
        navigator.geolocation.clearWatch(watchId);
        window.removeEventListener('online', handleOnlineStatus);
        window.removeEventListener('offline', handleOnlineStatus);
      };
    }
  }, [id]);

  const handleOnlineStatus = () => {
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      offlineService.syncPendingActions().then(() => {
        fetchRoute();
        updatePendingCount();
      });
    }
  };

  const handlePhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !activeItem) return;
    
    const file = event.target.files[0];
    setProcessing(true);

    try {
        // Need to fetch current user/promoter name. 
        // Assuming it's stored in localStorage or decoded from JWT.
        // For now, using a placeholder or decoding JWT if available.
        // In a real app, use a proper AuthContext.
        const token = localStorage.getItem('accessToken');
        let promoterName = 'Promotor';
        if (token) {
             // Simple parse to get name if available in payload
             try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                promoterName = payload.name || payload.sub || 'Promotor';
             } catch (e) {}
        }

        const result = await processImage(file, {
            supermarketName: activeItem.supermarket.name,
            promoterName: promoterName,
            timestamp: new Date()
        });
        
        setCurrentPhoto({ blob: result.blob, url: result.previewUrl });
        setShowPhotoPreview(true);
    } catch (error: any) {
        toast.error(`Foto inválida: ${error.message}`);
    } finally {
        setProcessing(false);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmPhotoUpload = async () => {
    if (!currentPhoto || !activeItem) return;

    setProcessing(true);
    try {
        // In a real implementation, we would upload the blob.
        // For offline support, we need to convert blob to base64 or store blob in IndexedDB.
        // Dexie supports Blobs.
        
        // However, standard JSON payloads don't support Blobs. 
        // If online: Use FormData.
        // If offline: Store in IndexedDB pending actions. 
        // NOTE: PendingAction in db.ts stores 'payload' as any. 
        // We can store the blob directly if we handle it in sync.
        // But JSON.stringify (often used in logs/debug) fails on Blobs.
        // Let's convert to Base64 for simplicity in "payload" field, 
        // or ensure our offline service handles FormData reconstruction.
        
        // Strategy: 
        // 1. Try online upload via FormData.
        // 2. If offline/fail, convert to Base64 and store in pending action.

        if (isOnline) {
             const formData = new FormData();
             formData.append('file', currentPhoto.blob, 'photo.jpg');
             formData.append('type', 'BEFORE'); // Example type
             
             await client.post(`/routes/items/${activeItem.id}/photos`, formData, {
                 headers: { 'Content-Type': 'multipart/form-data' }
             });
             toast.success('Foto enviada com sucesso!');
        } else {
             // Convert Blob to Base64 for storage compatibility
             const reader = new FileReader();
             reader.readAsDataURL(currentPhoto.blob);
             reader.onloadend = async () => {
                 const base64data = reader.result;
                 await offlineService.addPendingAction(
                     'PHOTO',
                     `/routes/items/${activeItem.id}/photos`,
                     'POST',
                     { 
                         file: base64data,
                         type: 'BEFORE',
                         isBase64: true 
                     }
                 );
                 toast.success('Foto salva (Offline). Será enviada quando houver conexão.');
                 updatePendingCount();
             };
        }
        
        setShowPhotoPreview(false);
        setCurrentPhoto(null);

    } catch (error) {
        console.error(error);
        // Fallback to offline if API error
        const reader = new FileReader();
        reader.readAsDataURL(currentPhoto.blob);
        reader.onloadend = async () => {
             const base64data = reader.result;
             await offlineService.addPendingAction(
                 'PHOTO',
                 `/routes/items/${activeItem.id}/photos`,
                 'POST',
                 { 
                     file: base64data,
                     type: 'BEFORE',
                     isBase64: true 
                 }
             );
             toast.success('Foto salva para envio posterior.');
             updatePendingCount();
        };
        setShowPhotoPreview(false);
        setCurrentPhoto(null);
    } finally {
        setProcessing(false);
    }
  };

  const updatePendingCount = async () => {
    const count = await offlineService.getPendingCount();
    setPendingCount(count);
  };

  const fetchRoute = async () => {
    try {
      const response = await client.get(`/routes/${id}`);
      setRoute(response.data);
      offlineService.saveRoute(response.data); // Cache for offline
      
      // Find active item (status CHECKIN)
      const active = response.data.items.find((i: any) => i.status === 'CHECKIN');
      setActiveItem(active || null);
    } catch (error) {
      console.error('Error fetching route from API, trying offline cache:', error);
      const cachedRoute = await offlineService.getRoute(id!);
      if (cachedRoute) {
        setRoute(cachedRoute);
        const active = cachedRoute.items.find((i: any) => i.status === 'CHECKIN');
        setActiveItem(active || null);
        toast('Modo Offline: Exibindo dados em cache', { icon: '📡' });
      } else {
        toast.error('Erro ao carregar rota e sem cache offline');
      }
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
    
    const proceedWithCheckIn = async (lat: number, lng: number) => {
        try {
            await client.post(`/routes/items/${itemId}/check-in`, {
              lat,
              lng,
              timestamp: new Date().toISOString()
            });
            toast.success('Check-in realizado!');
            fetchRoute();
        } catch (err) {
            console.error('API failed, saving offline action', err);
            await offlineService.addPendingAction(
                'CHECKIN', 
                `/routes/items/${itemId}/check-in`, 
                'POST', 
                { lat, lng, timestamp: new Date().toISOString() }
            );
            
            // Optimistic update
            const updatedItems = route.items.map((i: any) => 
                i.id === itemId ? { ...i, status: 'CHECKIN' } : i
            );
            setRoute({ ...route, items: updatedItems });
            setActiveItem({ ...itemToCheck, status: 'CHECKIN' });
            updatePendingCount();
        } finally {
            setProcessing(false);
        }
    };

    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
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
                }
                
                proceedWithCheckIn(userLat, userLng);
            },
            (error) => {
               toast.error('Erro de geolocalização: ' + error.message);
               setProcessing(false);
            }, 
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        toast.error('Geolocalização não suportada');
        setProcessing(false);
    }
  };

  const handleCheckOut = async (itemId: string) => {
    setProcessing(true);
    
    const proceedWithCheckOut = async (lat: number, lng: number) => {
        try {
          await client.post(`/routes/items/${itemId}/check-out`, {
            lat,
            lng,
            timestamp: new Date().toISOString()
          });
          toast.success('Visita finalizada!');
          setActiveItem(null);
          fetchRoute();
        } catch (err) {
          console.error('API failed, saving offline action', err);
          await offlineService.addPendingAction(
            'CHECKOUT',
            `/routes/items/${itemId}/check-out`,
            'POST',
            { lat, lng, timestamp: new Date().toISOString() }
          );

          // Optimistic update
          const updatedItems = route.items.map((i: any) => 
            i.id === itemId ? { ...i, status: 'CHECKOUT' } : i
          );
          setRoute({ ...route, items: updatedItems });
          setActiveItem(null);
          updatePendingCount();
        } finally {
          setProcessing(false);
        }
    };

    navigator.geolocation.getCurrentPosition(
        (position) => proceedWithCheckOut(position.coords.latitude, position.coords.longitude),
        (error) => {
            console.error('Geolocation error on checkout, proceeding anyway', error);
            proceedWithCheckOut(0, 0); // Allow checkout even if geo fails? Or force it?
        }
    );
  };

  const handleProductCheck = async (itemId: string, productId: string, checked: boolean) => {
    try {
      await client.patch(`/routes/items/${itemId}/products/${productId}/check`, {
        checked
      });
      fetchRoute();
    } catch (error) {
       console.error('API failed, saving offline action', error);
       await offlineService.addPendingAction(
         'FORM',
         `/routes/items/${itemId}/products/${productId}/check`,
         'PATCH',
         { checked }
       );
       
       // Optimistic UI update
       const updatedItems = route.items.map((item: any) => {
         if (item.id === itemId) {
             const updatedProducts = item.products.map((p: any) => 
                 p.productId === productId ? { ...p, checked } : p
             );
             return { ...item, products: updatedProducts };
         }
         return item;
       });
       setRoute({ ...route, items: updatedItems });
       updatePendingCount();
    }
  };

  const openGoogleMaps = (lat?: number, lng?: number) => {
    if (!lat || !lng) {
      toast.error('Localização do supermercado não disponível');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;
  if (!route) return <div className="p-8 text-center">Rota não encontrada</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1">
            <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
            <h1 className="font-bold text-gray-800">Detalhes da Rota</h1>
            <p className="text-xs text-gray-500">{format(new Date(route.date), 'dd/MM/yyyy')}</p>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            {pendingCount > 0 && (
                <button 
                    onClick={() => offlineService.syncPendingActions()}
                    className="p-2 bg-orange-100 text-orange-600 rounded-full animate-pulse"
                    title={`${pendingCount} ações pendentes. Clique para sincronizar.`}
                >
                    <RefreshCw size={20} />
                </button>
            )}
            {isOnline ? (
                <Wifi size={20} className="text-green-500" title="Online" />
            ) : (
                <WifiOff size={20} className="text-red-500" title="Offline" />
            )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {route.items.sort((a: any, b: any) => a.order - b.order).map((item: any, index: number) => {
           const isActive = activeItem?.id === item.id;
           const isCompleted = item.status === 'CHECKOUT' || item.status === 'COMPLETED';
           // const isPending = item.status === 'PENDING' || !item.status;
           
           let distanceText = '';
           if (userLocation && item.supermarket?.latitude && item.supermarket?.longitude) {
             const dist = getDistanceFromLatLonInM(
               userLocation.lat,
               userLocation.lng,
               Number(item.supermarket.latitude),
               Number(item.supermarket.longitude)
             );
             distanceText = dist > 1000 ? `${(dist/1000).toFixed(1)}km` : `${Math.round(dist)}m`;
           }

           return (
             <div key={item.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isActive ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'}`}>
               <div className="p-4">
                 <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-3 flex-1">
                     <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                       isCompleted ? 'bg-green-100 text-green-600' : 
                       isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                     }`}>
                       {isCompleted ? <CheckCircle size={16} /> : <span className="text-xs font-bold">{index + 1}</span>}
                     </div>
                     <div className="flex-1 min-w-0" onClick={() => openGoogleMaps(item.supermarket?.latitude, item.supermarket?.longitude)}>
                      <h3 className="font-bold text-gray-800 truncate">{item.supermarket?.fantasyName || item.supermarket?.name || 'Supermercado sem nome'}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <MapPin size={10} /> {item.supermarket?.address || `${item.supermarket?.street || ''}, ${item.supermarket?.number || ''}`}
                      </p>
                      {distanceText && (
                        <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                          <Navigation size={10} /> {distanceText}
                        </p>
                      )}
                    </div>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                     <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                       isCompleted ? 'bg-green-50 text-green-700' :
                       isActive ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                     }`}>
                       {isActive ? 'Em Andamento' : isCompleted ? 'Concluído' : 'Pendente'}
                     </span>
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         openGoogleMaps(item.supermarket?.latitude, item.supermarket?.longitude);
                       }}
                       className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                       title="Abrir no Google Maps"
                     >
                       <Navigation size={14} />
                     </button>
                   </div>
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
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                          >
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

      {/* Modal Preview Photo */}
      {showPhotoPreview && currentPhoto && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-2 rounded-lg max-w-full max-h-[80vh] overflow-hidden flex flex-col gap-4">
                <img src={currentPhoto.url} alt="Preview" className="max-w-full max-h-[60vh] object-contain" />
                <div className="flex gap-2 justify-between">
                    <button 
                        onClick={() => { setShowPhotoPreview(false); setCurrentPhoto(null); }}
                        className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                        <X size={20} /> Cancelar
                    </button>
                    <button 
                        onClick={confirmPhotoUpload}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                        disabled={processing}
                    >
                        {processing ? <RefreshCw className="animate-spin" /> : <CheckCircle size={20} />} 
                        Confirmar Envio
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoCapture}
      />

      {/* Bottom Actions Bar (Only if checked in) */}
      {activeItem && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around items-center z-10">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 text-blue-600"
            disabled={processing}
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Camera size={24} />
            </div>
            <span className="text-xs font-medium">Fotos</span>
          </button>

          <button 
            className="flex flex-col items-center gap-1 text-gray-400"
            onClick={() => navigate(`/routes/${id}/items/${activeItem.id}/check`)}
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
            <span className="text-xs font-medium">Pesquisa</span>
          </button>

          <button 
            onClick={() => handleCheckOut(activeItem.id)}
            className="flex flex-col items-center gap-1 text-red-600"
            disabled={processing}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <LogOut size={24} />
            </div>
            <span className="text-xs font-medium">Saída</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Helper icon
function LogOut(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

export default RouteDetailsView;