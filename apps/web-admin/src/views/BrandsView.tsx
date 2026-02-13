import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Search, Tag } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import api from '../api/client';
import { SearchableSelect } from '../components/SearchableSelect';

const BrandsView: React.FC = () => {
  const { settings } = useBranding();
  const [brands, setBrands] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    waitForStockCount: false,
    stockNotificationContact: ''
  });

  useEffect(() => {
    fetchBrands();
    fetchClients();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await api.get('/brands');
      setBrands(response.data);
    } catch (error) {
      console.error("Error fetching brands:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.clientId) {
        alert('Selecione um cliente para a marca.');
        return;
      }

      // Clean up payload
      const payload: any = { ...formData };
      
      // Ensure waitForStockCount is boolean
      payload.waitForStockCount = !!payload.waitForStockCount;
      
      if (payload.name) {
        payload.name = payload.name.trim();
      }

      if (!payload.waitForStockCount) {
        payload.stockNotificationContact = '';
      }
      
      // If stockNotificationContact is empty string, send it as is (allowed by DTO) 
      // or consider sending null if backend supports it. 
      // For now, let's keep it as string but ensure it's trimmed if it's not empty.
      if (payload.stockNotificationContact) {
        payload.stockNotificationContact = payload.stockNotificationContact.trim();
      }

      console.log('Saving brand payload:', payload);

      if (editingBrand) {
        await api.patch(`/brands/${editingBrand.id}`, payload);
        alert('Marca atualizada com sucesso!');
      } else {
        await api.post('/brands', payload);
        alert('Marca criada com sucesso!');
      }
      setShowModal(false);
      resetForm();
      fetchBrands();
    } catch (error: any) {
      console.error("Error saving brand:", error);
      console.error("Error response data:", error.response?.data);
      
      let message = error.response?.data?.message || 'Erro ao salvar marca.';
      if (typeof message === 'object') {
        if (Array.isArray(message)) {
           message = message.join('\n');
        } else {
           message = JSON.stringify(message);
        }
      }
      alert(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta marca?')) return;
    try {
      await api.delete(`/brands/${id}`);
      fetchBrands();
    } catch (error) {
      console.error("Error deleting brand:", error);
      alert('Erro ao excluir marca.');
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      clientId: '',
      waitForStockCount: false,
      stockNotificationContact: ''
    });
    setEditingBrand(null);
  };

  const openEditModal = (brand: any) => {
    console.log('Opening edit modal for brand:', brand);
    console.log('Brand client:', brand.client);
    console.log('Computed clientId:', brand.clientId || brand.client?.id || '');
    
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      clientId: brand.clientId || brand.client?.id || '',
      waitForStockCount: brand.waitForStockCount || false,
      stockNotificationContact: brand.stockNotificationContact || ''
    });
    setShowModal(true);
  };

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.client?.nomeFantasia || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8">Carregando marcas...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Marcas</h1>
          <p className="text-slate-500 font-medium text-lg">Gerencie as marcas de produtos.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-blue-200 hover:scale-105 transition-all"
          style={{ backgroundColor: settings.primaryColor }}
        >
          <Plus size={20} />
          Nova Marca
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 bg-slate-50/50 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar marcas..." 
              className="w-full pl-12 h-12 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="p-6">Nome da Marca</th>
                <th className="p-6">Cliente Associado</th>
                <th className="p-6">Produtos</th>
                <th className="p-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBrands.map(brand => (
                <tr key={brand.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-6 font-bold text-slate-700 flex items-center gap-2">
                    <Tag size={16} className="text-slate-400" />
                    {brand.name}
                  </td>
                  <td className="p-6 text-slate-500">
                    {brand.client ? (
                      <span className="font-medium text-slate-700">{brand.client.nomeFantasia || brand.client.razaoSocial}</span>
                    ) : (
                      <span className="text-slate-300 italic">Sem cliente</span>
                    )}
                  </td>
                  <td className="p-6 text-slate-500">
                    {brand.products?.length || 0} produtos
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(brand)}
                        className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(brand.id)}
                        className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBrands.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400">
                    Nenhuma marca encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800">
                {editingBrand ? 'Editar Marca' : 'Nova Marca'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome da Marca</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Nestlé"
                />
              </div>

              <div>
                <SearchableSelect
                  label="Cliente Associado"
                  required
                  placeholder="Selecione um cliente..."
                  value={formData.clientId}
                  onChange={(val) => setFormData({...formData, clientId: val})}
                  options={clients.map(c => ({
                    value: c.id,
                    label: c.nomeFantasia || c.razaoSocial
                  }))}
                />
                <p className="text-[10px] text-slate-400 mt-1 ml-1">A marca deve estar vinculada a um cliente (indústria).</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="waitForStockCount"
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={formData.waitForStockCount}
                    onChange={e => setFormData({...formData, waitForStockCount: e.target.checked})}
                  />
                  <label htmlFor="waitForStockCount" className="text-sm font-bold text-slate-700 cursor-pointer">
                    Aguardar contagem de estoque
                  </label>
                </div>
                
                {formData.waitForStockCount && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Contato para Notificação</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium"
                      value={formData.stockNotificationContact}
                      onChange={e => setFormData({...formData, stockNotificationContact: e.target.value})}
                      placeholder="Email ou telefone do responsável"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">
                      O promotor será instruído a aguardar até que este contato autorize a continuação.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 gap-3">
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
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandsView;
