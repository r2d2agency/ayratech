import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Edit, Trash, ChevronDown, Check } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import api, { API_URL } from '../api/client';

const ProductsView: React.FC = () => {
  const { settings } = useBranding();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('Todos os Clientes');
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: '',
    categoryId: '',
    image: '',
    brandId: '',
    clientId: '',
    barcode: '',
    subcategory: '',
    status: 'active'
  });

  const [selectedParentId, setSelectedParentId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');

  // Client Search State
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, clientsRes, brandsRes, categoriesRes] = await Promise.all([
        api.get('/products'),
        api.get('/clients'),
        api.get('/brands'),
        api.get('/categories')
      ]);

      const mappedClients = clientsRes.data.map((c: any) => ({
        id: c.id,
        nome: c.nomeFantasia || c.razaoSocial,
        logo: c.logo
          ? (c.logo.startsWith('http') ? c.logo : `${API_URL}${c.logo}`)
          : 'https://via.placeholder.com/150'
      }));
      setClients(mappedClients);
      setBrands(brandsRes.data);
      setCategories(categoriesRes.data);

      const mappedProducts = productsRes.data.map((p: any) => {
        const imgUrl = p.image 
          ? (p.image.startsWith('http') ? p.image : `${API_URL}${p.image}`)
          : 'https://via.placeholder.com/150';
        
        // Debug image URL issues
        if (p.image && !p.image.startsWith('http')) {
           // console.log(`Product ${p.name} raw image: ${p.image}, mapped: ${imgUrl}`);
        }

        return {
        id: p.id,
        nome: p.name,
        sku: p.sku,
        categoria: p.category,
        categoryId: p.categoryRef?.id,
        imagem: imgUrl,
        brandId: p.brand?.id,
        clientId: p.client?.id,
        barcode: p.barcode,
        subcategory: p.subcategory,
        status: p.status,
        categoryRef: p.categoryRef
      }});
      setProducts(mappedProducts);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productForm.clientId) {
      alert('Por favor, selecione um Fabricante/Cliente.');
      return;
    }

    try {
      const formData = new FormData();
      
      // Append fields
      Object.keys(productForm).forEach(key => {
        const value = productForm[key as keyof typeof productForm];
        
        // Skip empty optional fields
        if ((key === 'brandId' || key === 'clientId' || key === 'categoryId') && !value) return;
        
        // Skip image string if we are uploading a file (controller will handle it)
        // Or if it's just the placeholder/empty
        if (key === 'image') return; 

        if (value !== undefined && value !== null) {
          formData.append(key, value as string);
        }
      });

      // Handle Category Logic
      const finalCategoryId = selectedSubId || selectedParentId;
      if (finalCategoryId) {
        formData.set('categoryId', finalCategoryId);
        
        // Update legacy strings
        const selectedCat = categories.find(c => c.id === finalCategoryId);
        if (selectedCat) {
          if (selectedCat.parent) {
            // It's a subcategory
            formData.set('category', selectedCat.parent.name);
            formData.set('subcategory', selectedCat.name);
          } else {
            // It's a parent category
            formData.set('category', selectedCat.name);
            formData.set('subcategory', '');
          }
        }
      }

      // Append file if exists
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (productForm.image && productForm.image !== 'https://via.placeholder.com/150') {
         // If no new file, but we have an existing image URL, we might want to keep it.
         // Strip API_URL if present to save relative path
         let imageUrl = productForm.image;
         if (imageUrl.startsWith(API_URL)) {
            imageUrl = imageUrl.replace(API_URL, '');
         } else if (imageUrl.startsWith('http')) {
            // Try to extract relative path if it matches expected pattern
            try {
              const urlObj = new URL(imageUrl);
              imageUrl = urlObj.pathname; // This will keep /uploads/...
            } catch (e) {
              // If invalid URL, keep as is
            }
         }
         formData.append('image', imageUrl);
      }
      
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, formData);
        alert('Produto atualizado com sucesso!');
      } else {
        await api.post('/products', formData);
        alert('Produto criado com sucesso!');
      }
      
      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error saving product:", error);
      console.error("Error details:", error.response?.data);
      
      let msg = 'Erro desconhecido.';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
            msg = error.response.data;
        } else if (error.response.data.message) {
            msg = Array.isArray(error.response.data.message) 
            ? error.response.data.message.join('\n') 
            : JSON.stringify(error.response.data.message);
        } else {
            msg = JSON.stringify(error.response.data);
        }
      } else if (error.message) {
        msg = error.message;
      }
      
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
    
    // Determine IDs from product.categoryRef
    let pId = '';
    let sId = '';
    
    if (product.categoryRef) {
      if (product.categoryRef.parent) {
        pId = product.categoryRef.parent.id;
        sId = product.categoryRef.id;
      } else {
        pId = product.categoryRef.id;
        sId = '';
      }
    } else if (product.categoryId) {
       // Fallback: try to find category by ID in our list
       const cat = categories.find(c => c.id === product.categoryId);
       if (cat) {
         if (cat.parent) {
            pId = cat.parent.id;
            sId = cat.id;
         } else {
            pId = cat.id;
            sId = '';
         }
       }
    }

    setSelectedParentId(pId);
    setSelectedSubId(sId);

    setProductForm({
      name: product.nome,
      sku: product.sku,
      category: product.categoria,
      categoryId: product.categoryId || product.categoryRef?.id || '',
      image: product.imagem === 'https://via.placeholder.com/150' ? '' : product.imagem,
      brandId: product.brandId || '',
      clientId: product.clientId || '',
      barcode: product.barcode || '',
      subcategory: product.subcategory || '',
      status: product.status || 'active'
    });
    
    // Set initial client search value
    const client = clients.find(c => c.id === (product.clientId || ''));
    setClientSearch(client ? client.nome : '');

    setImagePreview(product.imagem === 'https://via.placeholder.com/150' ? '' : product.imagem);
    setImageFile(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setProductForm({
      name: '',
      sku: '',
      category: '',
      categoryId: '',
      image: '',
      brandId: '',
      clientId: '',
      barcode: '',
      subcategory: '',
      status: 'active'
    });
    setSelectedParentId('');
    setSelectedSubId('');
    setClientSearch('');
    setImagePreview('');
    setImageFile(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.includes(searchTerm) || 
                          p.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    
    const clientName = clients.find(c => c.id === p.clientId)?.nome || '';
    const matchesClient = selectedClient === 'Todos os Clientes' || clientName === selectedClient;

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
            <option>Todos os Clientes</option>
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
            
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <select
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                    value={selectedParentId}
                    onChange={e => {
                      setSelectedParentId(e.target.value);
                      setSelectedSubId('');
                    }}
                  >
                    <option value="">Selecione...</option>
                    {categories.filter(c => !c.parent).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subcategoria</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                    value={selectedSubId}
                    onChange={e => setSelectedSubId(e.target.value)}
                    disabled={!selectedParentId}
                  >
                    <option value="">Selecione...</option>
                    {selectedParentId && categories.filter(c => c.parent?.id === selectedParentId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Marca</label>
                  <select
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                    value={productForm.brandId}
                    onChange={e => {
                      const selectedBrandId = e.target.value;
                      const brand = brands.find(b => b.id === selectedBrandId);
                      const newClientId = brand?.client?.id || productForm.clientId;
                      
                      setProductForm(prev => ({
                        ...prev, 
                        brandId: selectedBrandId,
                        // Auto-select client if brand has one
                        clientId: newClientId
                      }));
                      
                      // Update search text if client changed
                      if (brand?.client) {
                        setClientSearch(brand.client.nome || brand.client.fantasyName || '');
                      }
                    }}
                  >
                    <option value="">Selecione...</option>
                    {brands
                      .filter(b => !productForm.clientId || !b.client || b.client.id === productForm.clientId)
                      .map(brand => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fabricante/Cliente</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Buscar Cliente..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                      value={clientSearch}
                      onChange={e => {
                         setClientSearch(e.target.value);
                         if (!showClientDropdown) setShowClientDropdown(true);
                         if (productForm.clientId) {
                             const currentClient = clients.find(c => c.id === productForm.clientId);
                             if (currentClient && currentClient.nome !== e.target.value) {
                                 setProductForm(prev => ({ ...prev, clientId: '' }));
                             }
                         }
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      onBlur={() => setShowClientDropdown(false)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                  
                  {showClientDropdown && (
                    <div 
                        className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        {clients
                           .filter(c => c.nome.toLowerCase().includes(clientSearch.toLowerCase()))
                           .slice(0, 50)
                           .map(c => (
                             <div 
                               key={c.id}
                               className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                               onClick={() => {
                                 setProductForm(prev => ({ ...prev, clientId: c.id }));
                                 setClientSearch(c.nome);
                                 setShowClientDropdown(false);
                               }}
                             >
                               <span className="font-medium text-slate-700">{c.nome}</span>
                               {productForm.clientId === c.id && <Check size={16} className="text-blue-500" />}
                             </div>
                           ))
                        }
                        {clients.filter(c => c.nome.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">Nenhum cliente encontrado</div>
                        )}
                    </div>
                  )}
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
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Imagem do Produto</label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 group hover:border-blue-400 transition-all cursor-pointer">
                      {imagePreview ? (
                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <div className="text-center p-2">
                          <span className="text-xs text-slate-400 font-medium">Upload</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file) {
                            setImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-600 mb-1">Clique para selecionar uma imagem</p>
                      <p className="text-xs text-slate-400">Formatos aceitos: JPG, PNG, WEBP. A imagem será otimizada automaticamente.</p>
                      {imagePreview && (
                        <button 
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview('');
                            setProductForm({...productForm, image: ''});
                          }}
                          className="mt-2 text-xs font-bold text-red-500 hover:text-red-600"
                        >
                          Remover Imagem
                        </button>
                      )}
                    </div>
                  </div>
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
