import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, CheckCircle, AlertTriangle, X, Save, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import { offlineService } from '../services/offline.service';

interface Product {
  id: string;
  name: string;
  brand?: { name: string };
  ean?: string;
}

interface RouteItemProduct {
  id: string;
  productId: string;
  product: Product;
  checked: boolean;
  isStockout: boolean;
  stockoutType?: string;
  observation?: string;
  photos?: string[];
}

const ProductCheckView: React.FC = () => {
  const { routeId, itemId } = useParams<{ routeId: string; itemId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<RouteItemProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<RouteItemProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Selected product for detailed editing (stockout type, observation)
  const [selectedProduct, setSelectedProduct] = useState<RouteItemProduct | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [routeId, itemId]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredProducts(products);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredProducts(products.filter(p => 
        p.product.name.toLowerCase().includes(lower) || 
        p.product.ean?.includes(lower)
      ));
    }
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    if (!routeId || !itemId) return;
    
    setLoading(true);
    try {
      // Try to get from offline cache first to be faster/consistent
      const cachedRoute = await offlineService.getRoute(routeId);
      if (cachedRoute) {
        const item = cachedRoute.items.find((i: any) => i.id === itemId);
        if (item && item.products) {
          setProducts(item.products);
          setFilteredProducts(item.products);
          setLoading(false);
          return;
        }
      }

      // If not in cache or incomplete, fetch from API (if online)
      if (navigator.onLine) {
        const response = await api.get(`/routes/${routeId}`);
        const item = response.data.items.find((i: any) => i.id === itemId);
        if (item && item.products) {
          setProducts(item.products);
          setFilteredProducts(item.products);
          // Update cache
          offlineService.saveRoute(response.data);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (prod: RouteItemProduct, isStockout: boolean) => {
    // Optimistic update
    const updatedProduct = { 
      ...prod, 
      checked: true, 
      isStockout: isStockout,
      // Reset stockout details if not stockout
      stockoutType: isStockout ? (prod.stockoutType || 'PHYSICAL') : undefined 
    };

    updateLocalState(updatedProduct);

    // If it's a stockout, maybe open modal for more details? 
    // For now, let's just toggle. If user wants to add observation, they click the row.
    if (isStockout) {
        setSelectedProduct(updatedProduct);
    } else {
        // Auto-save if just marking as present
        await saveProductCheck(updatedProduct);
    }
  };

  const updateLocalState = (updatedProduct: RouteItemProduct) => {
    const newProducts = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    setProducts(newProducts);
  };

  const saveProductCheck = async (productData: RouteItemProduct) => {
    if (!routeId || !itemId) return;

    try {
      if (navigator.onLine) {
        await api.patch(`/routes/items/${itemId}/products/${productData.productId}/check`, {
          checked: productData.checked,
          isStockout: productData.isStockout,
          stockoutType: productData.stockoutType,
          observation: productData.observation
        });
      } else {
        // Offline: Add to pending actions
        await offlineService.addPendingAction(
          'PRODUCT_CHECK',
          `/routes/items/${itemId}/products/${productData.productId}/check`,
          'PATCH',
          {
             checked: productData.checked,
             isStockout: productData.isStockout,
             stockoutType: productData.stockoutType,
             observation: productData.observation
          }
        );
      }
      
      // Update Route in Cache to reflect changes immediately
      const cachedRoute = await offlineService.getRoute(routeId);
      if (cachedRoute) {
        const updatedItems = cachedRoute.items.map((i: any) => {
           if (i.id === itemId) {
             return {
               ...i,
               products: i.products.map((p: any) => p.id === productData.id ? productData : p)
             };
           }
           return i;
        });
        await offlineService.saveRoute({ ...cachedRoute, items: updatedItems });
      }

    } catch (error) {
      console.error('Error saving check:', error);
      // Even if API fails, we should queue it? 
      // The offline service handling above covers explicit offline. 
      // If API fails, we should probably fallback to offline queue.
      await offlineService.addPendingAction(
        'PRODUCT_CHECK',
        `/routes/items/${itemId}/products/${productData.productId}/check`,
        'PATCH',
        {
           checked: productData.checked,
           isStockout: productData.isStockout,
           stockoutType: productData.stockoutType,
           observation: productData.observation
        }
      );
    }
  };

  const handleModalSave = async () => {
    if (selectedProduct) {
      setSaving(true);
      await saveProductCheck(selectedProduct);
      updateLocalState(selectedProduct); // Ensure state is consistent
      setSaving(false);
      setSelectedProduct(null);
      toast.success('Salvo!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center p-4 gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold flex-1">Pesquisa de Produtos</h1>
          <div className="text-sm text-gray-500">
            {products.filter(p => p.checked).length}/{products.length}
          </div>
        </div>
        
        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar produto..." 
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Carregando produtos...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-10 text-gray-500">Nenhum produto encontrado.</div>
        ) : (
          filteredProducts.map(prod => (
            <div 
              key={prod.id} 
              className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${
                prod.checked 
                  ? prod.isStockout ? 'border-red-500' : 'border-green-500'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1" onClick={() => setSelectedProduct(prod)}>
                  <h3 className="font-medium text-gray-900">{prod.product.name}</h3>
                  {prod.product.brand && (
                    <p className="text-sm text-gray-500">{prod.product.brand.name}</p>
                  )}
                  {prod.observation && (
                    <p className="text-xs text-orange-600 mt-1 italic">Obs: {prod.observation}</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleStatusChange(prod, false)}
                    className={`p-2 rounded-full transition-colors ${
                      prod.checked && !prod.isStockout 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <CheckCircle size={24} />
                  </button>
                  
                  <button 
                    onClick={() => handleStatusChange(prod, true)}
                    className={`p-2 rounded-full transition-colors ${
                      prod.checked && prod.isStockout 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <AlertTriangle size={24} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stockout/Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-96 rounded-t-xl sm:rounded-xl p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Detalhes do Produto</h2>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400">
                <X size={24} />
              </button>
            </div>
            
            <div>
              <p className="font-medium text-gray-900">{selectedProduct.product.name}</p>
              <p className="text-sm text-gray-500 mb-4">{selectedProduct.isStockout ? 'Reportando Ruptura' : 'Produto em Estoque'}</p>
            </div>

            {selectedProduct.isStockout && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Tipo de Ruptura</label>
                <div className="flex gap-2">
                  <button 
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm ${selectedProduct.stockoutType === 'VIRTUAL' ? 'bg-red-50 border-red-200 text-red-700 font-medium' : 'bg-white border-gray-300'}`}
                    onClick={() => setSelectedProduct({...selectedProduct, stockoutType: 'VIRTUAL'})}
                  >
                    Virtual (Sistema)
                  </button>
                  <button 
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm ${selectedProduct.stockoutType === 'PHYSICAL' ? 'bg-red-50 border-red-200 text-red-700 font-medium' : 'bg-white border-gray-300'}`}
                    onClick={() => setSelectedProduct({...selectedProduct, stockoutType: 'PHYSICAL'})}
                  >
                    Física (Gôndola)
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Observação</label>
              <textarea 
                className="w-full border rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                rows={3}
                placeholder="Alguma observação adicional?"
                value={selectedProduct.observation || ''}
                onChange={(e) => setSelectedProduct({...selectedProduct, observation: e.target.value})}
              />
            </div>

            <button 
              onClick={handleModalSave}
              disabled={saving}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 mt-2"
            >
              {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCheckView;
