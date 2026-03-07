import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { offlineService } from '../services/offline.service';
import { processImage } from '../utils/image-processor';
import { useBranding } from '../context/BrandingContext';
import { MapPin, ArrowLeft, CheckCircle, Circle, Camera, Navigation, Wifi, WifiOff, RefreshCw, X, ChevronRight, Clock, ListTodo, AlertTriangle } from 'lucide-react';
import { CategoryTaskFlow } from '../components/CategoryTaskFlow';
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

function formatDuration(start?: string | Date, end?: string | Date) {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const diff = endTime - startTime;
  if (diff < 0) return null;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const RouteDetailsView = () => {
  const { user } = useAuth();
  const { branding } = useBranding();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState<{blob: Blob, url: string} | null>(null);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCategoryMode, setSelectedCategoryMode] = useState<'ITEMS' | 'PHOTOS' | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  const routeDateStr = route?.date
    ? (route.date instanceof Date ? route.date.toISOString().split('T')[0] : String(route.date).split('T')[0])
    : null;
  const isTodayRoute = routeDateStr === todayStr;
  const isPastRoute = !!routeDateStr && routeDateStr < todayStr;
  const isFutureRoute = !!routeDateStr && routeDateStr > todayStr;
  
  // Find item where CURRENT user is checked in (Independent of global status)
  const userActiveItem = route?.items?.find((item: any) => 
    item.checkins?.some((c: any) => {
      const pId = c.promoterId || c.promoter?.id;
      const uId = user?.employee?.id || user?.id;
      return pId === uId && !c.checkOutTime;
    })
  );

  // Find globally active item (fallback)
  const globalActiveItem = route?.items?.find((i: any) => i.status === 'CHECKIN');
  
  // Use userActiveItem if available, otherwise globalActiveItem (for view only)
  const activeItem = userActiveItem || globalActiveItem || null;
  
  // Shim setActiveItem to avoid breaking existing calls
  const setActiveItem = (val: any) => {};

  // Scroll to target item when route loads
  useEffect(() => {
    if (route && !loading) {
      const targetId = location.state?.targetItemId;
      const openTasks = location.state?.openTasks;

      // Auto-open tasks modal if requested AND user is checked in
      if (openTasks && activeItem) {
          // Verify if user is checked in to this active item
          const isCheckedIn = activeItem.checkins?.some((c: any) => {
              const pId = c.promoterId || c.promoter?.id;
              const uId = user?.employee?.id || user?.id;
              return pId === uId && !c.checkOutTime;
          });

          if (isCheckedIn) {
             setShowTasksModal(true);
          }
      }

      if (targetId) {
        setTimeout(() => {
          const element = document.getElementById(`item-${targetId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight it temporarily?
            element.classList.add('ring-2', 'ring-blue-500');
            setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500'), 2000);
          }
        }, 500); // Small delay to ensure render
      }
    }
  }, [route, loading, location.state, activeItem]);

  // Photo Capture State
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Removed duplicate state declarations (moved to top)

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
        const promoterName = user?.name || 'Promotor';

        const result = await processImage(file, {
            supermarketName: activeItem.supermarket?.fantasyName || activeItem.supermarket?.name || 'PDV',
            promoterName: promoterName,
            timestamp: new Date(),
            blurThreshold: branding?.blurThreshold
        });
        
        setCurrentPhoto({ blob: result.blob, url: result.previewUrl });
        setShowPhotoPreview(true);
    } catch (error: any) {
        const msg = error?.message || 'Erro ao processar foto.';
        if (msg.includes('borrada') || msg.includes('escura') || msg.includes('clara')) {
          setValidationError(msg);
        } else {
          toast.error('Erro ao processar foto: ' + msg);
        }
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
             const reader = new FileReader();
             reader.readAsDataURL(currentPhoto.blob);
             reader.onloadend = async () => {
                 const base64data = String(reader.result);
                 await offlineService.addPendingAction(
                     'PHOTO',
                     `/routes/items/${activeItem.id}/photos`,
                     'POST',
                     { 
                         fileBase64: base64data,
                         filename: 'photo.jpg',
                         photoType: 'BEFORE',
                         category: null
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
             const base64data = String(reader.result);
             await offlineService.addPendingAction(
                 'PHOTO',
                 `/routes/items/${activeItem.id}/photos`,
                 'POST',
                 { 
                     fileBase64: base64data,
                     filename: 'photo.jpg',
                     photoType: 'BEFORE',
                     category: null
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
    } catch (error: any) {
      // Fix: If 4xx error, do not treat as offline
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
           console.error('Error fetching route (4xx):', error.response.data);
           toast.error(`Erro ao carregar rota: ${error.response.data?.message || 'Dados inválidos'}`);
           setLoading(false);
           return;
      }

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

  // Photo Action State
  const actionFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'CHECKIN' | 'CHECKOUT', itemId: string, location: { lat: number, lng: number } } | null>(null);

  const executeCheckIn = async (itemId: string, lat: number, lng: number, entryPhoto?: string) => {
        try {
            await client.post(`/routes/items/${itemId}/check-in`, {
              lat,
              lng,
              timestamp: new Date().toISOString(),
              entryPhoto
            });
            toast.success('Check-in realizado!');
            fetchRoute();
        } catch (err: any) {
            if (err.response && err.response.status >= 400 && err.response.status < 500) {
                 console.error('Check-in failed with 4xx:', err.response.data);
                 toast.error(`Erro: ${err.response.data?.message || 'Check-in não permitido'}`);
                 setProcessing(false);
                 return;
            }

            console.error('API failed, saving offline action', err);
            await offlineService.addPendingAction(
                'CHECKIN', 
                `/routes/items/${itemId}/check-in`, 
                'POST', 
                { lat, lng, timestamp: new Date().toISOString(), entryPhoto }
            );
            
            // Optimistic update
            const updatedItems = route.items.map((i: any) => {
                if (i.id === itemId) {
                    const promoterId = user?.employee?.id || user?.id;
                    const newCheckin = {
                        id: 'temp-' + Date.now(),
                        promoterId: promoterId,
                        checkInTime: new Date().toISOString(),
                        checkOutTime: null
                    };
                    const existingCheckins = i.checkins || [];
                    return { ...i, status: 'CHECKIN', checkins: [...existingCheckins, newCheckin] };
                }
                return i;
            });

            setRoute({ ...route, items: updatedItems });
            const updatedActiveItem = updatedItems.find((i: any) => i.id === itemId);
            setActiveItem(updatedActiveItem);
            updatePendingCount();
        } finally {
            setProcessing(false);
        }
  };

  const executeCheckOut = async (itemId: string, lat: number, lng: number, exitPhoto?: string) => {
        try {
          await client.post(`/routes/items/${itemId}/check-out`, {
            lat,
            lng,
            timestamp: new Date().toISOString(),
            exitPhoto
          });
          toast.success('Visita finalizada!');
          
          const updatedItems = route.items.map((i: any) => {
            if (i.id === itemId) {
                const promoterId = user?.employee?.id || user?.id;
                const updatedCheckins = (i.checkins || []).map((c: any) => {
                    const cPid = c.promoterId || c.promoter?.id;
                    if (cPid === promoterId && !c.checkOutTime) {
                        return { ...c, checkOutTime: new Date().toISOString() };
                    }
                    return c;
                });
                return { ...i, status: 'CHECKOUT', checkOutTime: new Date().toISOString(), checkins: updatedCheckins };
            }
            return i;
          });
          
          const allDone = updatedItems.every((i: any) => i.status === 'CHECKOUT' || i.status === 'COMPLETED');
          setRoute({ ...route, status: allDone ? 'COMPLETED' : route.status, items: updatedItems });
          setActiveItem(null);
          fetchRoute();
        } catch (err: any) {
          if (err.response && err.response.status >= 400 && err.response.status < 500) {
               console.error('Checkout failed with 4xx:', err.response.data);
               toast.error(`Erro: ${err.response.data?.message || 'Erro ao finalizar visita'}`);
               setProcessing(false);
               return;
          }

          console.error('API failed, saving offline action', err);
          await offlineService.addPendingAction(
            'CHECKOUT',
            `/routes/items/${itemId}/check-out`,
            'POST',
            { lat, lng, timestamp: new Date().toISOString(), exitPhoto }
          );

          const updatedItems = route.items.map((i: any) => {
            if (i.id === itemId) {
                const promoterId = user?.employee?.id || user?.id;
                const updatedCheckins = (i.checkins || []).map((c: any) => {
                    const cPid = c.promoterId || c.promoter?.id;
                    if (cPid === promoterId && !c.checkOutTime) {
                        return { ...c, checkOutTime: new Date().toISOString() };
                    }
                    return c;
                });
                return { ...i, status: 'CHECKOUT', checkOutTime: new Date().toISOString(), checkins: updatedCheckins };
            }
            return i;
          });
          
          const allDone = updatedItems.every((i: any) => i.status === 'CHECKOUT' || i.status === 'COMPLETED');
          setRoute({ ...route, status: allDone ? 'COMPLETED' : route.status, items: updatedItems });
          setActiveItem(null);
          updatePendingCount();
        } finally {
          setProcessing(false);
        }
  };

  const handleActionPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !pendingAction) return;
    
    const file = event.target.files[0];
    setProcessing(true);
    
    try {
        const item = route.items.find((i: any) => i.id === pendingAction.itemId);
        const promoterName = user?.name || 'Promotor';
        const supermarketName = item?.supermarket?.fantasyName || item?.supermarket?.name || 'PDV';
        
        const result = await processImage(file, {
            supermarketName,
            promoterName,
            timestamp: new Date(),
            blurThreshold: branding?.blurThreshold
        });
        
        const reader = new FileReader();
        reader.readAsDataURL(result.blob);
        reader.onloadend = async () => {
            const base64data = String(reader.result);
            
            if (pendingAction.type === 'CHECKIN') {
                await executeCheckIn(pendingAction.itemId, pendingAction.location.lat, pendingAction.location.lng, base64data);
            } else {
                await executeCheckOut(pendingAction.itemId, pendingAction.location.lat, pendingAction.location.lng, base64data);
            }
            
            setPendingAction(null);
            if (actionFileInputRef.current) actionFileInputRef.current.value = '';
        };
        
    } catch (error: any) {
        toast.error('Erro ao processar foto: ' + (error?.message || 'Erro desconhecido'));
        setProcessing(false);
    }
  };

  const handleCheckIn = async (itemId: string) => {
    // Check if route date is today
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    // Use string manipulation to avoid timezone shifts (e.g. UTC midnight becoming previous day)
    const routeDateStr = String(route.date).split('T')[0];
    
    if (todayStr !== routeDateStr) {
        toast.error('Check-in permitido apenas na data agendada da visita.');
        return;
    }

    // Find the item to check coordinates
    const itemToCheck = route.items.find((i: any) => i.id === itemId);
    if (!itemToCheck) return;

    setProcessing(true);
    
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
                
                // Request Photo instead of proceeding immediately
                setPendingAction({ type: 'CHECKIN', itemId, location: { lat: userLat, lng: userLng } });
                setProcessing(false);
                setTimeout(() => actionFileInputRef.current?.click(), 100);
                toast('Por favor, tire uma foto da fachada da loja para iniciar.', { icon: '📸' });
            },
            (error) => {
               console.warn('Geolocation error:', error);
               toast.error('Erro de geolocalização: ' + (error.message || 'Tempo esgotado'));
               setProcessing(false);
            }, 
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
        );
    } else {
        toast.error('Geolocalização não suportada');
        setProcessing(false);
    }
  };

  const validateRouteItemCompletion = (item: any) => {
    if (!item || !item.products) return { valid: false, message: 'Dados inválidos' };

    // Group by Category
    const categories = Array.from(new Set(item.products.map((p: any) => p.product?.category || 'Geral')));

    for (const cat of categories) {
        const catProducts = item.products.filter((p: any) => (p.product?.category || 'Geral') === cat);
        
        // Check Products
        const incompleteProducts = catProducts.filter((p: any) => {
            const gDone = p.gondolaCount !== null && p.gondolaCount !== undefined;
            const inv = p.inventoryCount;
            const hasRupture = !!p.ruptureReason || !!p.isStockout;
            
            const iDone = (() => {
                if (inv === null || inv === undefined) return false;
                if (inv === 0) return hasRupture;
                return inv > 0;
            })();
            
            const checked = !!p.checked;
            return !(gDone && iDone && checked);
        });

        if (incompleteProducts.length > 0) {
            return { valid: false, message: `Existem ${incompleteProducts.length} itens pendentes na categoria ${cat}.` };
        }

        // Check Category Photos
        const catPhotos = item.categoryPhotos?.[cat] || {};
        const hasBefore = Array.isArray(catPhotos.before) ? catPhotos.before.length > 0 : !!catPhotos.before;
        const hasAfter = Array.isArray(catPhotos.after) ? catPhotos.after.length > 0 : !!catPhotos.after;

        if (!hasBefore) {
            return { valid: false, message: `Foto de 'Antes' pendente na categoria ${cat}.` };
        }
        if (!hasAfter) {
            return { valid: false, message: `Foto de 'Depois' pendente na categoria ${cat}.` };
        }
    }
    
    return { valid: true };
  };

  const handleCheckOut = async (itemId: string) => {
    // Validate Checklist Completion
    const item = route.items.find((i: any) => i.id === itemId);
    const validation = validateRouteItemCompletion(item);
    if (!validation.valid) {
        toast.error(validation.message || 'Complete todas as tarefas antes de finalizar.');
        return;
    }

    setProcessing(true);
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                // Request Photo instead of proceeding immediately
                setPendingAction({ type: 'CHECKOUT', itemId, location: { lat: userLat, lng: userLng } });
                setProcessing(false);
                setTimeout(() => actionFileInputRef.current?.click(), 100);
                toast('Por favor, tire uma foto final da loja para encerrar.', { icon: '📸' });
            },
            (error) => {
                console.error('Geolocation error on checkout', error);
                toast.error('Erro de geolocalização: ' + (error.message || 'Não foi possível obter sua localização.'));
                setProcessing(false);
                // Strict mode: Do not proceed if geo fails
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        toast.error('Geolocalização não suportada neste dispositivo.');
        setProcessing(false);
    }
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

  const totalDurationMs = route.items.reduce((acc: number, item: any) => {
      if (item.checkInTime && item.checkOutTime) {
          return acc + (new Date(item.checkOutTime).getTime() - new Date(item.checkInTime).getTime());
      }
      return acc;
  }, 0);

  const hours = Math.floor(totalDurationMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));
  const totalDurationStr = `${hours}h ${minutes}m`;

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex flex-col gap-2 sticky top-0 z-10">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/')} className="p-1">
                <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <div>
                <h1 className="font-bold text-gray-800">Detalhes da Rota</h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{String(route.date).split('T')[0].split('-').reverse().join('/')}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {totalDurationStr}</span>
                </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                {pendingCount > 0 && (
                    <button 
                        onClick={() => offlineService.syncPendingActions(true)}
                        className="p-2 bg-orange-100 text-orange-600 rounded-full animate-pulse"
                        title={`${pendingCount} ações pendentes. Clique para forçar sincronização.`}
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

        {((route.promoters && route.promoters.length > 0) || route.promoter) && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-500">Equipe:</span>
                <div className="flex -space-x-2">
                    {((route.promoters && route.promoters.length > 0) ? route.promoters : (route.promoter ? [route.promoter] : [])).map((p: any) => {
                      const displayName = (p.fullName || p.name || p.email || '').trim() || 'Promotor';
                      return (
                        <div
                          key={p.id}
                          className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border-2 border-white flex items-center justify-center text-[10px] font-bold"
                          title={displayName}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      );
                    })}
                </div>
                <span className="text-xs text-gray-400 ml-1">
                    {((route.promoters && route.promoters.length > 0) ? route.promoters : (route.promoter ? [route.promoter] : [])).map((p: any) => {
                      const displayName = (p.fullName || p.name || p.email || '').trim() || 'Promotor';
                      return displayName.split(' ')[0];
                    }).join(', ')}
                </span>
            </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Deduplicate items just in case */}
        {Array.from(new Map(route.items.map((item: any) => [item.id, item])).values())
            .sort((a: any, b: any) => a.order - b.order)
            .map((item: any, index: number) => {
           const isActive = activeItem?.id === item.id;
           const isCompleted = item.status === 'CHECKOUT' || item.status === 'COMPLETED';
           // const isPending = item.status === 'PENDING' || !item.status;
           
           const itemDuration = formatDuration(item.checkInTime, item.checkOutTime);
           
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

           // Check if current user is checked in
           const currentUserCheckin = item.checkins?.find((c: any) => {
             const pId = c.promoterId || c.promoter?.id;
             const uId = user?.employee?.id || user?.id;
             return pId === uId && !c.checkOutTime;
           });
           const isCurrentUserCheckedIn = !!currentUserCheckin;

  // Determine effective status for current user
  // If user is checked in, treat as Active for them regardless of route item status
  // If route item is Active but user not checked in, treat as Pendng (needs Checkin)
  const isUserActive = isCurrentUserCheckedIn;
  const isItemActiveGlobal = isActive; // Existing isActive is based on item.status === 'CHECKIN'
  const isRouteCompleted = route.status === 'COMPLETED';

  // If item is globally active but user hasn't checked in, we want to show CHECKIN button.
  // If item is NOT active globally, but user hasn't checked in, show CHECKIN button (standard flow).

  const showCheckInButton = !isCurrentUserCheckedIn && !isCompleted && !isRouteCompleted;
  const showActions = isCurrentUserCheckedIn && !isRouteCompleted; 
  // Wait, if item is completed, we don't show checkin.
  
  // Refined Logic:
  // Show Check-in if: Not Completed AND Not Checked In (regardless of Global Active status) AND Route Not Completed
  // Show Actions if: Checked In (regardless of Global Active status) AND Route Not Completed

  return (
    <div id={`item-${item.id}`} key={item.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isUserActive ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'} ${isRouteCompleted ? 'opacity-75' : ''}`}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3 flex-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
              isCompleted ? 'bg-green-100 text-green-600' : 
              isUserActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
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
            {itemDuration && (
              <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                <Clock size={10} /> {itemDuration}
              </p>
            )}
          </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
              isCompleted ? 'bg-green-50 text-green-700' :
              isUserActive ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {isUserActive ? 'Em Andamento (Você)' : isItemActiveGlobal ? 'Em Andamento (Equipe)' : isCompleted ? 'Concluído' : 'Pendente'}
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

        <div className="mt-4 pt-3 border-t border-gray-50">
          {showActions ? (
            <div className="space-y-3">
              <button
                onClick={() => setShowTasksModal(true)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 mb-2"
              >
                <ListTodo size={20} />
                Ver Lista de Tarefas
              </button>

              <div className="flex gap-2 flex-col">
                {!validateRouteItemCompletion(item).valid && (
                  <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-100 mb-1">
                    Complete todas as tarefas para finalizar.
                  </div>
                )}
                <button 
                  onClick={() => handleCheckOut(item.id)}
                  disabled={processing || !validateRouteItemCompletion(item).valid}
                  className={`flex-1 py-3 text-white rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 transition-all ${
                    processing || !validateRouteItemCompletion(item).valid
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                      : 'bg-green-600 hover:bg-green-700 animate-pulse'
                  }`}
                >
                  <CheckCircle size={20} />
                  Finalizar Visita
                </button>
              </div>

            </div>
          ) : isCompleted ? (
            <div className="flex flex-col items-start gap-1 text-sm">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle size={16} />
                <span>Visita realizada</span>
                {item.checkOutTime && (
                  <span className="text-xs text-gray-400">
                    ({format(new Date(item.checkOutTime), 'HH:mm')})
                  </span>
                )}
              </div>
              {item.manualEntryBy && (
                <div className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                  <AlertTriangle size={12} />
                  <span>Fechamento manual</span>
                </div>
              )}
            </div>
          ) : isRouteCompleted ? (
             <div className="flex items-center gap-2 text-gray-500 text-sm bg-gray-50 p-2 rounded">
                <CheckCircle size={16} />
                <span>Rota Finalizada</span>
             </div>
          ) : isFutureRoute ? (
             <div className="flex items-center gap-2 text-gray-500 text-sm bg-gray-50 p-2 rounded">
                <Clock size={16} />
                <span>Rota futura. Check-in liberado apenas no dia da visita.</span>
             </div>
          ) : isPastRoute ? (
             <div className="flex flex-col gap-1 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <span>Rota de data anterior. Novo check-in não é permitido.</span>
                <span>Use o painel web para ajustes ou lançamentos manuais.</span>
             </div>
          ) : (
            <div className="space-y-2">
                {/* Visual block for checklist if team is active but user hasn't joined */}
                {isItemActiveGlobal && (
                    <button
                        disabled
                        className="w-full py-3 bg-gray-100 text-gray-400 rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200 mb-2"
                    >
                        <ListTodo size={20} />
                        Checklist Bloqueado (Necessário Entrar na Equipe)
                    </button>
                )}
                <button 
                  onClick={() => handleCheckIn(item.id)}
                  disabled={processing}
                  className={`w-full py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 text-white ${
                      isItemActiveGlobal 
                        ? 'bg-orange-600 hover:bg-orange-700 shadow-md' 
                        : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <MapPin size={16} />
                  {isItemActiveGlobal ? 'Entrar na Equipe' : 'Fazer Check-in'}
                </button>
            </div>
          )}
                 </div>
               </div>
             </div>
           );
        })}
      </div>

      {/* Tasks Modal */}
      {showTasksModal && activeItem && (
        selectedCategory && selectedCategoryMode ? (
          <CategoryTaskFlow
            routeItem={activeItem}
            category={selectedCategory}
            products={activeItem.products.filter(
              (p: any) => (p.product?.category || 'Geral') === selectedCategory
            )}
            photoConfig={
              activeItem.products.find(
                (p: any) => (p.product?.category || 'Geral') === selectedCategory
              )?.product?.client?.photoConfig
            }
            onUpdateItem={async (itemId, data, skipSync) => {
              const updatedItems = route.items.map((i: any) =>
                i.id === itemId ? { ...i, ...data } : i
              );
              setRoute({ ...route, items: updatedItems });
              if (!skipSync) {
                  await client.patch(`/routes/items/${itemId}`, data);
              }
            }}
            onUpdateProduct={async (productId, data) => {
              const updatedItems = route.items.map((i: any) => {
                if (i.id === activeItem.id) {
                  return {
                    ...i,
                    products: i.products.map((p: any) =>
                      p.productId === productId ? { ...p, ...data } : p
                    ),
                  };
                }
                return i;
              });
              setRoute({ ...route, items: updatedItems });
              await client.patch(
                `/routes/items/${activeItem.id}/products/${productId}/check`,
                data
              );
            }}
            onFinish={() => {
              setSelectedCategory(null);
              setSelectedCategoryMode(null);
            }}
            onBack={() => {
              setSelectedCategory(null);
              setSelectedCategoryMode(null);
            }}
            mode={
              selectedCategoryMode === 'ITEMS'
                ? 'ITEMS'
                : selectedCategoryMode === 'PHOTOS'
                ? 'PHOTOS'
                : 'FULL'
            }
            readOnly={isPastRoute || activeItem.status === 'CHECKOUT' || activeItem.status === 'COMPLETED'}
          />
        ) : (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex flex-col justify-end sm:justify-center" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col w-full sm:max-w-md mx-auto">
                    <div className="p-4 border-b flex justify-between items-center" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">Tarefas da Visita</h3>
                            <p className="text-xs text-gray-500">{activeItem.supermarket.name}</p>
                        </div>
                        <button onClick={() => setShowTasksModal(false)} className="p-2 bg-gray-100 rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                        {Array.from(new Set(activeItem.products?.map((p: any) => p.product?.category || 'Geral') as string[])).sort().map((cat) => {
                            const catProducts = activeItem.products.filter((p: any) => (p.product?.category || 'Geral') === cat);
                            const total = catProducts.length;
                            const completed = catProducts.filter((p: any) => {
                                const gDone = p.gondolaCount !== null && p.gondolaCount !== undefined;
                                const inv = p.inventoryCount;
                                const hasRupture = !!p.ruptureReason || !!p.isStockout;
                                const iDone = (() => {
                                  if (inv === null || inv === undefined) return false;
                                  if (inv === 0) return hasRupture;
                                  return inv > 0;
                                })();
                                const checked = !!p.checked;
                                return gDone && iDone && checked;
                            }).length;
                            const catPhotos = activeItem.categoryPhotos?.[cat] || {};
                            const beforeOk = !!catPhotos.before;
                            const afterOk = !!catPhotos.after;
                            
                            const isDone = completed === total && total > 0;
                            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

                            return (
                              <div 
                                key={cat}
                                className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm transition-colors"
                              >
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-gray-800">{cat}</h4>
                                    <div className="flex items-center gap-2 mt-1 mb-1">
                                      <span className="text-xs text-gray-500">{completed}/{total} itens</span>
                                      {isDone && (
                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                          Concluído
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                                          (Array.isArray(catPhotos.before) ? catPhotos.before.length > 0 : !!catPhotos.before)
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-gray-100 text-gray-500'
                                        }`}
                                      >
                                        {(Array.isArray(catPhotos.before) ? catPhotos.before.length > 0 : !!catPhotos.before)
                                          ? 'Foto Antes OK'
                                          : 'Foto Antes pendente'}
                                      </span>
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                                          (Array.isArray(catPhotos.after) ? catPhotos.after.length > 0 : !!catPhotos.after)
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-gray-100 text-gray-500'
                                        }`}
                                      >
                                        {(Array.isArray(catPhotos.after) ? catPhotos.after.length > 0 : !!catPhotos.after)
                                          ? 'Foto Depois OK'
                                          : 'Foto Depois pendente'}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
                                      <div
                                        className={`h-full rounded-full ${
                                          progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                                        }`}
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedCategory(cat as string);
                                      setSelectedCategoryMode('ITEMS');
                                    }}
                                    className="w-full py-2 px-3 rounded-lg border border-blue-500 text-blue-600 text-xs font-semibold flex items-center justify-center gap-1 active:scale-[0.98] transition-transform"
                                  >
                                    <ListTodo size={14} />
                                    <span>Ver itens</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedCategory(cat as string);
                                      setSelectedCategoryMode('PHOTOS');
                                    }}
                                    className="w-full py-2 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1 active:scale-[0.98] transition-transform"
                                  >
                                    <Camera size={14} />
                                    <span>Fotos antes/depois</span>
                                  </button>
                                </div>
                              </div>
                            );
                        })}
                        {(!activeItem.products || activeItem.products.length === 0) && (
                            <div className="text-center py-8 text-gray-500">
                                <ListTodo size={48} className="mx-auto mb-2 opacity-20" />
                                <p>Nenhuma tarefa listada.</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="sticky bottom-0 bg-white border-t p-4">
                        <button
                          onClick={() => handleCheckOut(activeItem.id)}
                          className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
                          disabled={processing}
                        >
                          Finalizar Visita
                        </button>
                    </div>
                </div>
            </div>
        )
      )}

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

      <input 
        type="file" 
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoCapture}
      />

      <input 
        type="file" 
        ref={actionFileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleActionPhoto}
      />

      {validationError && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-4 animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2">
              <Camera size={32} />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 text-center">Foto Recusada</h3>
            
            <p className="text-center text-gray-600">
              {validationError}
            </p>

            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 w-full text-xs text-orange-800 mt-2">
              <p className="font-bold mb-1">Dicas para uma boa foto:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Segure o celular com firmeza</li>
                <li>Limpe a lente da câmera</li>
                <li>Garanta boa iluminação</li>
                <li>Evite tirar foto de telas</li>
              </ul>
            </div>

            <button 
              onClick={() => setValidationError(null)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors mt-2"
            >
              Entendi, vou tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Bottom Actions Bar (Only if checked in) */}
      {activeItem && (activeItem.checkins?.some((c: any) => {
          const pId = c.promoterId || c.promoter?.id;
          const uId = user?.employee?.id || user?.id;
          return pId === uId && !c.checkOutTime;
      })) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around items-center z-10">
          {/* <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 text-blue-600"
            disabled={processing}
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Camera size={24} />
            </div>
            <span className="text-xs font-medium">Fotos</span>
          </button> */}

          <button 
            className="flex flex-col items-center gap-1 text-blue-600"
            onClick={() => setShowTasksModal(true)}
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <ListTodo size={24} />
            </div>
            <span className="text-xs font-medium">Tarefas</span>
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
