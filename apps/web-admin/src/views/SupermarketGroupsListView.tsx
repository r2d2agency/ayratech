import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, ChevronRight } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import { ViewType, SupermarketGroup } from '../types';
import api from '../api/client';

interface SupermarketGroupsListViewProps {
  onNavigate: (view: ViewType) => void;
}

const SupermarketGroupsListView: React.FC<SupermarketGroupsListViewProps> = ({ onNavigate }) => {
  const { settings } = useBranding();
  const [groups, setGroups] = useState<SupermarketGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

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

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Redes / Grupos</h1>
          <p className="text-slate-500 font-bold mt-1">Gerencie as redes de supermercados.</p>
        </div>
        <button 
          onClick={() => onNavigate('supermarket_group_form')}
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
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
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
    </div>
  );
};

export default SupermarketGroupsListView;
