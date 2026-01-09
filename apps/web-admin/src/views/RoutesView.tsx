import React, { useState, useEffect } from 'react';
import { Calendar, MapPinned, Plus, Trash2, CheckCircle, Save, Settings, List, Clock, MoveUp, MoveDown, Copy, FileText, Check } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import api from '../api/client';

const RoutesView: React.FC = () => {
  const { settings } = useBranding();
  
  const [activeTab, setActiveTab] = useState<'planner' | 'editor' | 'templates' | 'rules'>('planner');
  const [promoters, setPromoters] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [supermarkets, setSupermarkets] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // Filters
  const [filterPromoterId, setFilterPromoterId] = useState<string>('');
  const [filterSupervisorId, setFilterSupervisorId] = useState<string>('');

  // Editor State
  const [selectedPromoter, setSelectedPromoter] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [routeItems, setRouteItems] = useState<any[]>([]);
  const [routeStatus, setRouteStatus] = useState<string>('DRAFT');
  const [loading, setLoading] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  // Product Selection Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [currentRouteItemIndex, setCurrentRouteItemIndex] = useState<number | null>(null);
  const [tempSelectedProducts, setTempSelectedProducts] = useState<string[]>([]);

  // Planner State
  const [weekRoutes, setWeekRoutes] = useState<any[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(new Date());

  // Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Duplicate State
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [routeToDuplicate, setRouteToDuplicate] = useState<any>(null);
  const [duplicateTargetDate, setDuplicateTargetDate] = useState('');

  // Rules State
  const [rules, setRules] = useState<any[]>([]);
  const [newRule, setNewRule] = useState({ name: '', description: '', value: '' });

  useEffect(() => {
    fetchData();
    fetchRoutesForWeek();
  }, []);

  useEffect(() => {
    fetchRoutesForWeek();
  }, [weekStart]);

  const fetchData = async () => {
    try {
      const [employeesRes, supermarketsRes, productsRes, templatesRes] = await Promise.all([
        api.get('/employees'),
        api.get('/supermarkets'),
        api.get('/products'),
        api.get('/routes/templates/all')
      ]);
      
      const promotersList = employeesRes.data.filter((e: any) => 
        e.role && (e.role.name.toLowerCase() === 'promotor' || e.role.name.toLowerCase() === 'promoter')
      );
      
      const formattedPromoters = promotersList.map((p: any) => ({
        ...p,
        name: p.fullName || p.name || 'Sem Nome'
      }));

      setPromoters(formattedPromoters);
      setSupermarkets(supermarketsRes.data);
      setProducts(productsRes.data);
      setTemplates(templatesRes.data);
      fetchRules();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchRoutesForWeek = async () => {
    try {
      const res = await api.get('/routes');
      setWeekRoutes(res.data.filter((r: any) => !r.isTemplate));
    } catch (error) {
      console.error('Error fetching routes:', error);
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

  // --- Editor Logic ---

  const handleAddSupermarket = (supermarketId: string) => {
    if (routeItems.find(item => item.supermarketId === supermarketId)) return;
    const supermarket = supermarkets.find(s => s.id === supermarketId);
    if (supermarket) {
      setRouteItems([...routeItems, { 
        supermarketId, 
        supermarket, 
        startTime: '', 
        estimatedDuration: 30,
        productIds: [] 
      }]);
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...routeItems];
    newItems.splice(index, 1);
    setRouteItems(newItems);
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === routeItems.length - 1) return;
    
    const newItems = [...routeItems];
    const temp = newItems[index];
    newItems[index] = newItems[index + (direction === 'up' ? -1 : 1)];
    newItems[index + (direction === 'up' ? -1 : 1)] = temp;
    setRouteItems(newItems);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...routeItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setRouteItems(newItems);
  };

  const handleOpenProductModal = (index: number) => {
    setCurrentRouteItemIndex(index);
    setTempSelectedProducts(routeItems[index].productIds || []);
    setShowProductModal(true);
  };

  const handleToggleProductSelection = (productId: string) => {
    if (tempSelectedProducts.includes(productId)) {
      setTempSelectedProducts(tempSelectedProducts.filter(id => id !== productId));
    } else {
      setTempSelectedProducts([...tempSelectedProducts, productId]);
    }
  };

  const handleSaveProductSelection = () => {
    if (currentRouteItemIndex !== null) {
      const newItems = [...routeItems];
      newItems[currentRouteItemIndex].productIds = tempSelectedProducts;
      setRouteItems(newItems);
      setShowProductModal(false);
      setCurrentRouteItemIndex(null);
    }
  };

  const handleSaveRoute = async (status: 'DRAFT' | 'CONFIRMED' = 'DRAFT') => {
    if (!selectedPromoter || !selectedDate || routeItems.length === 0) {
      alert('Selecione um promotor, uma data e adicione pontos de venda.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        promoterId: selectedPromoter,
        date: selectedDate,
        status: status,
        items: routeItems.map((item, index) => ({
          supermarketId: item.supermarketId,
          order: index + 1,
          startTime: item.startTime,
          estimatedDuration: parseInt(item.estimatedDuration),
          productIds: item.productIds || []
        }))
      };

      if (editingRouteId) {
        // Update logic would go here if we had a PATCH endpoint for full update
        // For now, we might rely on recreating or specific update DTOs.
        // Assuming we just create new ones or need a better update flow.
        // Let's stick to Create for now as "Save" usually implies creating/overwriting in this simple MVP.
        // Or better: Delete & Create? No, that loses history.
        // Ideally we update. I'll use create for now as the 'Update' endpoint is partial.
        alert('Edição de rota existente ainda não implementada completamente. Criando nova rota.');
        await api.post('/routes', payload);
      } else {
        await api.post('/routes', payload);
      }
      
      alert(`Rota ${status === 'CONFIRMED' ? 'confirmada' : 'salva'} com sucesso!`);
      fetchRoutesForWeek();
      setActiveTab('planner');
      // Clear form
      setRouteItems([]);
      setEditingRouteId(null);
    } catch (error) {
      console.error('Error saving route:', error);
      alert('Erro ao salvar rota.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName || routeItems.length === 0) return;
    try {
      await api.post('/routes', {
        isTemplate: true,
        templateName: templateName,
        status: 'DRAFT',
        promoterId: selectedPromoter, // Optional for template
        date: selectedDate, // Optional/Dummy
        items: routeItems.map((item, index) => ({
          supermarketId: item.supermarketId,
          order: index + 1,
          startTime: item.startTime,
          estimatedDuration: parseInt(item.estimatedDuration),
          productIds: item.productIds || []
        }))
      });
      alert('Template salvo!');
      setShowSaveTemplateModal(false);
      setTemplateName('');
      // Refresh templates
      const res = await api.get('/routes/templates/all');
      setTemplates(res.data);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleLoadTemplate = (template: any) => {
    // Load template items into editor
    const items = template.items.map((item: any) => ({
      supermarketId: item.supermarket.id,
      supermarket: item.supermarket,
      order: item.order,
      startTime: item.startTime || '',
      estimatedDuration: item.estimatedDuration || 30,
      productIds: item.products?.map((p: any) => p.productId) || []
    }));
    setRouteItems(items);
    setActiveTab('editor');
  };

  const handleDuplicateRoute = async () => {
    if (!routeToDuplicate || !duplicateTargetDate) return;
    try {
      await api.post(`/routes/${routeToDuplicate.id}/duplicate`, {
        date: duplicateTargetDate
      });
      alert('Rota duplicada com sucesso!');
      setShowDuplicateModal(false);
      setRouteToDuplicate(null);
      setDuplicateTargetDate('');
      fetchRoutesForWeek();
    } catch (error) {
      console.error('Error duplicating route:', error);
      alert('Erro ao duplicar rota.');
    }
  };

  // --- Planner Logic ---
  const getDaysOfWeek = (startDate: Date) => {
    const days = [];
    const current = new Date(startDate);
    current.setDate(current.getDate() - current.getDay() + 1); // Start Monday
    for (let i = 0; i < 7; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const weekDays = getDaysOfWeek(weekStart);

  const getRoutesForDay = (dateStr: string) => {
    return weekRoutes.filter(r => r.date === dateStr);
  };

  const handleEditRoute = (route: any) => {
    setSelectedPromoter(route.promoterId);
    setSelectedDate(route.date);
    setRouteStatus(route.status);
    setEditingRouteId(route.id);
    
    // Load items
    const items = route.items.map((item: any) => ({
      supermarketId: item.supermarket.id,
      supermarket: item.supermarket,
      order: item.order,
      startTime: item.startTime || '',
      estimatedDuration: item.estimatedDuration || 30,
      productIds: item.products?.map((p: any) => p.productId) || []
    }));
    setRouteItems(items);
    setActiveTab('editor');
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/routes/rules', {
        ...newRule,
        value: JSON.parse(newRule.value || '{}')
      });
      alert('Regra criada com sucesso!');
      setNewRule({ name: '', description: '', value: '' });
      fetchRules();
    } catch (error) {
      console.error('Error creating rule:', error);
      alert('Erro ao criar regra. Verifique se o valor é um JSON válido.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestão de Rotas</h1>
          <p className="text-slate-500 font-medium text-lg">Planejamento, Templates e Regras.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {['planner', 'editor', 'templates', 'rules'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all capitalize ${
                activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'planner' ? 'Calendário' : tab === 'editor' ? 'Editor de Rota' : tab === 'templates' ? 'Modelos' : 'Regras'}
            </button>
          ))}
        </div>
      </div>

      {/* --- PLANNER TAB --- */}
      {activeTab === 'planner' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 gap-4">
            <div className="flex items-center gap-4">
               <button onClick={() => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() - 7);
                  setWeekStart(d);
               }} className="p-2 hover:bg-slate-100 rounded-lg font-bold text-slate-600">
                 &larr; Semana Anterior
               </button>
               <h3 className="text-lg font-black text-slate-900">
                 {weekDays[0].toLocaleDateString()} - {weekDays[6].toLocaleDateString()}
               </h3>
               <button onClick={() => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + 7);
                  setWeekStart(d);
               }} className="p-2 hover:bg-slate-100 rounded-lg font-bold text-slate-600">
                 Próxima Semana &rarr;
               </button>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
               <select 
                 value={filterPromoterId}
                 onChange={(e) => setFilterPromoterId(e.target.value)}
                 className="px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-600"
               >
                 <option value="">Todos os Promotores</option>
                 {promoters.map(p => (
                   <option key={p.id} value={p.id}>{p.name}</option>
                 ))}
               </select>

               <select 
                 value={filterSupervisorId}
                 onChange={(e) => setFilterSupervisorId(e.target.value)}
                 className="px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-600"
               >
                 <option value="">Todos os Supervisores</option>
                 {/* Filter employees to show only potential supervisors (e.g., have 'supervisor' in role or are assigned as supervisor) 
                     For simplicity, we'll list all employees or filter by role if possible.
                     Let's assume supervisors have 'Supervisor' in their role name.
                 */}
                 {allEmployees
                   .filter(e => e.role && e.role.name.toLowerCase().includes('supervisor'))
                   .map(s => (
                     <option key={s.id} value={s.id}>{s.name}</option>
                   ))
                 }
               </select>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4 overflow-x-auto min-w-[1000px]">
            {weekDays.map(day => {
              const dateStr = day.toISOString().split('T')[0];
              const dayRoutes = getRoutesForDay(dateStr);
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              return (
                <div key={dateStr} className={`space-y-3 min-h-[400px] ${isToday ? 'bg-blue-50/50' : ''} rounded-2xl p-2`}>
                  <div className="text-center mb-4">
                    <p className="text-xs font-black text-slate-400 uppercase">{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                    <p className={`text-xl font-black ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>{day.getDate()}</p>
                  </div>

                  {dayRoutes.map(route => (
                    <div 
                      key={route.id}
                      onClick={() => handleEditRoute(route)}
                      className={`p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all ${
                        route.status === 'CONFIRMED' 
                          ? 'bg-green-50 border-green-200' 
                          : route.status === 'COMPLETED'
                          ? 'bg-emerald-100 border-emerald-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-500">{route.promoter?.name?.split(' ')[0] || 'S/ Promotor'}</span>
                        <span className={`w-2 h-2 rounded-full ${
                          route.status === 'CONFIRMED' ? 'bg-green-500' : 'bg-slate-300'
                        }`} />
                      </div>
                      <p className="text-xs font-bold text-slate-800 mb-1">{route.items?.length || 0} PDVs</p>
                    </div>
                  ))}

                  <button 
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setRouteItems([]);
                      setEditingRouteId(null);
                      setRouteStatus('DRAFT');
                      setActiveTab('editor');
                    }}
                    className="w-full py-2 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> Nova Rota
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- EDITOR TAB --- */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Configuração da Rota</h3>
              
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Data</label>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full font-bold text-slate-900 bg-slate-50 p-3 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Promotor</label>
                <select 
                  value={selectedPromoter || ''}
                  onChange={(e) => setSelectedPromoter(e.target.value)}
                  className="w-full font-bold text-slate-900 bg-slate-50 p-3 rounded-xl outline-none"
                >
                  <option value="">Selecione...</option>
                  {promoters.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Status</label>
                <div className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${
                  routeStatus === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {routeStatus}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Adicionar PDV</h3>
              <div className="h-64 overflow-y-auto space-y-2 pr-2">
                {supermarkets.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => handleAddSupermarket(s.id)}
                    disabled={!!routeItems.find(i => i.supermarketId === s.id)}
                    className="w-full flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 border border-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">{s.fantasyName}</p>
                      <p className="text-[10px] text-slate-400">{s.city}</p>
                    </div>
                    <Plus size={16} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Route Items Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-50 rounded-3xl border border-slate-200 p-8 min-h-[600px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900">Roteiro de Visitas</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowSaveTemplateModal(true)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Copy size={14} /> Salvar como Modelo
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {routeItems.length === 0 ? (
                  <div className="text-center py-20">
                    <MapPinned size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-400 font-medium">Adicione supermercados para montar a rota.</p>
                  </div>
                ) : (
                  routeItems.map((item, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group transition-all hover:border-blue-200">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                            {index + 1}
                          </div>
                          <div className="flex flex-col gap-1 mt-2">
                            <button onClick={() => handleMoveItem(index, 'up')} className="p-1 text-slate-300 hover:text-slate-600"><MoveUp size={14} /></button>
                            <button onClick={() => handleMoveItem(index, 'down')} className="p-1 text-slate-300 hover:text-slate-600"><MoveDown size={14} /></button>
                          </div>
                        </div>

                        <div className="flex-1 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-lg text-slate-900">{item.supermarket.fantasyName}</h4>
                              <p className="text-sm text-slate-400">{item.supermarket.address}, {item.supermarket.city}</p>
                            </div>
                            <button onClick={() => handleRemoveItem(index)} className="text-red-300 hover:text-red-500">
                              <Trash2 size={18} />
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-4 p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-2">
                              <Clock size={16} className="text-slate-400" />
                              <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Chegada</label>
                                <input 
                                  type="time" 
                                  value={item.startTime}
                                  onChange={e => handleUpdateItem(index, 'startTime', e.target.value)}
                                  className="bg-transparent font-bold text-sm text-slate-700 outline-none w-20"
                                />
                              </div>
                            </div>
                            <div className="w-px bg-slate-200 h-8" />
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Duração (min)</label>
                                <input 
                                  type="number" 
                                  value={item.estimatedDuration}
                                  onChange={e => handleUpdateItem(index, 'estimatedDuration', e.target.value)}
                                  className="bg-transparent font-bold text-sm text-slate-700 outline-none w-16"
                                />
                              </div>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleOpenProductModal(index)}
                            className="w-full py-2 border border-blue-100 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle size={16} />
                            {item.productIds && item.productIds.length > 0 
                              ? `${item.productIds.length} Produtos Selecionados` 
                              : 'Selecionar Produtos para Conferência'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-4 mt-8 pt-8 border-t border-slate-200">
                <button 
                  onClick={() => handleSaveRoute('DRAFT')}
                  disabled={loading}
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-black shadow-sm hover:bg-slate-50"
                >
                  Salvar Rascunho
                </button>
                <button 
                  onClick={() => handleSaveRoute('CONFIRMED')}
                  disabled={loading}
                  className="flex-1 py-4 text-white rounded-xl font-black shadow-lg hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  <Check size={20} /> Confirmar Rota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TEMPLATES TAB --- */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div key={template.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <FileText size={24} />
                </div>
                <button className="text-slate-300 hover:text-red-400"><Trash2 size={18} /></button>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">{template.templateName}</h3>
              <p className="text-sm text-slate-500 mb-6">{template.items.length} PDVs configurados</p>
              
              <button 
                onClick={() => handleLoadTemplate(template)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800"
              >
                Usar Modelo
              </button>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-400">
              Nenhum modelo salvo. Crie uma rota e salve como modelo.
            </div>
          )}
        </div>
      )}

      {/* --- RULES TAB (Existing) --- */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                    />
                 </div>
                 <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Configuração (JSON)</label>
                    <textarea 
                      required
                      value={newRule.value}
                      onChange={e => setNewRule({...newRule, value: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-mono text-sm h-32"
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
           {/* Rules List (Same as before) */}
           <div className="bg-white rounded-3xl border border-slate-200 p-8">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <List size={24} className="text-slate-400" />
                Regras Ativas
              </h3>
              <div className="space-y-4">
                 {rules.map((rule: any) => (
                   <div key={rule.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                         <h4 className="font-bold text-slate-900">{rule.name}</h4>
                         <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">Ativa</span>
                      </div>
                      <p className="text-sm text-slate-500 mb-3">{rule.description}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Selecionar Produtos</h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <Settings size={20} className="rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-6">
              {products.map(product => (
                <div 
                  key={product.id} 
                  onClick={() => handleToggleProductSelection(product.id)}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                    tempSelectedProducts.includes(product.id) 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                      tempSelectedProducts.includes(product.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    }`}>
                      {tempSelectedProducts.includes(product.id) && <CheckCircle size={12} className="text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{product.name}</p>
                      <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button onClick={() => setShowProductModal(false)} className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
              <button 
                onClick={handleSaveProductSelection}
                className="px-6 py-2 rounded-lg font-bold text-white shadow-lg"
                style={{ backgroundColor: settings.primaryColor }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Salvar como Modelo</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Nome do Modelo</label>
                <input 
                  type="text" 
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="Ex: Rota Segunda-feira Zona Sul"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button onClick={() => setShowSaveTemplateModal(false)} className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
                <button 
                  onClick={handleSaveTemplate}
                  disabled={!templateName}
                  className="px-6 py-2 rounded-lg font-bold text-white shadow-lg disabled:opacity-50"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Route Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Duplicar Rota</h3>
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Duplicando rota de <b>{routeToDuplicate?.promoter?.name}</b> do dia <b>{new Date(routeToDuplicate?.date).toLocaleDateString()}</b>.
              </p>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Para o dia</label>
                <input 
                  type="date" 
                  value={duplicateTargetDate}
                  onChange={e => setDuplicateTargetDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button onClick={() => {
                  setShowDuplicateModal(false);
                  setRouteToDuplicate(null);
                }} className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
                <button 
                  onClick={handleDuplicateRoute}
                  disabled={!duplicateTargetDate}
                  className="px-6 py-2 rounded-lg font-bold text-white shadow-lg disabled:opacity-50"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  Duplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutesView;