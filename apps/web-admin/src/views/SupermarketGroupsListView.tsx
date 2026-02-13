import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, X } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SupermarketGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    status: true
  });

  const fetchGroups = async () => {
    try {
      const response = await api.get('/supermarket-groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', status: true });
    setEditingGroup(null);
  };

  const handleAddNew = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (group: SupermarketGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      status: group.status !== undefined ? group.status : true
    });
    setShowModal(true);
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
          <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-slate-100 flex justify-between items-center rounded-t-[2rem]">
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
            
            <form onSubmit={handleSave} className="p-8 space-y-8">
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
