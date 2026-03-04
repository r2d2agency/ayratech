import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, X, Filter, CheckSquare, Square, Save } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import { ViewType, SupermarketGroup } from '../types';
import api from '../api/client';
import { SearchableSelect } from '../components/SearchableSelect';

interface SupermarketGroupsListViewProps {
  onNavigate: (view: ViewType) => void;
}

const SupermarketGroupsListView: React.FC<SupermarketGroupsListViewProps> = ({ onNavigate }) => {
  const { settings } = useBranding();
  const [groups, setGroups] = useState<SupermarketGroup[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'mix'>('details');
  const [editingGroup, setEditingGroup] = useState<SupermarketGroup | null>(null);
  
  // Mix Filter State
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    status: true,
    productIds: [] as string[]
  });

  const fetchGroups = async () => {
    try {
      const response = await api.get('/supermarket-groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [productsRes, brandsRes] = await Promise.all([
        api.get('/products'),
        api.get('/brands')
      ]);
      setProducts(productsRes.data);
      setBrands(brandsRes.data);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchGroups(), fetchDependencies()]);
      setLoading(false);
    };
    init();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', status: true, productIds: [] });
    setEditingGroup(null);
    setActiveTab('details');
    setSelectedBrandId('');
  };

  const handleAddNew = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (group: any) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      status: group.status !== undefined ? group.status : true,
      productIds: group.products ? group.products.map((p: any) => p.id) : []
    });
    setShowModal(true);
  };

  const toggleProduct = (productId: string) => {
    setFormData(prev => {
      const exists = prev.productIds.includes(productId);
      if (exists) {
        return { ...prev, productIds: prev.productIds.filter(id => id !== productId) };
      } else {
        return { ...prev, productIds: [...prev.productIds, productId] };
      }
    });
  };

  const toggleAllVisibleProducts = () => {
    const visibleProducts = filteredProducts.map(p => p.id);
    const allSelected = visibleProducts.every(id => formData.productIds.includes(id));
    
    setFormData(prev => {
      if (allSelected) {
        // Deselect all visible
        return { ...prev, productIds: prev.productIds.filter(id => !visibleProducts.includes(id)) };
      } else {
        // Select all visible (add missing)
        const newIds = [...prev.productIds];
        visibleProducts.forEach(id => {
          if (!newIds.includes(id)) newIds.push(id);
        });
        return { ...prev, productIds: newIds };
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este grupo?')) {
      try {
        await api.delete(`/supermarket-groups/${id}`);
        fetchGroups();
      } catch (error) {
        console.error('Error deleting group:', error);
        alert('Erro ao excluir grupo.');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Por favor, preencha o Nome da Rede.');
      return;
    }

    try {
      if (editingGroup) {
        await api.patch(`/supermarket-groups/${editingGroup.id}`, formData);
        alert('Rede atualizada com sucesso!');
      } else {
        await api.post('/supermarket-groups', formData);
        alert('Rede criada com sucesso!');
      }
      setShowModal(false);
      resetForm();
      fetchGroups();
    } catch (error: any) {
      console.error('Error saving group:', error);
      const msg = error.response?.data?.message 
        ? (Array.isArray(error.response.data.message) ? error.response.data.message.join('\n') : error.response.data.message)
        : error.message;
      alert(`Erro ao salvar rede:\n${msg}`);
    }
  };

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(p => {
    if (selectedBrandId && p.brand?.id !== selectedBrandId) return false;
    return true;
  });

  const isAllVisibleSelected = filteredProducts.length > 0 && filteredProducts.every(p => formData.productIds.includes(p.id));

  return (
    <div className="animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Redes / Grupos</h1>
          <p className="text-slate-500 font-bold mt-1">Gerencie as redes de supermercados.</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold shadow-lg shadow-blue-200 hover:scale-105 transition-all"
          style={{ backgroundColor: settings.primaryColor }}
        >
          <Plus size={20} />
          Nova Rede
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar rede..."
              className="w-full h-12 pl-12 pr-4 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-100 transition-all font-bold text-slate-700 placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
           <div className="p-10 text-center text-slate-500">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Nome</th>
                  <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4 font-bold text-slate-700">{group.name}</td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${group.status ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {group.status ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(group)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                            onClick={() => handleDelete(group.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 h-[80vh] flex flex-col relative">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center rounded-t-[2rem] shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {editingGroup ? 'Editar Rede' : 'Nova Rede'}
                </h2>
                <p className="text-slate-500 font-medium">Preencha os dados da rede</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Tabs */}
              <div className="px-8 border-b border-slate-100 flex gap-6 shrink-0 bg-white z-10">
                 <button
                   type="button"
                   onClick={() => setActiveTab('details')}
                   className={`py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${
                     activeTab === 'details' 
                       ? 'text-blue-600 border-blue-600' 
                       : 'text-slate-400 border-transparent hover:text-slate-600'
                   }`}
                 >
                   Dados Gerais
                 </button>
                 <button
                   type="button"
                   onClick={() => setActiveTab('mix')}
                   className={`py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${
                     activeTab === 'mix' 
                       ? 'text-blue-600 border-blue-600' 
                       : 'text-slate-400 border-transparent hover:text-slate-600'
                   }`}
                 >
                   Mix de Produtos
                 </button>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
                {activeTab === 'details' ? (
                  <div className="overflow-y-auto p-8 space-y-8 h-full">
                    <div>
                       <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Nome da Rede *</label>
                       <input 
                           type="text" 
                           value={formData.name}
                           onChange={(e) => setFormData({...formData, name: e.target.value})}
                           className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" 
                           placeholder="Ex: Grupo Pão de Açúcar"
                           required
                       />
                    </div>

                    <div>
                       <SearchableSelect
                         label="Status"
                         value={formData.status ? 'true' : 'false'}
                         onChange={(val) => setFormData({...formData, status: val === 'true'})}
                         options={[
                           { value: 'true', label: 'Ativo' },
                           { value: 'false', label: 'Inativo' }
                         ]}
                       />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full p-8 space-y-6">
                    <div className="flex items-end gap-4 shrink-0">
                      <div className="flex-1">
                        <SearchableSelect
                          label="Filtrar por Marca"
                          value={selectedBrandId}
                          onChange={setSelectedBrandId}
                          options={[
                            { value: '', label: 'Todas as Marcas' },
                            ...brands.map(b => ({ value: b.id, label: b.name }))
                          ]}
                          placeholder="Selecione uma marca..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={toggleAllVisibleProducts}
                        className="h-14 px-6 rounded-2xl border-2 border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-600 font-bold flex items-center gap-2 transition-all shrink-0"
                      >
                        {isAllVisibleSelected ? (
                          <>
                            <CheckSquare className="text-blue-600" size={20} />
                            Desmarcar ({filteredProducts.length})
                          </>
                        ) : (
                          <>
                            <Square className="text-slate-400" size={20} />
                            Marcar ({filteredProducts.length})
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-2xl relative">
                      {filteredProducts.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 font-medium">
                          Nenhum produto encontrado com os filtros atuais.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {filteredProducts.map(product => {
                            const isSelected = formData.productIds.includes(product.id);
                            return (
                              <div 
                                key={product.id}
                                onClick={() => toggleProduct(product.id)}
                                className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${
                                  isSelected ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                                  isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <CheckSquare size={16} className="text-white" />}
                                </div>
                                
                                {product.image ? (
                                  <img src={product.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">IMG</div>
                                )}
                                
                                <div>
                                  <div className="font-bold text-slate-800 text-sm">{product.name}</div>
                                  <div className="text-xs font-medium text-slate-500">
                                    {product.brand?.name || 'Sem Marca'} • {product.sku || 'S/ SKU'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-400 font-bold text-right shrink-0">
                      {formData.productIds.length} produtos selecionados no total
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 pt-6 border-t border-slate-100 flex justify-end gap-4 bg-white rounded-b-[2rem] shrink-0 z-10">
                 <button 
                   type="button"
                   onClick={() => setShowModal(false)} 
                   className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="submit"
                   className="px-8 py-3 text-white font-black rounded-xl shadow-lg shadow-blue-200 hover:scale-105 transition-all flex items-center gap-2"
                   style={{ backgroundColor: settings.primaryColor }}
                 >
                   <Save size={20} />
                   {editingGroup ? 'Salvar Alterações' : 'Criar Rede'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupermarketGroupsListView;
