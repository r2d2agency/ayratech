import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle, Circle, MoreVertical, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ProductCountModal } from './ProductCountModal';
import { BreakageReportModal } from './BreakageReportModal';
import { offlineService } from '../services/offline.service';
import client from '../api/client';
import { processImage } from '../utils/image-processor';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { resolveImageUrl } from '../utils/image';

type CategoryFlowMode = 'FULL' | 'ITEMS' | 'PHOTOS';

interface CategoryTaskFlowProps {
  routeItem: any;
  category?: string;
  categoryKey?: string;
  categoryLabel?: string;
  brandLabel?: string;
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
  BEFORE_PHOTO: 0,
  PRODUCTS: 1,
  AFTER_PHOTO: 2
};

export const CategoryTaskFlow: React.FC<CategoryTaskFlowProps> = ({
  routeItem,
  category,
  categoryKey,
  categoryLabel,
  brandLabel,
  products,
  photoConfig,
  onUpdateItem,
  onUpdateProduct,
  onFinish,
  onBack,
  mode = 'FULL',
  readOnly = false
}) => {
  const [step, setStep] = useState(mode === 'ITEMS' ? STEPS.PRODUCTS : STEPS.BEFORE_PHOTO);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { branding } = useBranding();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const initializedRef = useRef<string | null>(null);
  const [actionProduct, setActionProduct] = useState<any>(null);
  const [breakageProduct, setBreakageProduct] = useState<any>(null);
  const [ruptureProduct, setRuptureProduct] = useState<any>(null);
  const [ruptureReasons, setRuptureReasons] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedRuptureReasonId, setSelectedRuptureReasonId] = useState<string>('');
  const [ruptureDetails, setRuptureDetails] = useState<string>('');
  const [ruptureLoading, setRuptureLoading] = useState(false);

  useEffect(() => {
    const key = `${categoryKey || ''}-${categoryLabel || category || ''}-${mode}`;
    if (initializedRef.current === key) return;
    initializedRef.current = key;

    if (mode === 'ITEMS') {
      setStep(STEPS.PRODUCTS);
      return;
    }

    setStep(STEPS.BEFORE_PHOTO);
  }, [category, categoryKey, categoryLabel, mode]);

  useEffect(() => {
    if (!ruptureProduct || readOnly) return;

    let cancelled = false;
    setRuptureLoading(true);

    (async () => {
      try {
        const res = await client.get('/incident-reasons', { params: { type: 'RUPTURE' } });
        const list = Array.isArray(res.data) ? res.data : [];
        const normalized = list
          .filter((r: any) => r && r.id && r.label)
          .map((r: any) => ({ id: String(r.id), label: String(r.label) }));

        if (cancelled) return;
        setRuptureReasons(normalized);

        const existing = String(ruptureProduct?.ruptureReason || '').trim();
        if (!existing) return;

        const match = normalized.find(r => existing === r.label || existing.startsWith(`${r.label} - `));
        if (match) {
          setSelectedRuptureReasonId(match.id);
          if (existing !== match.label) {
            setRuptureDetails(existing.slice(`${match.label} - `.length));
          } else {
            setRuptureDetails('');
          }
        } else {
          setSelectedRuptureReasonId('__OTHER__');
          setRuptureDetails(existing);
        }
      } catch {
        if (cancelled) return;
        setRuptureReasons([]);
      } finally {
        if (!cancelled) setRuptureLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ruptureProduct, readOnly]);

  const categoryTitle = (() => {
    const label = categoryLabel || category || 'Categoria';
    if (brandLabel) return `${brandLabel} • ${label}`;
    return label;
  })();

  const photosKey = categoryKey || categoryLabel || category || 'Categoria';

  const getLabel = (type: 'before' | 'after') => {
    const categoryConfig = photoConfig?.categories?.[categoryLabel || category || ''];
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
    return routeItem.categoryPhotos?.[photosKey] || {};
  };

  const isStockCountRequired = (p: any) => {
    const hasStockInChecklists =
      Array.isArray(p.checklists) &&
      p.checklists.some((c: any) => c?.type === 'STOCK_COUNT');

    return hasStockInChecklists;
  };

  const isValidityChecklistItem = (item: any) => {
    const desc = (item?.description || '').toLowerCase();
    if (item?.type === 'VALIDITY_CHECK') return true;
    if (desc.includes('vencimento') || desc.includes('venci') || desc.includes('validade')) return true;
    return false;
  };

  const hasInteractiveChecklist = (p: any) => {
    const cl = Array.isArray(p?.checklists) ? p.checklists : [];
    return cl.some((c: any) => {
      if (!c?.type) return false;
      if (c.type === 'STOCK_COUNT') return false;
      if (isValidityChecklistItem(c)) return true;
      return c.type === 'PRICE_CHECK' || c.type === 'PHOTO';
    });
  };

  const shouldOpenProduct = (p: any) => isStockCountRequired(p) || hasInteractiveChecklist(p);

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

  const getBeforeCount = () => {
    const photos = getCategoryPhotos();
    return Array.isArray(photos.before) ? photos.before.length : (photos.before ? 1 : 0);
  };

  const getAfterCount = () => {
    const photos = getCategoryPhotos();
    return Array.isArray(photos.after) ? photos.after.length : (photos.after ? 1 : 0);
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
            formData.append('category', photosKey);
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
          [photosKey]: {
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
            [photosKey]: {
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
              category: photosKey
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
      [photosKey]: {
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

  const prevStep = () => {
    if (mode === 'ITEMS') {
      onBack();
      return;
    }

    if (step === STEPS.BEFORE_PHOTO) {
      onBack();
      return;
    }

    if (step === STEPS.PRODUCTS) {
      setStep(STEPS.BEFORE_PHOTO);
      return;
    }

    setStep(STEPS.PRODUCTS);
  };

  const finalizeCategory = () => {
    const beforeOk = getBeforeCount() >= 3;
    const productsOk = mode === 'FULL' ? areAllProductsComplete() : true;
    const afterOk = getAfterCount() > 0;

    if (!beforeOk) {
      toast.error('Faça 3 fotos de antes para finalizar.');
      setStep(STEPS.BEFORE_PHOTO);
      return;
    }
    if (mode === 'FULL' && !productsOk) {
      toast.error('Conclua os produtos para finalizar.');
      setStep(STEPS.PRODUCTS);
      return;
    }
    if (!afterOk) {
      toast.error('Registre a Foto Depois para finalizar.');
      setStep(STEPS.AFTER_PHOTO);
      return;
    }

    onFinish();
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
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(STEPS.PRODUCTS)}
            className="flex-1 py-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 transition-all hover:bg-gray-50 active:scale-[0.99]"
          >
            Produtos
          </button>
          <button
            type="button"
            onClick={() => (type === 'after' ? finalizeCategory() : setStep(STEPS.PRODUCTS))}
            className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all hover:bg-blue-700 active:scale-[0.99]"
          >
            {type === 'after' ? 'Finalizar Categoria' : 'Continuar'}
          </button>
        </div>
      </div>
      </>
    );
  };

  const renderProductsStep = () => {
    const total = products.length;
    const completed = products.filter(isProductCountComplete).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const productsOk = mode === 'FULL' ? total > 0 && completed === total : true;

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 bg-white shadow-sm z-10">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Produtos</h2>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{categoryTitle}</span>
            <span>{completed} / {total} concluídos</span>
          </div>
          <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
          {products.map(p => {
            const required = isStockCountRequired(p);
            const checked = !!p.checked;
            const rowCompleted = isProductCountComplete(p);
            const openModal = shouldOpenProduct(p);

            return (
              <div
                key={p.productId}
                onClick={async () => {
                  if (readOnly) return;
                  if (openModal) {
                    setSelectedProduct(p);
                    return;
                  }
                  try {
                    await onUpdateProduct(p.productId, { checked: !checked });
                  } catch (e) {
                    console.error(e);
                    toast.error('Erro ao atualizar o produto.');
                  }
                }}
                className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-start gap-3 active:scale-[0.98] transition-transform"
              >
                <div className="pt-0.5">
                  {rowCompleted ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : (
                    <Circle size={20} className="text-gray-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{p.product.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{p.product.ean || 'Sem EAN'}</p>
                      {!required && !hasInteractiveChecklist(p) && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">Somente OK</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionProduct(p);
                      }}
                      className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      disabled={readOnly}
                      title="Ações"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={rowCompleted ? 'text-green-700 font-medium' : 'text-orange-600 font-medium'}>
                      {rowCompleted ? 'Concluído' : openModal ? 'Toque para abrir' : 'Toque para marcar OK'}
                    </span>
                    {!readOnly && !openModal && (
                      <span className="text-gray-400">{checked ? 'OK' : 'Pendente'}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-white border-t">
          {!productsOk && mode === 'FULL' && (
            <div className="mb-3 text-xs text-orange-600 bg-orange-50 p-2 rounded flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>Conclua os produtos para liberar a Foto Depois.</span>
            </div>
          )}
          <div className="flex gap-3">
            {mode !== 'ITEMS' && (
              <button
                type="button"
                onClick={() => setStep(STEPS.BEFORE_PHOTO)}
                className="flex-1 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg font-bold hover:bg-gray-50"
              >
                Fotos
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (mode === 'ITEMS') {
                  onBack();
                  return;
                }
                setStep(STEPS.AFTER_PHOTO);
              }}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
            >
              {mode === 'ITEMS' ? 'Concluir' : 'Foto Depois'}
            </button>
          </div>
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

  return (
    <div className="fixed inset-0 bg-gray-50 z-[100] flex flex-col animate-slideUp">
      <div className="bg-white border-b p-4 shadow-sm z-20">
        <div className="flex items-center justify-between">
          <button onClick={prevStep} className="text-gray-600 p-2">
            <ArrowLeft />
          </button>
          <h1 className="font-bold text-lg">{categoryTitle}</h1>
          <div className="w-10" />
        </div>

        {mode !== 'ITEMS' && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStep(STEPS.BEFORE_PHOTO)}
              className={`py-2 rounded-lg text-xs font-bold border ${
                step === STEPS.BEFORE_PHOTO
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Foto Antes
            </button>
            <button
              type="button"
              onClick={() => setStep(STEPS.PRODUCTS)}
              className={`py-2 rounded-lg text-xs font-bold border ${
                step === STEPS.PRODUCTS
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Produtos
            </button>
            <button
              type="button"
              onClick={() => setStep(STEPS.AFTER_PHOTO)}
              className={`py-2 rounded-lg text-xs font-bold border ${
                step === STEPS.AFTER_PHOTO
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Foto Depois
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {step === STEPS.BEFORE_PHOTO && renderPhotoStep('before', getLabel('before'), 'Registre o estado inicial.')}
        {step === STEPS.AFTER_PHOTO && renderPhotoStep('after', getLabel('after'), 'Registre o resultado final.')}
        {step === STEPS.PRODUCTS && renderProductsStep()}
      </div>

      {selectedProduct && (
        <ProductCountModal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
          onSave={handleProductSave}
          mode="BOTH"
          readOnly={readOnly}
          requireStockCount={isStockCountRequired(selectedProduct)}
          routeItemId={routeItem?.id}
          supermarketId={routeItem?.supermarket?.id || routeItem?.supermarketId}
        />
      )}

      {actionProduct && (
        <div
          className="fixed inset-0 z-[70] bg-black bg-opacity-40 flex items-end justify-center p-4"
          onClick={() => setActionProduct(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-900 truncate">Ações</div>
                <div className="text-xs text-gray-500 truncate">{actionProduct.product?.name}</div>
              </div>
              <button onClick={() => setActionProduct(null)} className="text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-2">
              <button
                type="button"
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-left"
                onClick={() => {
                  setBreakageProduct(actionProduct);
                  setActionProduct(null);
                }}
                disabled={readOnly}
              >
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900">Avaria</div>
                  <div className="text-xs text-gray-500">Registrar quantidade e descrição</div>
                </div>
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50 text-left"
                onClick={() => {
                  setSelectedRuptureReasonId('');
                  setRuptureDetails('');
                  setRuptureProduct(actionProduct);
                  setActionProduct(null);
                }}
                disabled={readOnly}
              >
                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900">Ruptura</div>
                  <div className="text-xs text-gray-500">Registrar motivo</div>
                </div>
              </button>
              <button
                type="button"
                className="w-full p-3 rounded-xl text-gray-600 font-medium hover:bg-gray-50"
                onClick={() => setActionProduct(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {breakageProduct && (
        <BreakageReportModal
          isOpen={!!breakageProduct}
          onClose={() => setBreakageProduct(null)}
          product={{
            ...breakageProduct,
            supermarketName: routeItem?.supermarket?.fantasyName || routeItem?.supermarket?.name || 'Supermercado'
          }}
          routeItemId={routeItem?.id}
          supermarketId={routeItem?.supermarket?.id || routeItem?.supermarketId}
        />
      )}

      {ruptureProduct && (
        <div className="fixed inset-0 z-[75] bg-black bg-opacity-50 p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-black text-gray-900 truncate">Ruptura</div>
                <div className="text-xs text-gray-500 truncate">{ruptureProduct.product?.name}</div>
              </div>
              <button
                type="button"
                onClick={() => setRuptureProduct(null)}
                className="text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-gray-700">Motivo</div>
                <select
                  value={selectedRuptureReasonId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedRuptureReasonId(next);
                    if (next !== '__OTHER__') setRuptureDetails('');
                  }}
                  disabled={readOnly || ruptureLoading}
                  className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100"
                >
                  <option value="">Selecionar motivo...</option>
                  {ruptureReasons.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                  <option value="__OTHER__">Outro (descrever)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-gray-700">Descrição</div>
                <textarea
                  value={ruptureDetails}
                  onChange={(e) => setRuptureDetails(e.target.value)}
                  rows={3}
                  disabled={readOnly}
                  placeholder={
                    selectedRuptureReasonId && selectedRuptureReasonId !== '__OTHER__'
                      ? 'Complemento (opcional)...'
                      : 'Descreva o motivo...'
                  }
                  className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-white flex gap-3">
              <button
                type="button"
                onClick={() => setRuptureProduct(null)}
                className="flex-1 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg font-bold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const composed = (() => {
                    if (!selectedRuptureReasonId) {
                      const freeText = ruptureDetails.trim();
                      return freeText.length > 0 ? freeText : null;
                    }

                    if (selectedRuptureReasonId === '__OTHER__') {
                      const freeText = ruptureDetails.trim();
                      return freeText.length > 0 ? freeText : null;
                    }

                    const selected = ruptureReasons.find(r => r.id === selectedRuptureReasonId);
                    if (!selected?.label) return null;
                    const details = ruptureDetails.trim();
                    return details.length > 0 ? `${selected.label} - ${details}` : selected.label;
                  })();

                  if (!composed) {
                    toast.error('Informe o motivo da ruptura.');
                    return;
                  }

                  try {
                    await onUpdateProduct(ruptureProduct.productId, {
                      isStockout: true,
                      ruptureReason: composed,
                      checked: true
                    });
                    toast.success('Ruptura registrada!');
                    setRuptureProduct(null);
                  } catch (e) {
                    console.error(e);
                    toast.error('Erro ao salvar a ruptura.');
                  }
                }}
                disabled={readOnly}
                className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
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
