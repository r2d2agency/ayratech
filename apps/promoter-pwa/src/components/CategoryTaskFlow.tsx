import React, { useState, useRef, useEffect } from 'react';
import { Camera, ChevronRight, AlertTriangle, ArrowLeft, X, ListChecks, Package, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ProductCountModal } from './ProductCountModal';
import { offlineService } from '../services/offline.service';
import client from '../api/client';
import { processImage } from '../utils/image-processor';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { resolveImageUrl } from '../utils/image';

type CategoryFlowMode = 'FULL' | 'ITEMS' | 'PHOTOS';

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
  onUpdateItem: (itemId: string, data: any, skipSync?: boolean) => Promise<void>;
  onUpdateProduct: (productId: string, data: any) => Promise<void>;
  onFinish: () => void;
  onBack: () => void;
  mode?: CategoryFlowMode;
  readOnly?: boolean;
}

const STEPS = {
  MENU: -1,
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
  onBack,
  mode = 'FULL',
  readOnly = false
}) => {
  const [step, setStep] = useState(mode === 'ITEMS' ? STEPS.GONDOLA_COUNT : STEPS.MENU);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [countMode, setCountMode] = useState<'GONDOLA' | 'INVENTORY'>('GONDOLA');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { branding } = useBranding();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const initializedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${category}-${mode}`;
    if (initializedRef.current === key) return;
    initializedRef.current = key;

    // Se for modo ITEMS, vai direto para contagem
    if (mode === 'ITEMS') {
      setStep(STEPS.GONDOLA_COUNT);
      return;
    }
    
    // Para FULL e PHOTOS, exibe o menu principal
    setStep(STEPS.MENU);
  }, [category, mode]);

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

  const getChecklistTemplate = (p: any) => {
    const product = p.product;
    // Prioritize product-specific template, then brand template
    return product.checklistTemplate || product.brand?.checklistTemplate;
  };

  const isStockCountRequired = (p: any) => {
    // 1. Check instantiated checklists (generated at route creation)
    // This is the most accurate source of truth for the specific task
    if (p.checklists && p.checklists.length > 0) {
      return p.checklists.some((c: any) => c.type === 'STOCK_COUNT');
    }

    // 2. Fallback: Check template directly (for legacy or newly added products not yet synced?)
    const template = getChecklistTemplate(p);
    // If no template, default to TRUE (safe default to ensure data collection)
    if (!template) return true;
    
    // Check if any item in template is STOCK_COUNT
    return template.items?.some((i: any) => i.type === 'STOCK_COUNT');
  };

  const isProductCountComplete = (p: any) => {
    const required = isStockCountRequired(p);
    const checked = !!p.checked;

    if (!required) {
      // If stock count not required, just need to be checked (saved)
      // Unless validity is required? 
      // Validity check is usually inside the modal logic too.
      // If validity is required, the modal won't let you save without it.
      // So 'checked' implies validity was done if required.
      return checked;
    }

    const gDone = p.gondolaCount !== null && p.gondolaCount !== undefined;
    const inv = p.inventoryCount;
    const hasRupture = !!p.ruptureReason || !!p.isStockout;
    const iDone = (() => {
      if (inv === null || inv === undefined) return false;
      if (inv === 0) return hasRupture;
      return inv > 0;
    })();
    
    return gDone && iDone && checked;
  };

  const areAllProductsComplete = () => {
    const catProducts = products || [];
    if (!catProducts.length) return false;
    return catProducts.every(isProductCountComplete);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    if (readOnly) return;
    if (!e.target.files || !e.target.files[0]) return;
    
    setUploading(true);
    const file = e.target.files[0];

    try {
      const supermarketName = routeItem.supermarket?.fantasyName || routeItem.supermarket?.name || 'PDV';
      const promoterName = user?.name || 'Promotor';

      const { blob, previewUrl } = await processImage(file, {
        supermarketName,
        promoterName,
        timestamp: new Date(),
        blurThreshold: branding?.blurThreshold
      });

      const formData = new FormData();
            formData.append('type', type);
            formData.append('category', category);
            formData.append('file', blob, 'photo.jpg');

      try {
        const res = await client.post(`/routes/items/${routeItem.id}/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        const photoUrl = res.data.url || res.data.path || previewUrl;

        const currentPhotos = getCategoryPhotos();
        const currentList = Array.isArray(currentPhotos[type]) ? currentPhotos[type] : (currentPhotos[type] ? [currentPhotos[type]] : []);
        const updatedPhotos = {
          ...routeItem.categoryPhotos,
          [category]: {
            ...currentPhotos,
            [type]: [...currentList, photoUrl]
          }
        };

        await onUpdateItem(routeItem.id, { categoryPhotos: updatedPhotos });
        toast.success('Foto salva!');
      } catch (uploadError: any) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = String(reader.result);
          const currentPhotos = getCategoryPhotos();
          const currentList = Array.isArray(currentPhotos[type]) ? currentPhotos[type] : (currentPhotos[type] ? [currentPhotos[type]] : []);
          const updatedPhotos = {
            ...routeItem.categoryPhotos,
            [category]: {
              ...currentPhotos,
              [type]: [...currentList, base64data]
            }
          };
          await onUpdateItem(routeItem.id, { categoryPhotos: updatedPhotos }, true);
          await offlineService.addPendingAction(
            'PHOTO',
            `/routes/items/${routeItem.id}/photos`,
            'POST',
            {
              fileBase64: base64data,
              filename: 'photo.jpg',
              photoType: type,
              category
            }
          );
          // Toast feedback is handled by offlineService
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
  
  const handlePhotoRemove = async (type: 'before' | 'after', index: number) => {
    const currentPhotos = getCategoryPhotos();
    const currentList = Array.isArray(currentPhotos[type]) ? currentPhotos[type] : (currentPhotos[type] ? [currentPhotos[type]] : []);
    const newList = currentList.filter((_: string, i: number) => i !== index);
    const updatedPhotos = {
      ...routeItem.categoryPhotos,
      [category]: {
        ...currentPhotos,
        [type]: newList
      }
    };
    await onUpdateItem(routeItem.id, { categoryPhotos: updatedPhotos });
    toast.success('Foto removida.');
  };

  const handleProductSave = async (productId: string, data: any) => {
    try {
      await onUpdateProduct(productId, data);
      setSelectedProduct(null);
      toast.success('Salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast.error('Erro ao salvar. Tente novamente.');
    }
  };

  const validateStep = () => {
    // Validação só é necessária ao tentar finalizar ou avançar no fluxo de contagem
    return true;
  };

  const nextStep = () => {
    if (mode === 'ITEMS') {
      if (step === STEPS.GONDOLA_COUNT) {
        setStep(STEPS.INVENTORY_COUNT);
      } else if (step === STEPS.INVENTORY_COUNT) {
        onBack();
      }
      return;
    }

    if (mode === 'PHOTOS') {
       // Modo legado apenas fotos
       if (step === STEPS.BEFORE_PHOTO) setStep(STEPS.AFTER_PHOTO);
       else if (step === STEPS.AFTER_PHOTO) setStep(STEPS.MENU);
       else onBack();
       return;
    }

    // Fluxo HUB
    if (step === STEPS.GONDOLA_COUNT) {
        setStep(STEPS.INVENTORY_COUNT);
        return;
    }
    
    // Qualquer outro passo volta para o menu
    setStep(STEPS.MENU);
  };

  const prevStep = () => {
    if (mode === 'ITEMS') {
      if (step === STEPS.GONDOLA_COUNT) onBack();
      else if (step === STEPS.INVENTORY_COUNT) setStep(STEPS.GONDOLA_COUNT);
      return;
    }

    if (step === STEPS.MENU) {
        onBack();
        return;
    }

    if (step === STEPS.INVENTORY_COUNT) {
        setStep(STEPS.GONDOLA_COUNT);
        return;
    }

    // Qualquer outro sub-passo volta para o menu
    setStep(STEPS.MENU);
  };

  const renderPhotoStep = (type: 'before' | 'after', title: string, description: string) => {
    const photos = getCategoryPhotos();
    const currentUrl = photos[type];
    const urls = Array.isArray(currentUrl) ? currentUrl : (currentUrl ? [currentUrl] : []);

    return (
      <>
      <div className="flex flex-col items-center h-full p-4 space-y-4 pb-48 overflow-y-auto">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>

        <div className="w-full grid grid-cols-2 gap-3">
            {urls.map((u: string, i: number) => (
              <div key={i} className="relative w-full aspect-square rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                <img
                  src={resolveImageUrl(u)}
                  alt={`${title} ${i + 1}`}
                  className="w-full h-full object-cover"
                  onClick={() => setPreviewUrl(u)}
                />
                <button
                  onClick={() => handlePhotoRemove(type, i)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            
            <label
              htmlFor={`category-photo-${type}`}
              className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-lg aspect-square text-blue-500 cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              {uploading ? (
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              ) : (
                <>
                  <Camera size={32} className="mb-2" />
                  <span className="text-xs font-bold">Adicionar Foto</span>
                </>
              )}
            </label>
        </div>

        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          className="hidden"
          id={`category-photo-${type}`} 
          ref={fileInputRef}
          onChange={(e) => handlePhotoUpload(e, type)}
        />

      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg z-50 pb-8">
          <button 
            onClick={() => setStep(STEPS.MENU)}
            className="w-full py-3 bg-white text-gray-700 border border-gray-300 rounded-xl font-medium shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <ListChecks className="mr-2" size={20} />
            Voltar ao Menu
          </button>
      </div>
      </>
    );
  };

  const renderMenu = () => {
    const photos = getCategoryPhotos();
    const beforeCount = Array.isArray(photos.before) ? photos.before.length : (photos.before ? 1 : 0);
    const afterCount = Array.isArray(photos.after) ? photos.after.length : (photos.after ? 1 : 0);
    const totalProducts = products.length;
    const completedProducts = products.filter(isProductCountComplete).length;
    const canFinish = beforeCount > 0 && afterCount > 0 && completedProducts === totalProducts;

    return (
      <div className="flex flex-col h-full bg-gray-50 p-4 space-y-4 overflow-y-auto pb-48">
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold text-gray-800">{category}</h2>
          <p className="text-xs text-gray-500">Selecione uma etapa para realizar</p>
        </div>

        <button
          onClick={() => setStep(STEPS.BEFORE_PHOTO)}
          className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${beforeCount > 0 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
              <Camera size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-900">{getLabel('before')}</h3>
              <p className="text-xs text-gray-500">{beforeCount} fotos registradas</p>
            </div>
          </div>
          {beforeCount > 0 ? <CheckCircle className="text-green-500" size={24} /> : <ChevronRight className="text-gray-400" />}
        </button>

        <button
          onClick={() => setStep(STEPS.GONDOLA_COUNT)}
          className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${completedProducts > 0 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
              <ListChecks size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-900">Contagem de Produtos</h3>
              <div className="w-32 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${(completedProducts / Math.max(1, totalProducts)) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{completedProducts} / {totalProducts} concluídos</p>
            </div>
          </div>
          {completedProducts === totalProducts ? <CheckCircle className="text-green-500" size={24} /> : <ChevronRight className="text-gray-400" />}
        </button>

        <button
          onClick={() => setStep(STEPS.AFTER_PHOTO)}
          className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${afterCount > 0 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
              <ImageIcon size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-900">{getLabel('after')}</h3>
              <p className="text-xs text-gray-500">{afterCount} fotos registradas</p>
            </div>
          </div>
          {afterCount > 0 ? <CheckCircle className="text-green-500" size={24} /> : <ChevronRight className="text-gray-400" />}
        </button>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg z-50 pb-8">
          {!canFinish && (
            <div className="mb-3 text-xs text-orange-600 bg-orange-50 p-2 rounded flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>Complete fotos e contagens para finalizar.</span>
            </div>
          )}
          <button 
            onClick={onFinish}
            disabled={!canFinish}
            className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
              !canFinish 
                ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                : 'bg-green-600 hover:bg-green-700 animate-pulse'
            }`}
          >
            <CheckCircle size={20} />
            Finalizar Categoria
          </button>
      </div>
    </div>
  );
};

  const renderPreviewModal = () => {
    if (!previewUrl) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md">
          <img
            src={resolveImageUrl(previewUrl)}
            alt="Preview"
            className="w-full max-h-[80vh] object-contain rounded-lg bg-black"
          />
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-3 right-3 bg-black bg-opacity-60 text-white rounded-full p-2"
          >
            <X size={20} />
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
          {products.map(p => {
            const required = isStockCountRequired(p);
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
            if (!required) {
               if (checked) progress = 100;
            } else {
               if (gDone) progress += 40;
               if (iDone) progress += 40;
               if (checked) progress += 20;
            }

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
                    {!required && <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">Estoque Opcional</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {checked ? <span className="text-green-600">Concluído</span> : <span className="text-orange-600">Pendente</span>}
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
            {mode === 'GONDOLA' ? 'Ir para Estoque' : 'Concluir Contagem'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-[100] flex flex-col animate-slideUp">
      <div className="bg-white border-b p-4 flex items-center justify-between shadow-sm z-20">
        <button onClick={prevStep} className="text-gray-600 p-2">
          <ArrowLeft />
        </button>
        <h1 className="font-bold text-lg">{category}</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-hidden relative">
        {step === STEPS.MENU && renderMenu()}
        {step === STEPS.BEFORE_PHOTO && renderPhotoStep('before', getLabel('before'), 'Registre o estado inicial.')}
        {step === STEPS.GONDOLA_COUNT && renderCountStep('GONDOLA', 'Contagem: Loja (Frente)')}
        {step === STEPS.INVENTORY_COUNT && renderCountStep('INVENTORY', 'Contagem: Estoque')}
        {step === STEPS.AFTER_PHOTO && renderPhotoStep('after', getLabel('after'), 'Registre o resultado final.')}
        {/* SUMMARY was replaced by MENU */}
      </div>

      {selectedProduct && (
        <ProductCountModal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
          onSave={handleProductSave}
          mode={countMode}
          readOnly={readOnly}
          requireStockCount={isStockCountRequired(selectedProduct)}
          routeItemId={routeItem?.id}
          supermarketId={routeItem?.supermarket?.id || routeItem?.supermarketId}
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
      {renderPreviewModal()}
    </div>
  );
};
