import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import api from '../api/client';

const ClientsView: React.FC = () => {
  const { settings } = useBranding();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  
  // Client Form State
  const [newClient, setNewClient] = useState({
    name: '',
    logo: ''
  });

  // Contract Form State
  const [newContract, setNewContract] = useState({
    clientId: '',
    description: '',
    startDate: '',
    endDate: '',
    value: 0
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      const mappedClients = response.data.map((c: any) => ({
        id: c.id,
        nome: c.name,
        logo: c.logo || 'https://via.placeholder.com/150',
        totalProdutos: c.products ? c.products.length : 0,
        status: c.status
      }));
      setClients(mappedClients);
    } catch (error) {
      console.error("Failed to fetch clients", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/contracts', newContract);
      alert('Contrato criado com sucesso!');
      setShowContractModal(false);
      setNewContract({ clientId: '', description: '', startDate: '', endDate: '', value: 0 });
    } catch (error) {
      console.error("Error creating contract:", error);
      alert('Erro ao criar contrato.');
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/clients', newClient);
      alert('Cliente criado com sucesso!');
      setShowClientModal(false);
      setNewClient({ name: '', logo: '' });
      fetchClients();
    } catch (error) {
      console.error("Error creating client:", error);
      alert('Erro ao criar cliente.');
    }
  };

  if (loading) return <div className="p-8">Carregando clientes...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowClientModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
            
            <h2 className="text-2xl font-black text-slate-900 mb-6">Novo Cliente</h2>
            
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Nome da Empresa</label>
                <input 
                  type="text" 
                  required
                  value={newClient.name}
                  onChange={e => setNewClient({...newClient, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                  placeholder="Ex: Coca-Cola"
                />
              </div>
              
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Logo URL (Opcional)</label>
                <input 
                  type="text" 
                  value={newClient.logo}
                  onChange={e => setNewClient({...newClient, logo: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                  placeholder="https://..."
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 text-white rounded-xl font-black shadow-lg hover:scale-[1.02] transition-all mt-4"
                style={{ backgroundColor: settings.primaryColor }}
              >
                Cadastrar Cliente
              </button>
            </form>
          </div>
        </div>
      )}

      {showContractModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowContractModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
            
            <h2 className="text-2xl font-black text-slate-900 mb-6">Novo Contrato</h2>
            
            <form onSubmit={handleCreateContract} className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Cliente</label>
                <select 
                  required
                  value={newContract.clientId}
                  onChange={e => setNewContract({...newContract, clientId: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Descrição do Contrato</label>
                <input 
                  type="text" 
                  required
                  value={newContract.description}
                  onChange={e => setNewContract({...newContract, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                  placeholder="Ex: Contrato Anual 2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Início</label>
                  <input 
                    type="date" 
                    required
                    value={newContract.startDate}
                    onChange={e => setNewContract({...newContract, startDate: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Fim</label>
                  <input 
                    type="date" 
                    required
                    value={newContract.endDate}
                    onChange={e => setNewContract({...newContract, endDate: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Valor (R$)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  step="0.01"
                  value={newContract.value}
                  onChange={e => setNewContract({...newContract, value: parseFloat(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 text-white rounded-xl font-black shadow-lg hover:scale-[1.02] transition-all mt-4"
                style={{ backgroundColor: settings.primaryColor }}
              >
                Criar Contrato
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Clientes & Contratos</h1>
          <p className="text-slate-500 font-medium text-lg">Marcas que confiam na operação Ayratech.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowClientModal(true)}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-2xl font-black shadow-sm transition-all hover:bg-slate-50"
          >
            <Plus size={20} /> Novo Cliente
          </button>
          <button 
            onClick={() => setShowContractModal(true)}
            className="flex items-center gap-2 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-blue-200 transition-all hover:scale-105"
            style={{ backgroundColor: settings.primaryColor }}
          >
            <Plus size={20} /> Novo Contrato
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {clients.map(c => (
          <div key={c.id} className="bg-white rounded-3xl border border-slate-200 p-8 hover:shadow-xl transition-all group relative overflow-hidden">
            <div 
              className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-bl-full -mr-10 -mt-10 transition-all group-hover:opacity-20" 
              style={{ backgroundColor: settings.primaryColor }}
            />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="h-16 w-16 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center p-3">
                  <img src={c.logo} className="object-contain" alt={c.nome} />
                </div>
                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${c.status !== false ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                  {c.status !== false ? 'Contrato Ativo' : 'Inativo'}
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">{c.nome}</h3>
              <p className="text-slate-500 font-bold mb-8">{c.totalProdutos} SKUs Cadastrados</p>
              <div className="pt-6 border-t border-slate-100 flex gap-3">
                <button className="flex-1 py-3 bg-slate-50 text-slate-700 rounded-xl text-xs font-black hover:bg-slate-100 transition-colors">Produtos</button>
                <button 
                  className="flex-1 py-3 rounded-xl text-xs font-black transition-colors bg-opacity-10 hover:bg-opacity-20"
                  style={{ 
                    color: settings.primaryColor,
                    backgroundColor: `${settings.primaryColor}1a` // 10% opacity
                  }}
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientsView;
