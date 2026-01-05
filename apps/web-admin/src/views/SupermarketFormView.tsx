import React, { useState, useEffect } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import { ViewType, SupermarketGroup } from '../types';
import api from '../api/client';

interface SupermarketFormViewProps {
  onNavigate: (view: ViewType) => void;
}

const SupermarketFormView: React.FC<SupermarketFormViewProps> = ({ onNavigate }) => {
  const { settings } = useBranding();
  const [groups, setGroups] = useState<SupermarketGroup[]>([]);
  const [formData, setFormData] = useState({
    fantasyName: '',
    groupId: '',
    classification: 'Silver',
    zipCode: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    city: '',
    state: '',
    status: true
  });
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/supermarket-groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleSubmit = async () => {
    if (!formData.fantasyName || !formData.city || !formData.street) {
        alert('Por favor, preencha o Nome Fantasia e o Endereço completo.');
        return;
    }

    setLoading(true);
    try {
      await api.post('/supermarkets', formData);
      alert('Cadastro realizado com sucesso!');
      onNavigate('supermarkets_list');
    } catch (error: any) {
      console.error('Erro ao cadastrar:', error);
      alert('Erro ao salvar cadastro: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto">
       <div className="flex items-center gap-6 mb-10">
          <button onClick={() => onNavigate('supermarkets_list')} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all">
             <ChevronRight className="rotate-180" size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Novo Cadastro PDV</h1>
            <p className="text-slate-500 font-bold">Preencha os dados operacionais da unidade.</p>
          </div>
       </div>
       <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="md:col-span-2">
                <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Nome Fantasia do Supermercado</label>
                <input 
                    type="text" 
                    name="fantasyName"
                    value={formData.fantasyName}
                    onChange={handleChange}
                    className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" 
                    placeholder="Ex: Pão de Açúcar - Loja 102" 
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

             {/* Address Section */}
             <div className="md:col-span-2 border-t border-slate-100 pt-8 mt-4">
                <h3 className="text-lg font-black text-slate-800 mb-6">Endereço</h3>
             </div>

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
                <label className="text-[11px] font-black text-slate-400 uppercase mb-3 block tracking-widest">Cidade</label>
                <input 
                    type="text" 
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800" 
                    placeholder="Cidade" 
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
          </div>
          <div className="mt-12 pt-10 border-t border-slate-100 flex justify-end gap-6">
             <button onClick={() => onNavigate('supermarkets_list')} className="px-8 py-4 font-black text-slate-400 hover:text-slate-600 transition-all">Descartar</button>
             <button 
                disabled={loading}
                className="px-12 py-4 text-white font-black rounded-2xl shadow-2xl shadow-blue-200 hover:scale-105 transition-all disabled:opacity-50"
                style={{ backgroundColor: settings.primaryColor }}
                onClick={handleSubmit}
             >
               {loading ? 'Salvando...' : 'Efetivar Cadastro'}
             </button>
        </div>
     </div>
  </div>
  );
};

export default SupermarketFormView;
