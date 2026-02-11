import React, { useState, useRef, useEffect } from 'react';
import { Camera, ChevronRight, Check, AlertTriangle, Layers, Package, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ProductCountModal } from './ProductCountModal';
import client from '../api/client';

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
  STORAGE_PHOTO: 2,
  INVENTORY_COUNT: 3,
  AFTER_PHOTO: 4,
  SUMMARY: 5
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

  const getLabel = (type: 'before' | 'storage' | 'after') => {
    const categoryConfig = photoConfig?.categories?.[category];
    const defaultLabels = photoConfig?.labels;
    
    if (categoryConfig?.labels?.[type]) return categoryConfig.labels[type];
    if (defaultLabels?.[type]) return defaultLabels[type];
    
    switch(type) {
      case 'before': return 'Foto Antes (Gôndola)';
      case 'storage': return 'Foto Estoque';
      case 'after': return 'Foto Depois (Gôndola)';
      default: return 'Foto';
    }
  };

  // Helper to get current photos for this category
  const getCategoryPhotos = () => {
    return routeItem.categoryPhotos?.[category] || {};
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'storage' | 'after') => {
    if (!e.target.files || !e.target.files[0]) return;
    
    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', `CATEGORY_${type.toUpperCase()}`);
    formData.append('category', category);

    try {
      // Upload photo
      const res = await client.post(`/routes/items/${routeItem.id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const photoUrl = res.data.url; // Assumes backend returns { url: string }

      // Update RouteItem categoryPhotos
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
      
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar foto.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProductSave = async (productId: string, data: any) => {
    await onUpdateProduct(productId, data);
    setSelectedProduct(null);
  };

  const validateStep = () => {
    const photos = getCategoryPhotos();
    
    if (step === STEPS.BEFORE_PHOTO && !photos.before) {
      toast.error(`Tire a ${getLabel('before')} para continuar.`);
      return false;
    }
    
    if (step === STEPS.STORAGE_PHOTO && !photos.storage) {
        toast.error(`Tire a ${getLabel('storage')} para continuar.`);
        return false;
    }

    if (step === STEPS.AFTER_PHOTO && !photos.after) {
        toast.error(`Tire a ${getLabel('after')} para finalizar.`);
        return false;
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

  const renderPhotoStep = (type: 'before' | 'storage' | 'after', title: string, description: string) => {
    const photos = getCategoryPhotos();
    const currentUrl = photos[type];

    return (
      <div className="flex flex-col items-center justify-center h-full p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-500">{description}</p>
        </div>

        <div 
          className="w-full aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {currentUrl ? (
            <img src={currentUrl} alt={title} className="w-full h-full object-cover" />
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
        </div>

        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          className="hidden" 
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
    // Filter products? Maybe all products in category.
    // Calculate progress
    const total = products.length;
    const counted = products.filter(p => {
        if (mode === 'GONDOLA') return p.gondolaCount !== null && p.gondolaCount !== undefined;
        if (mode === 'INVENTORY') return p.inventoryCount !== null && p.inventoryCount !== undefined;
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
              style={{ width: `${(counted / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {products.map(p => {
            const isGondolaDone = p.gondolaCount !== null && p.gondolaCount !== undefined;
            const isInventoryDone = p.inventoryCount !== null && p.inventoryCount !== undefined;
            const isRupture = !!p.ruptureReason;
            
            let progress = 0;
            if (isRupture) {
                progress = 100;
            } else {
                if (isGondolaDone) progress += 50;
                if (isInventoryDone) progress += 50;
            }

            return (
            <div 
              key={p.productId}
              onClick={() => {
                setCountMode(mode);
                setSelectedProduct(p);
              }}
              className="bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col gap-2 active:scale-[0.98] transition-transform"
            >
              <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{p.product.name}</h3>
                    <p className="text-xs text-gray-500">{p.product.ean || 'Sem EAN'}</p>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    {mode === 'GONDOLA' && (
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${p.gondolaCount !== null ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                            {p.gondolaCount ?? '-'}
                        </div>
                    )}
                    {mode === 'INVENTORY' && (
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${p.inventoryCount !== null ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                            {p.inventoryCount ?? '-'}
                        </div>
                    )}
                  </div>
              </div>

              {/* Product Progress Bar */}
              <div className="w-full flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                          className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-yellow-400'}`}
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
    // Check for any issues
    const incomplete = products.filter(p => 
        (p.gondolaCount === null || p.gondolaCount === undefined) || 
        (p.inventoryCount === null || p.inventoryCount === undefined)
    );
    
    const zeroStockNoReason = products.filter(p => 
        (p.stockCount === 0) && !p.ruptureReason && !p.isStockout
    );

    const canFinish = incomplete.length === 0 && zeroStockNoReason.length === 0;

    return (
      <div className="flex flex-col h-full p-6 space-y-6 items-center justify-center">
        <CheckCircle size={64} className="text-green-500" />
        <h2 className="text-2xl font-bold text-center">Categoria Concluída!</h2>
        <p className="text-center text-gray-500">
          Você finalizou todas as etapas para <strong>{category}</strong>.
        </p>

        {incomplete.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg text-yellow-800 text-sm w-full">
                <AlertTriangle size={16} className="inline mr-2" />
                Ainda existem {incomplete.length} produtos sem contagem completa.
            </div>
        )}

        {zeroStockNoReason.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg text-red-800 text-sm w-full">
                <AlertTriangle size={16} className="inline mr-2" />
                Existem produtos com estoque zero sem justificativa.
            </div>
        )}

        <button 
          onClick={onFinish}
          disabled={!canFinish}
          className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Finalizar Categoria
        </button>
        
        {!canFinish && (
            <button onClick={() => setStep(STEPS.GONDOLA_COUNT)} className="text-blue-600 underline">
                Revisar Produtos
            </button>
        )}
      </div>
    );
  };

  // Main Render Switch
  return (
    <div className="fixed inset-0 bg-gray-50 z-40 flex flex-col animate-slideUp">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
        <button onClick={prevStep} className="text-gray-600 p-2">
          <ArrowLeft />
        </button>
        <h1 className="font-bold text-lg">{category}</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {step === STEPS.BEFORE_PHOTO && renderPhotoStep('before', getLabel('before'), 'Registre o estado inicial.')}
        {step === STEPS.GONDOLA_COUNT && renderCountStep('GONDOLA', 'Contagem: Gôndola')}
        {step === STEPS.STORAGE_PHOTO && renderPhotoStep('storage', getLabel('storage'), 'Registre a área de armazenamento.')}
        {step === STEPS.INVENTORY_COUNT && renderCountStep('INVENTORY', 'Contagem: Estoque')}
        {step === STEPS.AFTER_PHOTO && renderPhotoStep('after', getLabel('after'), 'Registre o resultado final.')}
        {step === STEPS.SUMMARY && renderSummary()}
      </div>

      {selectedProduct && (
        <ProductCountModal 
          isOpen={true}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
          onSave={handleProductSave}
          mode={countMode}
        />
      )}
    </div>
  );
};
