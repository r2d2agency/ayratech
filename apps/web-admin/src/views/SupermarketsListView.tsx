import React, { useState, useEffect } from 'react';
import { Store, Edit, Trash2, X, Search, MapPin } from 'lucide-react';
import api from '../api/client';
import { useBranding } from '../context/BrandingContext';
import { ViewType, SupermarketGroup } from '../types';
import MapModal from '../components/MapModal';
import { validateCNPJ } from '../utils/validators';
import { formatCNPJ } from '../utils/formatters';

interface SupermarketsListViewProps {
  onNavigate: (view: ViewType) => void;
}

const SupermarketsListView: React.FC<SupermarketsListViewProps> = ({ onNavigate }) => {
  const { settings } = useBranding();
  const [supermarkets, setSupermarkets] = useState<any[]>([]);
  const [groups, setGroups] = useState<SupermarketGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'location'>('general');
  const [editingSupermarket, setEditingSupermarket] = useState<any | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [formData, setFormData] = useState({
    fantasyName: '',
    cnpj: '',
    groupId: '',
    classification: 'Prata',
    zipCode: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    city: '',
    state: '',
    latitude: null as number | null,
    longitude: null as number | null,
    status: true
  });

  const fetchData = async () => {
    try {
      const [supermarketsRes, groupsRes] = await Promise.all([
        api.get('/supermarkets'),
        api.get('/supermarket-groups')
      ]);
      setSupermarkets(supermarketsRes.data);
      setGroups(groupsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      fantasyName: '',
      cnpj: '',
      groupId: '',
      classification: 'Prata',
      zipCode: '',
      street: '',
      number: '',
      neighborhood: '',
      complement: '',
      city: '',
      state: '',
      latitude: null,
      longitude: null,
      status: true
    });
    setEditingSupermarket(null);
  };

  const handleAddNew = () => {
    resetForm();
    setActiveTab('general');
    setShowModal(true);
  };

  const handleEdit = (supermarket: any) => {
    setEditingSupermarket(supermarket);
    setActiveTab('general');
    setFormData({
      fantasyName: supermarket.fantasyName || '',
      cnpj: formatCNPJ(supermarket.cnpj || ''),
      groupId: supermarket.groupId || (supermarket.group?.id || ''),
      classification: supermarket.classification || 'Prata',
      zipCode: supermarket.zipCode || '',
      street: supermarket.street || '',
      number: supermarket.number || '',
      neighborhood: supermarket.neighborhood || '',
      complement: supermarket.complement || '',
      city: supermarket.city || '',
      state: supermarket.state || '',
      latitude: supermarket.latitude ? parseFloat(supermarket.latitude) : null,
      longitude: supermarket.longitude ? parseFloat(supermarket.longitude) : null,
      status: supermarket.status !== undefined ? supermarket.status : true
    });
    setShowModal(true);
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este supermercado? Esta ação não pode ser desfeita.')) {
      setDeletingId(id);
      try {
        await api.delete(`/supermarkets/${id}`);
        setSupermarkets(prev => prev.filter(s => s.id !== id));
      } catch (error: any) {
        console.error("Error deleting supermarket:", error);
        const msg = error.response?.data?.message || 'Erro ao excluir supermercado.';
        alert(msg);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'cnpj') {
      setFormData(prev => ({ ...prev, [name]: formatCNPJ(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLocationConfirm = (lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleCepBlur = async () => {
    const cep = formData.zipCode.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setCepLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fantasyName || !formData.city) {
      alert('Por favor, preencha o Nome Fantasia e a Cidade.');
      return;
    }

    if (formData.cnpj && !validateCNPJ(formData.cnpj)) {
      alert('CNPJ inválido. Por favor, verifique o número digitado.');
      return;
    }

    try {
      const payload = { ...formData };
      // Remove formatting from CNPJ before saving
      if (payload.cnpj) {
        payload.cnpj = payload.cnpj.replace(/\D/g, '');
      }

      // Convert empty string to null for groupId to avoid foreign key constraint errors
      if (!payload.groupId) {
        (payload as any).groupId = null;
      }

      if (editingSupermarket) {
        await api.patch(`/supermarkets/${editingSupermarket.id}`, payload);
        alert('Supermercado atualizado com sucesso!');
      } else {
        await api.post('/supermarkets', payload);
        alert('Supermercado criado com sucesso!');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error saving supermarket:", error);
      const msg = error.response?.data?.message 
        ? (Array.isArray(error.response.data.message) ? error.response.data.message.join('\n') : error.response.data.message)
        : error.message;
      alert(`Erro ao salvar supermercado:\n${msg}`);
    }
  };

  if (loading) return <div className="p-8">Carregando supermercados...</div>;

  return (
    <div className="animate-in fade-in duration-500 space-y-8 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Supermercados</h1>
          <p className="text-slate-500 font-medium text-lg">Pontos de venda da rede Ayratech.</p>
        </div>
        <button 
          onClick={handleAddNew} 
          className="text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-blue-200 hover:scale-105 transition-all"
          style={{ backgroundColor: settings.primaryColor }}
        >
          Cadastrar PDV
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="px-8 py-5">Identificação do PDV</th>
              <th className="px-8 py-5">Rede / Grupo</th>
              <th className="px-8 py-5">Cidade / UF</th>
              <th className="px-8 py-5 text-center">Classificação</th>
              <th className="px-8 py-5 text-right">Controle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {supermarkets.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                   <div className="flex items-center gap-4">
                      <div 
                        className="h-12 w-12 rounded-2xl flex items-center justify-center border transition-colors"
                        style={{ 
                          backgroundColor: `${settings.primaryColor}10`,
                          color: settings.primaryColor,
                          borderColor: `${settings.primaryColor}20`
                        }}
                      >
                         <Store size={22} />
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-900">{s.fantasyName}</p>
                        <p className="text-xs text-slate-400 font-bold">CNPJ: {s.cnpj || 'Não informado'}</p>
                      </div>
                   </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-sm font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{s.group?.name || 'Sem Rede'}</span>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm font-bold text-slate-600">{s.city} - {s.state}</p>
                </td>
                <td className="px-8 py-6 text-center">
                   <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                      s.classification === 'Ouro' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                   }`}>
                      {s.classification}
                   </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleEdit(s)}
                      className="p-3 text-slate-400 hover:bg-blue-50 rounded-xl transition-all"
                      title="Editar"
                    >
                      <Edit size={20} className="text-blue-500" />
                    </button>
                    <button 
                      onClick={() => handleDelete(s.id)}
                      className="p-3 text-slate-400 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Excluir"
                      disabled={deletingId === s.id}
                    >
                      {deletingId === s.id ? (
                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={20} className="text-red-500" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {editingSupermarket ? 'Editar Supermercado' : 'Novo Supermercado'}
                </h2>
                <p className="text-slate-500 font-medium">Preencha os dados do ponto de venda</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="flex border-b border-slate-100">
              <button 
                type="button"
                className={`flex-1 px-8 py-4 font-bold text-sm uppercase tracking-wider transition-all border-b-2 ${activeTab === 'general' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setActiveTab('general')}
              >
                Dados Gerais
              </button>
              <button 
                type="button"
                className={`flex-1 px-8 py-4 font-bold text-sm uppercase tracking-wider transition-all border-b-2 ${activeTab === 'location' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setActiveTab('location')}
              >
                Endereço e Localização
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-8">
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="md:col-span-2">
                       <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Nome Fantasia *</label>
                       <input 
                           type="text" 
                           name="fantasyName"
                           value={formData.fantasyName}
                           onChange={handleChange}
                           className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" 
                           placeholder="Ex: Pão de Açúcar - Loja 102"
                           required
                       />
                    </div>
    
                    <div>
                       <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">CNPJ</label>
                       <input 
                           type="text" 
                           name="cnpj"
                           value={formData.cnpj}
                           onChange={handleChange}
                           className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" 
                           placeholder="00.000.000/0000-00"
                       />
                    </div>
                    
                    <div>
                       <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Rede / Grupo</label>
                       <select 
                           name="groupId"
                           value={formData.groupId}
                           onChange={handleChange}
                           className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-black text-slate-700"
                       >
                          <option value="">Selecione...</option>
                          {groups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                          ))}
                       </select>
                    </div>
    
                    <div>
                       <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Classificação</label>
                       <select 
                           name="classification"
                           value={formData.classification}
                           onChange={handleChange}
                           className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-black text-slate-700"
                       >
                          <option value="Ouro">Ouro</option>
                          <option value="Prata">Prata</option>
                          <option value="Bronze">Bronze</option>
                       </select>
                    </div>
                </div>
              )}

              {activeTab === 'location' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                       <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">CEP</label>
                       <div className="relative">
                           <input 
                               type="text" 
                               name="zipCode"
                               value={formData.zipCode}
                               onChange={handleChange}
                               onBlur={handleCepBlur}
                               className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" 
                               placeholder="00000-000" 
                           />
                           {cepLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">Buscando...</div>}
                       </div>
                    </div>
    
                    <div>
                       <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Estado (UF)</label>
                       <input 
                           type="text" 
                           name="state"
                           value={formData.state}
                           onChange={handleChange}
                           className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" 
                           placeholder="SP" 
                       />
                    </div>
    
                    <div>
                       <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Cidade *</label>
                       <input 
                           type="text" 
                           name="city"
                           value={formData.city}
                           onChange={handleChange}
                           className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" 
                           placeholder="Cidade" 
                           required
                       />
                    </div>
    
                    <div>
                       <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Bairro</label>
                       <input 
                           type="text" 
                           name="neighborhood"
                           value={formData.neighborhood}
                           onChange={handleChange}
                           className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" 
                           placeholder="Bairro" 
                       />
                    </div>
    
                    <div className="md:col-span-2">
                       <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Logradouro (Rua, Av...)</label>
                       <input 
                           type="text" 
                           name="street"
                           value={formData.street}
                           onChange={handleChange}
                           className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" 
                           placeholder="Nome da Rua" 
                       />
                    </div>
    
                    <div>
                       <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Número</label>
                       <input 
                           type="text" 
                           name="number"
                           value={formData.number}
                           onChange={handleChange}
                           className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" 
                           placeholder="123" 
                       />
                    </div>
    
                    <div>
                       <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Complemento</label>
                       <input 
                           type="text" 
                           name="complement"
                           value={formData.complement}
                           onChange={handleChange}
                           className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" 
                           placeholder="Bloco A, Sala 1" 
                       />
                    </div>

                    <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-2 flex flex-col gap-4">
                       <div className="flex justify-between items-center">
                         <h3 className="text-lg font-black text-slate-800">Coordenadas Geográficas</h3>
                         <button
                           type="button"
                           onClick={() => setShowMapModal(true)}
                           className="flex items-center gap-2 text-blue-500 font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors"
                         >
                           <MapPin size={18} />
                           Selecionar no Mapa
                         </button>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Latitude</label>
                             <input 
                                 type="number" 
                                 step="any"
                                 value={formData.latitude || ''}
                                 readOnly
                                 className="w-full h-14 px-6 rounded-2xl bg-slate-100 border border-slate-200 outline-none font-bold text-slate-500 cursor-not-allowed" 
                                 placeholder="Latitude" 
                             />
                          </div>
                          <div>
                             <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Longitude</label>
                             <input 
                                 type="number" 
                                 step="any"
                                 value={formData.longitude || ''}
                                 readOnly
                                 className="w-full h-14 px-6 rounded-2xl bg-slate-100 border border-slate-200 outline-none font-bold text-slate-500 cursor-not-allowed" 
                                 placeholder="Longitude" 
                             />
                          </div>
                       </div>
                    </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                 <button 
                   type="button"
                   onClick={() => setShowModal(false)} 
                   className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="submit"
                   className="px-8 py-3 text-white font-black rounded-xl shadow-lg shadow-blue-200 hover:scale-105 transition-all"
                   style={{ backgroundColor: settings.primaryColor }}
                 >
                   {editingSupermarket ? 'Salvar Alterações' : 'Criar Supermercado'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <MapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        onConfirm={handleLocationConfirm}
        initialLat={formData.latitude || undefined}
        initialLng={formData.longitude || undefined}
        address={`${formData.street || ''} ${formData.number || ''}, ${formData.city || ''} - ${formData.state || ''}`}
      />
    </div>
  );
};

export default SupermarketsListView;