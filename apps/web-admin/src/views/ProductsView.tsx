import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Edit, Trash } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import api from '../api/client';

const ProductsView: React.FC = () => {
  const { settings } = useBranding();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('Todas as Marcas');
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: '',
    image: '',
    brandId: '',
    barcode: '',
    subcategory: '',
    status: 'active'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, clientsRes, brandsRes] = await Promise.all([
        api.get('/products'),
        api.get('/clients'),
        api.get('/brands')
      ]);

      const mappedClients = clientsRes.data.map((c: any) => ({
        id: c.id,
        nome: c.name,
        logo: c.logo
      }));
      setClients(mappedClients);
      setBrands(brandsRes.data);

      const mappedProducts = productsRes.data.map((p: any) => ({
        id: p.id,
        nome: p.name,
        sku: p.sku,
        categoria: p.category,
        imagem: p.image || 'https://via.placeholder.com/150',
        brandId: p.brand?.id,
        clientId: p.brand?.client?.id,
        barcode: p.barcode,
        subcategory: p.subcategory,
        status: p.status
      }));
      setProducts(mappedProducts);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...productForm };
      
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, payload);
        alert('Produto atualizado com sucesso!');
      } else {
        await api.post('/products', payload);
        alert('Produto criado com sucesso!');
      }
      
      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error saving product:", error);
      const msg = error.response?.data?.message 
        ? (Array.isArray(error.response.data.message) ? error.response.data.message.join('\n') : error.response.data.message)
        : error.message;
      alert(`Erro ao salvar produto:\n${msg}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchData();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert('Erro ao excluir produto.');
    }
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.nome,
      sku: product.sku,
      category: product.categoria,
      image: product.imagem === 'https://via.placeholder.com/150' ? '' : product.imagem,
      brandId: product.brandId || '',
      clientId: product.clientId || '',
      barcode: product.barcode || '',
      subcategory: product.subcategory || '',
      status: product.status || 'active'
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setProductForm({
      name: '',
      sku: '',
      category: '',
      image: '',
      brandId: '',
      clientId: '',
      barcode: '',
      subcategory: '',
      status: 'active'
    });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.includes(searchTerm) || 
                          p.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    
    const clientName = clients.find(c => c.id === p.clientId)?.nome || '';
    const matchesClient = selectedClient === 'Todas as Marcas' || clientName === selectedClient;

    return matchesSearch && matchesClient;
  });

  if (loading) return <div className="p-8">Carregando produtos...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Catálogo de SKUs</h1>
          <p className="text-slate-500 font-medium text-lg">Controle central de mix de produtos.</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-blue-200 hover:scale-105 transition-all"
          style={{ backgroundColor: settings.primaryColor }}
        >
          <Plus size={20} />
          Adicionar Produto
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Filtrar por nome, SKU ou categoria..." 
              className="w-full pl-12 h-12 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="h-12 px-6 rounded-xl border border-slate-200 outline-none text-sm font-black text-slate-700 bg-white"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            <option>Todas as Marcas</option>
            {clients.map(c => <option key={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-8">
          {filteredProducts.map(p => (
            <div key={p.id} className="group border border-slate-100 rounded-2xl p-5 hover:shadow-xl transition-all bg-white relative">
               <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button 
                  onClick={() => openEditModal(p)}
                  className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 text-blue-600"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteProduct(p.id)}
                  className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 text-red-600"
                >
                  <Trash size={16} />
                </button>
              </div>
              
              <div className="relative aspect-square overflow-hidden rounded-xl mb-5">
                <img src={p.imagem} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" alt={p.nome} />
                <div className="absolute top-2 left-2 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[9px] font-black text-slate-700 border border-slate-100 shadow-sm">
                  {p.sku}
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: settings.primaryColor }}>{p.categoria}</p>
              <h4 className="text-lg font-black text-slate-900 truncate mb-1">{p.nome}</h4>
              <div className="flex items-center gap-2 mt-4">
                <div className="h-6 w-6 rounded-lg border border-slate-100 flex items-center justify-center p-1">
                  <img src={clients.find(c => c.id === p.clientId)?.logo} className="object-contain" alt="" />
                </div>
                <span className="text-[11px] font-black text-slate-500">{clients.find(c => c.id === p.clientId)?.nome}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium"
                    value={productForm.name}
                    onChange={e => setProductForm({...productForm, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">SKU</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium"
                    value={productForm.sku}
                    onChange={e => setProductForm({...productForm, sku: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Código de Barras</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium"
                    value={productForm.barcode}
                    onChange={e => setProductForm({...productForm, barcode: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categoria</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium"
                    value={productForm.category}
                    onChange={e => setProductForm({...productForm, category: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subcategoria</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium"
                    value={productForm.subcategory}
                    onChange={e => setProductForm({...productForm, subcategory: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Marca</label>
                  <select
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                    value={productForm.brandId}
                    onChange={e => setProductForm({...productForm, brandId: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                    value={productForm.status}
                    onChange={e => setProductForm({...productForm, status: e.target.value})}
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">URL da Imagem</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium"
                    value={productForm.image}
                    onChange={e => setProductForm({...productForm, image: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-100 gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:scale-105 transition-all"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsView;
