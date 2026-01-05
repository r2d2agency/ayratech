import React, { useState, useEffect } from 'react';
import { Calendar, MapPinned, Plus, Trash2, CheckCircle, Save, Settings, List } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import api from '../api/client';

const RoutesView: React.FC = () => {
  const { settings } = useBranding();
  
  const [activeTab, setActiveTab] = useState<'planner' | 'rules'>('planner');
  const [promoters, setPromoters] = useState<any[]>([]);
  const [supermarkets, setSupermarkets] = useState<any[]>([]);
  const [selectedPromoter, setSelectedPromoter] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [routeItems, setRouteItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Rules State
  const [rules, setRules] = useState<any[]>([]);
  const [newRule, setNewRule] = useState({ name: '', description: '', value: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, supermarketsRes] = await Promise.all([
        api.get('/users'),
        api.get('/supermarkets')
      ]);
      
      const promotersList = usersRes.data.filter((u: any) => u.role === 'promoter');
      setPromoters(promotersList);
      setSupermarkets(supermarketsRes.data);
      fetchRules();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await api.get('/routes/rules/all');
      setRules(res.data);
    } catch (error) {
      console.error('Error fetching rules:', error);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/routes/rules', {
        ...newRule,
        value: JSON.parse(newRule.value || '{}') // Ensure value is JSON
      });
      alert('Regra criada com sucesso!');
      setNewRule({ name: '', description: '', value: '' });
      fetchRules();
    } catch (error) {
      console.error('Error creating rule:', error);
      alert('Erro ao criar regra. Verifique se o valor é um JSON válido.');
    }
  };

  const handleAddSupermarket = (supermarketId: string) => {
    if (routeItems.find(item => item.supermarketId === supermarketId)) return;
    const supermarket = supermarkets.find(s => s.id === supermarketId);
    if (supermarket) {
      setRouteItems([...routeItems, { supermarketId, supermarket }]);
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...routeItems];
    newItems.splice(index, 1);
    setRouteItems(newItems);
  };

  const handleSaveRoute = async () => {
    if (!selectedPromoter || !selectedDate || routeItems.length === 0) {
      alert('Selecione um promotor, uma data e adicione pontos de venda.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/routes', {
        promoterId: selectedPromoter,
        date: selectedDate,
        status: 'PLANNING',
        items: routeItems.map((item, index) => ({
          supermarketId: item.supermarketId,
          order: index + 1
        }))
      });
      alert('Rota criada com sucesso!');
      setRouteItems([]);
    } catch (error) {
      console.error('Error creating route:', error);
      alert('Erro ao criar rota.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestão de Rotas</h1>
          <p className="text-slate-500 font-medium text-lg">Planejamento e Regras de Visitação.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('planner')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'planner' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Planejador
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'rules' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Regras de Rotas
          </button>
        </div>
      </div>

      {activeTab === 'planner' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Promoters */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm h-fit">
           <h3 className="text-xs font-black text-slate-400 uppercase mb-8 tracking-[0.2em]">1. Selecione o Promotor</h3>
           <div className="space-y-3">
              {promoters.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => setSelectedPromoter(p.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                    selectedPromoter === p.id 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                  style={selectedPromoter === p.id ? { borderColor: settings.primaryColor } : {}}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                    {p.name.charAt(0)}
                  </div>
                  <span className={`text-sm font-black ${selectedPromoter === p.id ? 'text-slate-900' : 'text-slate-600'}`}>
                    {p.name}
                  </span>
                </button>
              ))}
              {promoters.length === 0 && (
                <p className="text-sm text-slate-400">Nenhum promotor encontrado. Cadastre usuários com cargo 'Promotor' no menu Administração.</p>
              )}
           </div>
        </div>

        {/* Middle: Date & Route Editor */}
        <div className="lg:col-span-3 space-y-6">
          {/* Date Picker */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center gap-4">
             <Calendar className="text-slate-400" />
             <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="font-bold text-slate-700 outline-none bg-transparent"
             />
          </div>

          {selectedPromoter ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Available Supermarkets */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8">
                 <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">2. Adicionar PDVs</h3>
                 <div className="h-96 overflow-y-auto space-y-2 pr-2">
                    {supermarkets.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => handleAddSupermarket(s.id)}
                        disabled={!!routeItems.find(i => i.supermarketId === s.id)}
                        className="w-full flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 border border-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                      >
                         <div>
                            <p className="text-sm font-bold text-slate-800">{s.fantasyName}</p>
                            <p className="text-xs text-slate-400">{s.city} - {s.state}</p>
                         </div>
                         <Plus size={16} className="text-slate-400" />
                      </button>
                    ))}
                 </div>
              </div>

              {/* Current Route */}
              <div className="bg-slate-50 rounded-3xl border border-slate-200 p-8">
                 <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">3. Roteiro do Dia</h3>
                 <div className="space-y-3 min-h-[200px]">
                    {routeItems.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-10">Adicione pontos de venda para criar a rota.</p>
                    ) : (
                      routeItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                           <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                             {index + 1}
                           </div>
                           <div className="flex-1">
                              <p className="text-sm font-bold text-slate-800">{item.supermarket.fantasyName}</p>
                           </div>
                           <button onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={16} />
                           </button>
                        </div>
                      ))
                    )}
                 </div>
                 
                 <button 
                    onClick={handleSaveRoute}
                    disabled={loading || routeItems.length === 0}
                    className="w-full mt-6 py-4 rounded-xl text-white font-black shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: settings.primaryColor }}
                 >
                    {loading ? 'Salvando...' : <><Save size={20} /> Salvar Roteiro</>}
                 </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 flex flex-col items-center justify-center text-center h-full">
               <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <MapPinned size={48} className="text-slate-300" />
               </div>
               <h3 className="text-2xl font-black text-slate-400 mb-2">Editor Visual de Rotas</h3>
               <p className="text-slate-400 max-w-sm font-medium">Selecione um promotor à esquerda para começar.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Form */}
           <div className="bg-white rounded-3xl border border-slate-200 p-8">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Settings size={24} className="text-slate-400" />
                Nova Regra
              </h3>
              <form onSubmit={handleCreateRule} className="space-y-4">
                 <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Nome da Regra</label>
                    <input 
                      type="text" 
                      required
                      value={newRule.name}
                      onChange={e => setNewRule({...newRule, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                      placeholder="Ex: Distância Máxima"
                    />
                 </div>
                 <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Descrição</label>
                    <input 
                      type="text" 
                      required
                      value={newRule.description}
                      onChange={e => setNewRule({...newRule, description: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                      placeholder="Ex: Limita a distância entre PDVs"
                    />
                 </div>
                 <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Configuração (JSON)</label>
                    <textarea 
                      required
                      value={newRule.value}
                      onChange={e => setNewRule({...newRule, value: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-mono text-sm h-32"
                      placeholder='{"maxDistance": 10}'
                    />
                 </div>
                 <button 
                    type="submit"
                    className="w-full py-4 rounded-xl text-white font-black shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: settings.primaryColor }}
                 >
                    <Save size={20} /> Salvar Regra
                 </button>
              </form>
           </div>

           {/* List */}
           <div className="bg-white rounded-3xl border border-slate-200 p-8">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <List size={24} className="text-slate-400" />
                Regras Ativas
              </h3>
              <div className="space-y-4">
                 {rules.length === 0 ? (
                   <p className="text-slate-400 text-center py-10">Nenhuma regra cadastrada.</p>
                 ) : (
                   rules.map((rule: any) => (
                     <div key={rule.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="font-bold text-slate-900">{rule.name}</h4>
                           <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">Ativa</span>
                        </div>
                        <p className="text-sm text-slate-500 mb-3">{rule.description}</p>
                        <pre className="bg-slate-900 text-slate-50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                           {JSON.stringify(rule.value, null, 2)}
                        </pre>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default RoutesView;
