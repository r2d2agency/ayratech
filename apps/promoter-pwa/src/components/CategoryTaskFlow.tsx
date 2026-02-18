import React, { useState, useRef, useEffect } from 'react';
import { Camera, ChevronRight, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ProductCountModal } from './ProductCountModal';
import { offlineService } from '../services/offline.service';
import client from '../api/client';
import { processImage } from '../utils/image-processor';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils/image';

interface CategoryTaskFlowProps {
  routeItem: any;
  category: string;
  products: any[];
  photoConfig?: {
    labels?: {
      before?: string;
      storage?: string;
      after?: string;
    };
    categories?: {
      [key: string]: {
        labels?: {
          before?: string;
          storage?: string;
          after?: string;
        };
      };
    };
  };
  onUpdateItem: (itemId: string, data: any) => Promise<void>;
  onUpdateProduct: (productId: string, data: any) => Promise<void>;
  onFinish: () => void;
  onBack: () => void;
}

const STEPS = {
  BEFORE_PHOTO: 0,
  GONDOLA_COUNT: 1,
  INVENTORY_COUNT: 2,
  AFTER_PHOTO: 3,
  SUMMARY: 4
};

export const CategoryTaskFlow: React.FC<CategoryTaskFlowProps> = ({
  routeItem,
  category,
  products,
  photoConfig,
  onUpdateItem,
  onUpdateProduct,
  onFinish,
  onBack
}) => {
  const [step, setStep] = useState(STEPS.BEFORE_PHOTO);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [countMode, setCountMode] = useState<'GONDOLA' | 'INVENTORY'>('GONDOLA');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const photos = getCategoryPhotos();
    const catProducts = products || [];
    const allProductsComplete = catProducts.length > 0 && catProducts.every(isProductCountComplete);

    if (!photos.before) {
      setStep(STEPS.BEFORE_PHOTO);
      return;
    }

    if (!allProductsComplete) {
      setStep(STEPS.GONDOLA_COUNT);
      return;
    }

    if (!photos.after) {
      setStep(STEPS.AFTER_PHOTO);
      return;
    }

    setStep(STEPS.SUMMARY);
  }, [category, routeItem.categoryPhotos, products]);

  const getLabel = (type: 'before' | 'after') => {
    const categoryConfig = photoConfig?.categories?.[category];
    const defaultLabels = photoConfig?.labels;
    
    if (categoryConfig?.labels?.[type]) return categoryConfig.labels[type];
    if (defaultLabels?.[type]) return defaultLabels[type];
    
    switch(type) {
      case 'before': return 'Foto Antes';
      case 'after': return 'Foto Depois';
      default: return 'Foto';
    }
  };

  // Helper to get current photos for this category
  const getCategoryPhotos = () => {
    return routeItem.categoryPhotos?.[category] || {};
  };

  const isProductCountComplete = (p: any) => {
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
  };

  const areAllProductsComplete = () => {
    const catProducts = products || [];
    if (!catProducts.length) return false;
    return catProducts.every(isProductCountComplete);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    if (!e.target.files || !e.target.files[0]) return;
    
    setUploading(true);
    const file = e.target.files[0];

    try {
      const supermarketName = routeItem.supermarket?.name || 'PDV';
      const promoterName = user?.name || 'Promotor';

      const { blob, previewUrl } = await processImage(file, {
        supermarketName,
        promoterName,
        timestamp: new Date()
      });

      const formData = new FormData();
      formData.append('file', blob, 'photo.jpg');
      formData.append('type', `CATEGORY_${type.toUpperCase()}`);
      formData.append('category', category);

      try {
        const res = await client.post(`/routes/items/${routeItem.id}/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        const photoUrl = res.data.url || res.data.path || previewUrl;

        const currentPhotos = getCategoryPhotos();
        const updatedPhotos = {
          ...routeItem.categoryPhotos,
          [category]: {
            ...currentPhotos,
            [type]: photoUrl
          }
        };

        await onUpdateItem(routeItem.id, { categoryPhotos: updatedPhotos });
        toast.success('Foto salva!');
      } catch (uploadError: any) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = String(reader.result);
          await offlineService.addPendingAction(
            'PHOTO',
            `/routes/items/${routeItem.id}/photos`,
            'POST',
            {
              fileBase64: base64data,
              filename: 'photo.jpg',
              photoType: `CATEGORY_${type.toUpperCase()}`,
              category
            }
          );
          toast.success('Foto salva offline. Será enviada quando houver conexão.');
        };
      }
    } catch (error: any) {
      const message = error?.message || 'Erro ao processar foto.';
      if (message.includes('borrada') || message.includes('escura') || message.includes('clara')) {
        setValidationError(message);
      } else {
        toast.error(message);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProductSave = async (_productId: string, _data: any) => {};

  const validateStep = () => {
    if (step === STEPS.BEFORE_PHOTO) {
      const photos = getCategoryPhotos();
      if (!photos.before) {
        toast.error(`Tire a ${getLabel('before')} para continuar.`);
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (step === STEPS.BEFORE_PHOTO) {
        onBack();
    } else {
        setStep(prev => prev - 1);
    }
  };

  const renderPhotoStep = (type: 'before' | 'after', title: string, description: string) => {
    const photos = getCategoryPhotos();
    const currentUrl = photos[type];

    return (
      <div className="flex flex-col items-center justify-center h-full p-6 space-y-6 pb-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-500">{description}</p>
        </div>

        <label htmlFor={`category-photo-${type}`} className="w-full aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden cursor-pointer">
          {currentUrl ? (
            <img src={getImageUrl(currentUrl)} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-gray-400">
              <Camera size={48} />
              <span className="mt-2 text-sm font-medium">Tocar para fotografar</span>
            </div>
          )}
          
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </label>

        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          className="hidden"
          id={`category-photo-${type}`} 
          ref={fileInputRef}
          onChange={(e) => handlePhotoUpload(e, type)}
        />

        <div className="w-full pt-4">
          <button 
            onClick={nextStep}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            Próximo
            <ChevronRight className="ml-2" />
          </button>
        </div>
      </div>
    );
  };

  const renderCountStep = (mode: 'GONDOLA' | 'INVENTORY', title: string) => {
    const total = products.length;
    const counted = products.filter(p => {
      if (mode === 'GONDOLA') return p.gondolaCount !== null && p.gondolaCount !== undefined;
      if (mode === 'INVENTORY') {
        const inv = p.inventoryCount;
        const hasRupture = !!p.ruptureReason || !!p.isStockout;
        if (inv === null || inv === undefined) return false;
        if (inv === 0) return hasRupture;
        return inv > 0;
      }
      return false;
    }).length;

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 bg-white shadow-sm z-10">
          <h2 className="text-xl font-bold text-gray-800 mb-1">{title}</h2>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{category}</span>
            <span>{counted} / {total} Concluídos</span>
          </div>
          <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(counted / Math.max(1,total)) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {products.map(p => {
            const gDone = p.gondolaCount !== null && p.gondolaCount !== undefined;
            const inv = p.inventoryCount;
            const hasRupture = !!p.ruptureReason || !!p.isStockout;
            const iDone = (() => {
              if (inv === null || inv === undefined) return false;
              if (inv === 0) return hasRupture;
              return inv > 0;
            })();
            const checked = !!p.checked;

            let progress = 0;
            if (gDone) progress += 40;
            if (iDone) progress += 40;
            if (checked) progress += 20;

            return (
              <div 
                key={p.productId}
                onClick={() => { setCountMode(mode); setSelectedProduct(p); }}
                className="bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col gap-2 active:scale-[0.98] transition-transform"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{p.product.name}</h3>
                    <p className="text-xs text-gray-500">{p.product.ean || 'Sem EAN'}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {checked ? <span className="text-green-600">Checklist ok</span> : <span className="text-orange-600">Checklist pendente</span>}
                  </div>
                </div>
                <div className="w-full flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-400">{progress}%</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-white border-t">
          <button 
            onClick={nextStep}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
          >
            Próxima Etapa
          </button>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    const photos = getCategoryPhotos();
    const canFinish = !!photos.before && !!photos.after && areAllProductsComplete();
    return (
      <div className="flex flex-col h-full p-6 space-y-6 items-center justify-center">
        <h2 className="text-2xl font-bold text-center">Categoria Concluída!</h2>
        <p className="text-center text-gray-500">Você finalizou as fotos e contagens de <strong>{category}</strong>.</p>
        {!canFinish && (
          <div className="bg-yellow-50 p-4 rounded-lg text-yellow-800 text-sm w-full">
            <AlertTriangle size={16} className="inline mr-2" />
            É necessário tirar as fotos de Antes e Depois e concluir as contagens.
          </div>
        )}
        <button 
          onClick={onFinish}
          disabled={!canFinish}
          className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Finalizar Categoria
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-40 flex flex-col animate-slideUp">
      <div className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
        <button onClick={prevStep} className="text-gray-600 p-2">
          <ArrowLeft />
        </button>
        <h1 className="font-bold text-lg">{category}</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {step === STEPS.BEFORE_PHOTO && renderPhotoStep('before', getLabel('before'), 'Registre o estado inicial.')}
        {step === STEPS.GONDOLA_COUNT && renderCountStep('GONDOLA', 'Contagem: Gôndola (Frente)')}
        {step === STEPS.INVENTORY_COUNT && renderCountStep('INVENTORY', 'Contagem: Estoque')}
        {step === STEPS.AFTER_PHOTO && renderPhotoStep('after', getLabel('after'), 'Registre o resultado final.')}
        {step === STEPS.SUMMARY && renderSummary()}
      </div>

      {selectedProduct && (
        <ProductCountModal 
          isOpen={true}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
          onSave={async (productId, data) => {
            await onUpdateProduct(productId, data);
            setSelectedProduct(null);
          }}
          mode={countMode}
        />
      )}

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
    </div>
  );
};
