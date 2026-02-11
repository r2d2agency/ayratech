import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPinned, Plus, Trash2, CheckCircle, Save, Settings, List, Clock, MoveUp, MoveDown, Copy, FileText, Check, Search, GripVertical, XCircle, UserPlus, Users } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import api from '../api/client';
import { jwtDecode } from "jwt-decode";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableRouteItem = ({ id, item, index, onRemove, onUpdate, onOpenProducts, products, disabled }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
      id,
      disabled
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: disabled ? 0.9 : 1
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group transition-all hover:border-blue-200 mb-4 z-10 relative">
      <div className="flex items-start gap-4">
        <div className={`flex flex-col items-center gap-1 touch-none ${disabled ? 'cursor-default opacity-50' : 'cursor-grab active:cursor-grabbing'}`} {...attributes} {...listeners}>
          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm">
            {index + 1}
          </div>
          <div className="mt-2 text-slate-300 hover:text-slate-500">
            {!disabled && <GripVertical size={20} />}
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-bold text-lg text-slate-900">{item.supermarket.fantasyName}</h4>
              <p className="text-sm text-slate-400">{item.supermarket.address}, {item.supermarket.city}</p>
            </div>
            <button onClick={() => onRemove(index)} className="text-red-300 hover:text-red-500">
              <Trash2 size={18} />
            </button>
          </div>

          <div className="flex flex-wrap gap-4 p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Início</label>
                <input 
                  type="time" 
                  value={item.startTime || ''}
                  onChange={e => onUpdate(index, 'startTime', e.target.value)}
                  className="bg-transparent font-bold text-sm text-slate-700 outline-none w-24"
                />
              </div>
            </div>
            <div className="w-px bg-slate-200 h-8" />
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Fim</label>
                <input 
                  type="time" 
                  value={item.endTime || ''}
                  onChange={e => onUpdate(index, 'endTime', e.target.value)}
                  className="bg-transparent font-bold text-sm text-slate-700 outline-none w-24"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-xs font-black text-slate-500 uppercase">Produtos ({item.productIds?.length || 0})</h5>
              <button 
                onClick={() => onOpenProducts(index)}
                className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar/Gerenciar
              </button>
            </div>
            
            <div className="space-y-4">
              {(() => {
                const groupedProducts: Record<string, any[]> = {};
                item.productIds?.forEach((pid: string) => {
                  const product = products.find((p: any) => p.id === pid);
                  if (product) {
                    const categoryName = product.categoryRef?.name || product.category || 'Sem Categoria';
                    if (!groupedProducts[categoryName]) groupedProducts[categoryName] = [];
                    groupedProducts[categoryName].push(product);
                  }
                });

                if (Object.keys(groupedProducts).length === 0) {
                  return (
                    <p className="text-xs text-slate-400 italic">Nenhum produto selecionado para este ponto.</p>
                  );
                }

                return Object.entries(groupedProducts).map(([categoryName, categoryProducts], gIndex) => (
                  <div key={categoryName} className="border-l-2 border-slate-200 pl-3">
                    <h6 className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">{categoryName}</h6>
                    <div className="space-y-2">
                      {categoryProducts.map((product, pIndex) => (
                        <div key={product.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-xs font-bold text-slate-400 w-6">{(gIndex + 1)}.{pIndex + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700">{product.name}</p>
                            <p className="text-xs text-slate-400">{product.ean || ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DraggableRouteCard = ({ route, onDoubleClick, onDelete, onDuplicate, onManagePromoters }: any) => {
  const status = route.status?.toUpperCase() || 'DRAFT';
  const hasStartedItems = route.items?.some((i: any) => !!i.startTime || !!i.checkInTime);
  const isDraggable = status !== 'COMPLETED' && status !== 'IN_PROGRESS' && !hasStartedItems;
  
  const {attributes, listeners, setNodeRef, transform} = useDraggable({
    id: route.id,
    data: { route },
    disabled: !isDraggable
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
  } : undefined;

  const getStatusColor = () => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-50 border-blue-200'; // Blue for Scheduled/Confirmed
      case 'IN_PROGRESS':
        return 'bg-amber-50 border-amber-200'; // Amber for In Progress
      case 'COMPLETED':
        return 'bg-slate-100 border-slate-300 opacity-80'; // Gray for Completed
      default:
        return 'bg-white border-slate-200';
    }
  };

  const getIconColor = () => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-200 text-blue-700';
      case 'IN_PROGRESS':
        return 'bg-amber-200 text-amber-700';
      case 'COMPLETED':
        return 'bg-slate-200 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...(isDraggable ? listeners : {})} 
      {...(isDraggable ? attributes : {})}
      onClick={(e) => {
        if (e.detail === 2) {
          onDoubleClick(e);
        }
      }}
      className={`p-3 rounded-xl border transition-all touch-none ${
        isDraggable ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-pointer'
      } ${getStatusColor()}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1">
            <div className="flex -space-x-2">
                {((route.promoters && route.promoters.length > 0) ? route.promoters : (route.promoter ? [route.promoter] : [])).slice(0, 3).map((p: any) => (
                    <div key={p.id} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white ${getIconColor()}`} title={p.name}>
                        {p.name?.substring(0, 2).toUpperCase()}
                    </div>
                ))}
                {((route.promoters?.length || 0) > 3) && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white bg-slate-200 text-slate-600">
                        +{(route.promoters?.length || 0) - 3}
                    </div>
                )}
            </div>
            <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]" title={((route.promoters && route.promoters.length > 0) ? route.promoters : (route.promoter ? [route.promoter] : [])).map((p:any) => p.name).join(', ')}>
                {((route.promoters && route.promoters.length > 0) ? route.promoters : (route.promoter ? [route.promoter] : [])).map((p:any) => (p.name || '').split(' ')[0]).join(', ')}
            </p>
        </div>
        <div className="flex gap-1">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onManagePromoters(route);
                }}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                title="Gerenciar Promotores"
            >
                <UserPlus size={12} />
            </button>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(route);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                title="Duplicar Rota"
            >
                <Copy size={10} />
                <span className="text-[10px] font-bold">Duplicar</span>
            </button>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(e, route.id);
                }}
                className="p-1 hover:bg-red-100 rounded-full text-red-500 transition-colors"
                title="Excluir Rota"
            >
                <Trash2 size={12} />
            </button>
        </div>
      </div>
      <p className="text-xs font-bold text-slate-500 mb-1">{route.items?.length || 0} PDVs</p>
      {route.items && route.items.length > 0 && (
          <p className="text-[10px] text-slate-400 truncate">
              {route.items.map((i: any) => i.supermarket?.fantasyName).join(', ')}
          </p>
      )}
    </div>
  );
};

const DroppableDayColumn = ({ dateStr, children, isToday, onAddRoute }: any) => {
  const {setNodeRef, isOver} = useDroppable({
    id: dateStr,
  });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`space-y-3 min-h-[400px] rounded-2xl p-2 transition-colors ${
        isOver ? 'bg-blue-100 ring-2 ring-blue-300' : 
        isToday ? 'bg-blue-50/50' : ''
      }`}
    >
      {children}
      <button 
        onClick={onAddRoute}
        className="w-full py-2 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-1"
      >
        <Plus size={14} /> Nova Rota
      </button>
    </div>
  );
};

const RoutesView: React.FC = () => {
  const { settings } = useBranding();
  
  const [activeTab, setActiveTab] = useState<'planner' | 'editor' | 'templates' | 'rules'>('planner');
  const [isAdmin, setIsAdmin] = useState(false);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [supermarkets, setSupermarkets] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // Filters
  const [filterPromoterId, setFilterPromoterId] = useState<string>('');
  const [filterSupervisorId, setFilterSupervisorId] = useState<string>('');
  const [filterGroupId, setFilterGroupId] = useState<string>('');
  const [filterSupermarketId, setFilterSupermarketId] = useState<string>('');

  // Editor State
  const [selectedPromoters, setSelectedPromoters] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [routeItems, setRouteItems] = useState<any[]>([]);
  const [routeStatus, setRouteStatus] = useState<string>('DRAFT');
  const [loading, setLoading] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  // Search States
  const [promoterSearch, setPromoterSearch] = useState('');
  const [supermarketSearch, setSupermarketSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Product Selection Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [currentRouteItemIndex, setCurrentRouteItemIndex] = useState<number | null>(null);
  const [tempSelectedProducts, setTempSelectedProducts] = useState<string[]>([]);
  const [tempProductChecklists, setTempProductChecklists] = useState<Record<string, string>>({});
  const [selectedClientForModal, setSelectedClientForModal] = useState<string | null>(null);

  // Planner State
  const [weekRoutes, setWeekRoutes] = useState<any[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(new Date());

  // Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([]); // Added for Checklist Templates
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Duplicate State
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [routeToDuplicate, setRouteToDuplicate] = useState<any>(null);
  const [duplicateTargetDates, setDuplicateTargetDates] = useState<string[]>([]);
  const [currentDateInput, setCurrentDateInput] = useState('');

  // Promoter Management State
  const [managingPromotersRoute, setManagingPromotersRoute] = useState<any>(null);
  const [managedPromoterIds, setManagedPromoterIds] = useState<string[]>([]);

  // Rules State
  const [rules, setRules] = useState<any[]>([]);
  const [newRule, setNewRule] = useState({ name: '', description: '', value: '' });

  useEffect(() => {
    checkAdmin();
    fetchData();
    fetchRoutesForWeek();
  }, []);

  const checkAdmin = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const role = decoded.role?.toLowerCase() || '';
        setIsAdmin(['admin', 'manager', 'superadmin', 'administrador do sistema', 'supervisor de operações'].includes(role));
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    fetchRoutesForWeek();
  }, [weekStart]);

  const fetchData = async () => {
    try {
      const [employeesRes, supermarketsRes, productsRes, templatesRes, groupsRes, checklistsRes] = await Promise.all([
        api.get('/employees'),
        api.get('/supermarkets'),
        api.get('/products'),
        api.get('/routes/templates/all'),
        api.get('/supermarket-groups'),
        api.get('/checklists')
      ]);
      
      const promotersList = employeesRes.data.filter((e: any) => 
        e.role && (e.role.name.toLowerCase() === 'promotor' || e.role.name.toLowerCase() === 'promoter')
      );
      
      const formattedPromoters = promotersList.map((p: any) => ({
        ...p,
        name: p.fullName || p.name || 'Sem Nome'
      }));

      setPromoters(formattedPromoters);
      setAllEmployees(employeesRes.data);
      setSupermarkets(supermarketsRes.data);
      setProducts(productsRes.data);
      setTemplates(templatesRes.data);
      setGroups(groupsRes.data);
      setChecklistTemplates(checklistsRes.data);
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

  const handleUpdateItemTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const newItems = [...routeItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setRouteItems(newItems);
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
    const newItem = { ...newItems[index], [field]: value };

    // Check for time conflict if time fields are changing
    if ((field === 'startTime' || field === 'estimatedDuration') && newItem.startTime && newItem.estimatedDuration) {
       const newStart = parseInt(newItem.startTime.split(':')[0]) * 60 + parseInt(newItem.startTime.split(':')[1]);
       const newEnd = newStart + parseInt(newItem.estimatedDuration);

       let hasConflict = false;
       for (let i = 0; i < routeItems.length; i++) {
         if (i === index) continue; // Skip self
         const item = routeItems[i];
         if (!item.startTime || !item.estimatedDuration) continue;

         const itemStart = parseInt(item.startTime.split(':')[0]) * 60 + parseInt(item.startTime.split(':')[1]);
         const itemEnd = itemStart + parseInt(item.estimatedDuration);

         // Check overlap: (StartA < EndB) and (EndA > StartB)
         if (newStart < itemEnd && newEnd > itemStart) {
           hasConflict = true;
           break;
         }
       }

       if (hasConflict) {
         if (!window.confirm('Existe um conflito de horário com outro ponto nesta rota. Deseja manter este horário mesmo assim?')) {
           return; // Cancel update
         }
       }
    }

    newItems[index] = newItem;
    setRouteItems(newItems);
  };

  const handleOpenProductModal = (index: number) => {
    setCurrentRouteItemIndex(index);
    const item = routeItems[index];
    setTempSelectedProducts(item.productIds || []);
    
    const checklists: Record<string, string> = {};
    
    // Initialize from existing route configuration if available
    if (item.products) {
      item.products.forEach((p: any) => {
        if (p.checklistTemplateId) {
          checklists[p.productId] = p.checklistTemplateId;
        }
      });
    }

    // For selected products that don't have a specific route checklist, 
    // we can try to find their default checklist to show in UI (optional)
    // But for now, let's just show what's explicitly set for the route.
    
    setTempProductChecklists(checklists);
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
      
      // Save detailed product structure with checklist selection
      newItems[currentRouteItemIndex].products = tempSelectedProducts.map(productId => ({
        productId,
        checklistTemplateId: tempProductChecklists[productId] || undefined
      }));

      setRouteItems(newItems);
      setShowProductModal(false);
      setCurrentRouteItemIndex(null);
    }
  };

  const handleDeleteRoute = async () => {
    if (!editingRouteId) return;
    
    // Check if route can be deleted (e.g. not COMPLETED)
    if (!isAdmin && (routeStatus === 'COMPLETED' || routeStatus === 'IN_PROGRESS')) {
        alert('Não é possível excluir uma rota que já foi iniciada ou concluída.');
        return;
    }

    if (!window.confirm('Tem certeza que deseja excluir esta rota? Esta ação não pode ser desfeita.')) return;
    
    setLoading(true);
    try {
      await api.delete(`/routes/${editingRouteId}`);
      alert('Rota excluída com sucesso!');
      fetchRoutesForWeek();
      setActiveTab('planner');
      setRouteItems([]);
      setEditingRouteId(null);
      setRouteStatus('DRAFT');
    } catch (error: any) {
      console.error('Error deleting route:', error);
      alert('Erro ao excluir rota.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoute = async (status: 'DRAFT' | 'CONFIRMED' | 'COMPLETED' = 'DRAFT') => {
    if (selectedPromoters.length === 0 || !selectedDate || routeItems.length === 0) {
      alert('Selecione pelo menos um promotor, uma data e adicione pontos de venda.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        promoterIds: selectedPromoters,
        promoterId: selectedPromoters[0],
        date: selectedDate,
        status: status,
        items: routeItems.map((item, index) => ({
          supermarketId: item.supermarketId,
          order: index + 1,
          startTime: item.startTime,
          endTime: item.endTime,
          estimatedDuration: item.estimatedDuration ? parseInt(item.estimatedDuration) : undefined,
          productIds: item.productIds || [],
          products: item.products || item.productIds?.map((id: string) => ({ productId: id })) || []
        }))
      };

      if (editingRouteId) {
        await api.patch(`/routes/${editingRouteId}`, payload);
      } else {
        await api.post('/routes', payload);
      }
      
      alert(`Rota ${status === 'CONFIRMED' ? 'confirmada' : 'salva'} com sucesso!`);
      fetchRoutesForWeek();
      setActiveTab('planner');
      // Clear form
      setRouteItems([]);
      setEditingRouteId(null);
    } catch (error: any) {
      console.error('Error saving route:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Erro desconhecido';
      alert(`Erro ao salvar rota: ${errorMsg}`);
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
        promoterIds: selectedPromoters, // Optional for template
        promoterId: selectedPromoters[0] || null, // Optional for template
        date: selectedDate, // Optional/Dummy
        items: routeItems.map((item, index) => ({
          supermarketId: item.supermarketId,
          order: index + 1,
          startTime: item.startTime,
          estimatedDuration: parseInt(item.estimatedDuration),
          productIds: item.productIds || [],
          products: item.products || item.productIds?.map((id: string) => ({ productId: id })) || []
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
      endTime: item.endTime || '',
      estimatedDuration: item.estimatedDuration || 30,
      productIds: item.products?.map((p: any) => p.productId) || [],
      products: item.products?.map((p: any) => ({
        productId: p.productId,
        checklistTemplateId: p.checklistTemplateId
      })) || []
    }));
    setRouteItems(items);
    setActiveTab('editor');
  };

  const handleDuplicateRoute = async () => {
    if (!routeToDuplicate || duplicateTargetDates.length === 0) return;
    try {
      await Promise.all(duplicateTargetDates.map(date => 
        api.post(`/routes/${routeToDuplicate.id}/duplicate`, { date })
      ));
      
      alert('Rota duplicada com sucesso!');
      setShowDuplicateModal(false);
      setRouteToDuplicate(null);
      setDuplicateTargetDates([]);
      setCurrentDateInput('');
      fetchRoutesForWeek();
    } catch (error) {
      console.error('Error duplicating route:', error);
      alert('Erro ao duplicar rota.');
    }
  };

  const handleAddDate = () => {
    if (!currentDateInput) return;
    if (duplicateTargetDates.includes(currentDateInput)) {
      alert('Data já adicionada');
      return;
    }
    setDuplicateTargetDates([...duplicateTargetDates, currentDateInput]);
    setCurrentDateInput('');
  };

  const handleRemoveDate = (dateToRemove: string) => {
    setDuplicateTargetDates(duplicateTargetDates.filter(d => d !== dateToRemove));
  };

  const handleManagePromoters = (route: any) => {
    setManagingPromotersRoute(route);
    if (route.promoters && route.promoters.length > 0) {
        setManagedPromoterIds(route.promoters.map((p: any) => p.id));
    } else if (route.promoterId) {
        setManagedPromoterIds([route.promoterId]);
    } else if (route.promoter?.id) {
        setManagedPromoterIds([route.promoter.id]);
    } else {
        setManagedPromoterIds([]);
    }
  };

  const handleSaveManagedPromoters = async () => {
    if (!managingPromotersRoute) return;
    setLoading(true);
    try {
        await api.patch(`/routes/${managingPromotersRoute.id}`, {
            promoterIds: managedPromoterIds
        });
        alert('Promotores atualizados com sucesso!');
        setManagingPromotersRoute(null);
        fetchRoutesForWeek();
    } catch (error) {
        console.error('Error updating promoters:', error);
        alert('Erro ao atualizar promotores.');
    } finally {
        setLoading(false);
    }
  };

  const handleToggleManagedPromoter = (id: string) => {
    setManagedPromoterIds(prev => {
        if (prev.includes(id)) {
            return prev.filter(pId => pId !== id);
        } else {
            return [...prev, id];
        }
    });
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
    return weekRoutes.filter(r => {
      const matchesDate = r.date === dateStr;
      const matchesPromoter = !filterPromoterId || 
        r.promoterId === filterPromoterId || 
        (r.promoters && r.promoters.some((p: any) => p.id === filterPromoterId));
      
      let matchesSupervisor = true;
      if (filterSupervisorId) {
         // Check supervisors of all assigned promoters
         const promotersToCheck = r.promoters && r.promoters.length > 0 
            ? r.promoters.map((p: any) => allEmployees.find(e => e.id === p.id)).filter(Boolean)
            : [allEmployees.find(e => e.id === r.promoterId)].filter(Boolean);
            
         matchesSupervisor = promotersToCheck.some((promoter: any) => 
            promoter && (promoter.supervisorId === filterSupervisorId || (promoter.supervisor && promoter.supervisor.id === filterSupervisorId))
         );
      }

      let matchesGroup = true;
      if (filterGroupId) {
        matchesGroup = r.items?.some((item: any) => 
          item.supermarket?.groupId === filterGroupId || 
          item.supermarket?.group?.id === filterGroupId
        );
      }

      let matchesPDV = true;
      if (filterSupermarketId) {
        matchesPDV = r.items?.some((item: any) => item.supermarket?.id === filterSupermarketId);
      }

      return matchesDate && matchesPromoter && matchesSupervisor && matchesGroup && matchesPDV;
    });
  };

  const handleQuickDelete = async (e: React.MouseEvent, routeId: string) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir esta rota?')) return;
    try {
      await api.delete(`/routes/${routeId}`);
      fetchRoutesForWeek();
    } catch (error) {
      console.error('Error deleting route:', error);
      alert('Erro ao excluir rota.');
    }
  };

  const handleEditRoute = (route: any) => {
    if (route.promoters && route.promoters.length > 0) {
      setSelectedPromoters(route.promoters.map((p: any) => p.id));
    } else if (route.promoterId) {
      setSelectedPromoters([route.promoterId]);
    } else if (route.promoter?.id) {
      setSelectedPromoters([route.promoter.id]);
    } else {
      setSelectedPromoters([]);
    }
    setSelectedDate(route.date.split('T')[0]);
    setRouteStatus(route.status);
    setEditingRouteId(route.id);
    
    // Load items
    const items = route.items.map((item: any) => ({
      supermarketId: item.supermarket.id,
      supermarket: item.supermarket,
      order: item.order,
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      estimatedDuration: item.estimatedDuration || 30,
      productIds: item.products?.map((p: any) => p.productId) || [],
      products: item.products?.map((p: any) => ({
        productId: p.productId,
        checklistTemplateId: p.checklistTemplateId
      })) || []
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

  const pointerSensorOptions = useMemo(() => ({
    activationConstraint: {
      distance: 8,
    },
  }), []);

  const sensors = useSensors(
    useSensor(PointerSensor, pointerSensorOptions),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    // Block reordering if route is started/completed and not admin (or always block if that's preferred, but user said admin can edit)
    // Actually, user said "admin pode editar", so we allow if admin.
    if (!isAdmin && (routeStatus === 'COMPLETED' || routeStatus === 'IN_PROGRESS')) {
        return;
    }

    const { active, over } = event;
    if (active.id !== over?.id) {
      setRouteItems((items) => {
        const oldIndex = items.findIndex((item) => item.supermarketId === active.id);
        const newIndex = items.findIndex((item) => item.supermarketId === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEndPlanner = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // active.id is routeId, over.id is dateStr
    const routeId = active.id as string;
    const newDate = over.id as string;

    const route = weekRoutes.find(r => r.id === routeId);
    if (!route || route.date === newDate) return;

    if (route.status === 'COMPLETED' || route.status === 'IN_PROGRESS') {
        alert('Não é possível mover uma rota que já foi iniciada ou concluída.');
        return;
    }

    // Optimistic Update
    const originalRoutes = [...weekRoutes];
    setWeekRoutes(prev => prev.map(r => 
      r.id === routeId ? { ...r, date: newDate } : r
    ));

    try {
      await api.patch(`/routes/${routeId}`, { date: newDate });
    } catch (error) {
      console.error('Error moving route:', error);
      alert('Erro ao mover rota.');
      setWeekRoutes(originalRoutes);
    }
  };

  const handleTogglePromoter = (id: string) => {
    setSelectedPromoters(prev => {
      if (prev.includes(id)) {
        return prev.filter(pId => pId !== id);
      } else {
        return [...prev, id];
      }
    });
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
        <DndContext onDragEnd={handleDragEndPlanner} sensors={sensors}>
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

            <div className="flex flex-wrap gap-4 w-full md:w-auto">
               <select 
                 value={filterGroupId}
                 onChange={(e) => setFilterGroupId(e.target.value)}
                 className="px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-600"
               >
                 <option value="">Todas as Redes</option>
                 {groups.map(g => (
                   <option key={g.id} value={g.id}>{g.name}</option>
                 ))}
               </select>

               <select 
                 value={filterSupermarketId}
                 onChange={(e) => setFilterSupermarketId(e.target.value)}
                 className="px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-600"
               >
                 <option value="">Todos os PDVs</option>
                 {supermarkets
                   .filter(s => !filterGroupId || s.groupId === filterGroupId || s.group?.id === filterGroupId)
                   .map(s => (
                   <option key={s.id} value={s.id}>{s.fantasyName}</option>
                 ))}
               </select>

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
                   .filter(e => 
                     e.role && (
                       e.role.name.toLowerCase().includes('supervisor') ||
                       e.role.name.toLowerCase().includes('coordenador') ||
                       e.role.name.toLowerCase().includes('gerente')
                     )
                   )
                   .map(s => (
                     <option key={s.id} value={s.id}>{s.fullName || s.name}</option>
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
                <DroppableDayColumn 
                    key={dateStr} 
                    dateStr={dateStr} 
                    isToday={isToday}
                    onAddRoute={() => {
                        setSelectedDate(dateStr);
                        setRouteItems([]);
                        setEditingRouteId(null);
                        setRouteStatus('DRAFT');
                        setActiveTab('editor');
                    }}
                >
                  <div className="text-center mb-4">
                    <p className="text-xs font-black text-slate-400 uppercase">{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                    <p className={`text-xl font-black ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>{day.getDate()}</p>
                  </div>

                  {dayRoutes.map(route => (
                    <DraggableRouteCard 
                        key={route.id} 
                        route={route} 
                        onDoubleClick={() => handleEditRoute(route)}
                        onDelete={(e: any, id: string) => handleQuickDelete(e, id)}
                        onManagePromoters={handleManagePromoters}
                        onDuplicate={(r: any) => {
                           setRouteToDuplicate(r);
                           setShowDuplicateModal(true);
                           setDuplicateTargetDates([]);
                        }}
                    />
                  ))}
                </DroppableDayColumn>
              );
            })}
          </div>
        </div>
        </DndContext>
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
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  1. Selecione os Promotores *
                </label>
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Buscar promotor..."
                    value={promoterSearch}
                    onChange={(e) => setPromoterSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="h-64 overflow-y-auto space-y-2 pr-2">
                  {promoters
                    .filter(p => p.name.toLowerCase().includes(promoterSearch.toLowerCase()))
                    .map(promoter => {
                      const isSelected = selectedPromoters.includes(promoter.id);
                      return (
                        <button 
                          key={promoter.id}
                          onClick={() => handleTogglePromoter(promoter.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                              : 'bg-white border border-slate-100 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {promoter.name.charAt(0)}
                          </div>
                          <div className="text-left">
                            <p className="font-bold">{promoter.name}</p>
                            <p className={`text-xs ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                              {promoter.email}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="ml-auto">
                              <CheckCircle size={20} className="text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  {promoters.filter(p => p.name.toLowerCase().includes(promoterSearch.toLowerCase())).length === 0 && (
                     <div className="text-center py-4 text-slate-400 text-sm">Nenhum promotor encontrado</div>
                  )}
                </div>
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
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  2. Adicionar Supermercados *
                </label>
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Buscar supermercado..."
                    value={supermarketSearch}
                    onChange={(e) => setSupermarketSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="h-64 overflow-y-auto space-y-2 pr-2">
                  {supermarkets
                    .filter(s => 
                      s.fantasyName.toLowerCase().includes(supermarketSearch.toLowerCase()) ||
                      s.city.toLowerCase().includes(supermarketSearch.toLowerCase())
                    )
                    .map(s => (
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
                  {supermarkets.filter(s => 
                      s.fantasyName.toLowerCase().includes(supermarketSearch.toLowerCase()) ||
                      s.city.toLowerCase().includes(supermarketSearch.toLowerCase())
                    ).length === 0 && (
                     <div className="text-center py-4 text-slate-400 text-sm">Nenhum supermercado encontrado</div>
                  )}
                </div>
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
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={routeItems.map(i => i.supermarketId)}
                      strategy={verticalListSortingStrategy}
                    >
                      {routeItems.map((item, index) => (
                        <SortableRouteItem
                          key={item.supermarketId}
                          id={item.supermarketId}
                          item={item}
                          index={index}
                          onRemove={handleRemoveItem}
                          onUpdate={handleUpdateItem}
                          onOpenProducts={handleOpenProductModal}
                          products={products}
                          disabled={!isAdmin && (routeStatus === 'COMPLETED' || routeStatus === 'IN_PROGRESS')}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              <div className="flex gap-4 mt-8 pt-8 border-t border-slate-200">
                {editingRouteId && (
                    <button 
                      onClick={handleDeleteRoute}
                      disabled={loading || (!isAdmin && (routeStatus === 'COMPLETED' || routeStatus === 'IN_PROGRESS'))}
                      className="px-6 py-4 bg-red-50 border border-red-100 text-red-600 rounded-xl font-black shadow-sm hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      title="Excluir Rota"
                    >
                      <Trash2 size={20} />
                    </button>
                )}
                <button 
                  onClick={() => handleSaveRoute('DRAFT')}
                  disabled={loading || (!isAdmin && (routeStatus === 'COMPLETED' || routeStatus === 'IN_PROGRESS'))}
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-black shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  {routeStatus === 'CONFIRMED' || routeStatus === 'COMPLETED' ? 'Reverter para Rascunho' : 'Salvar Rascunho'}
                </button>
                <button 
                  onClick={() => handleSaveRoute(routeStatus === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED')}
                  disabled={loading || (!isAdmin && (routeStatus === 'COMPLETED' || routeStatus === 'IN_PROGRESS'))}
                  className="flex-1 py-4 text-white rounded-xl font-black shadow-lg hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  <Check size={20} /> {routeStatus === 'CONFIRMED' || routeStatus === 'COMPLETED' ? 'Salvar Alterações' : 'Confirmar Rota'}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[70vh] flex flex-col p-4 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedClientForModal ? (
                  currentRouteItemIndex !== null && routeItems[currentRouteItemIndex] ? (
                    <span>
                      Selecionar Produtos <span className="text-slate-400 text-sm font-normal mx-2">|</span> 
                      {routeItems[currentRouteItemIndex].supermarket.fantasyName}
                      {routeItems[currentRouteItemIndex].supermarket.group && (
                        <span className="ml-2 text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs uppercase tracking-wider">
                          {routeItems[currentRouteItemIndex].supermarket.group.name}
                        </span>
                      )}
                    </span>
                  ) : 'Selecionar Produtos'
                ) : 'Selecionar Cliente'}
              </h3>
              <button onClick={() => {
                setShowProductModal(false);
                setSelectedClientForModal(null);
              }} className="text-slate-400 hover:text-slate-600">
                <Settings size={20} className="rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-4">
              {!selectedClientForModal ? (
                // Step 1: Select Client
                <div className="space-y-2">
                   <div className="mb-2 sticky top-0 bg-white z-10 pt-1 pb-2">
                     <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input
                         type="text"
                         placeholder="Buscar cliente..."
                         value={clientSearch}
                         onChange={(e) => setClientSearch(e.target.value)}
                         className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                       />
                     </div>
                   </div>
                   {(() => {
                      const currentSupermarket = currentRouteItemIndex !== null ? routeItems[currentRouteItemIndex].supermarket : null;
                      
                      // Filter products based on group restrictions
                      const allowedProducts = products.filter(p => {
                          if (p.supermarketGroups && p.supermarketGroups.length > 0) {
                              if (!currentSupermarket?.group) return false;
                              return p.supermarketGroups.some((g: any) => g.id === currentSupermarket.group.id);
                          }
                          return true;
                      });

                      // Use supermarket clients if available, otherwise fallback to all clients from ALLOWED products
                      const availableClients = (currentSupermarket?.clients && currentSupermarket.clients.length > 0)
                        ? currentSupermarket.clients
                        : Array.from(new Set(allowedProducts.map(p => p.client?.id).filter(Boolean))).map(id => ({ id }));
                        
                      // Filter out clients that don't have any products in the allowed list
                      const clientsWithProducts = availableClients.filter((c: any) => 
                        allowedProducts.some(p => p.client?.id === c.id)
                      );
                      
                      // Remove duplicates just in case
                      const uniqueClients = Array.from(new Set(clientsWithProducts.map((c: any) => c.id)))
                        .map(id => {
                            // Find full client data either from supermarket.clients or from product.client
                            const fromSup = currentSupermarket?.clients?.find((c: any) => c.id === id);
                            const fromProd = allowedProducts.find(p => p.client?.id === id)?.client;
                            // Prioritize the client object from supermarket relation, then from product
                            return fromSup || fromProd;
                        })
                        .filter(Boolean)
                        .filter((client: any) => {
                           const name = client.nomeFantasia || client.fantasyName || client.razaoSocial || client.nome || '';
                           return name.toLowerCase().includes(clientSearch.toLowerCase());
                        });

                      if (uniqueClients.length === 0) {
                        return <div className="text-center py-4 text-slate-400 text-sm">Nenhum cliente encontrado</div>;
                      }

                      return uniqueClients.map((client: any) => {
                        const clientId = client.id;
                        const clientProducts = allowedProducts.filter(p => p.client?.id === clientId);
                        const selectedCount = clientProducts.filter(p => tempSelectedProducts.includes(p.id)).length;
                        
                        return (
                          <button
                            key={clientId}
                            onClick={() => setSelectedClientForModal(clientId)}
                            className="w-full p-3 rounded-xl border border-slate-100 hover:bg-slate-50 flex items-center justify-between group text-left transition-all"
                          >
                            <div>
                              <p className="font-bold text-slate-800">{client.nomeFantasia || client.fantasyName || client.razaoSocial || client.nome || 'Cliente sem Nome'}</p>
                              <p className="text-xs text-slate-500">{clientProducts.length} produtos disponíveis</p>
                            </div>
                            {selectedCount > 0 && (
                              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                                {selectedCount} selecionados
                              </span>
                            )}
                          </button>
                        );
                      });
                   })()}
                </div>
              ) : (
                // Step 2: Select Products for selected client
                <div className="space-y-2">
                   <div className="flex flex-col gap-2 sticky top-0 bg-white z-10 pt-1 pb-2">
                     <button 
                       onClick={() => setSelectedClientForModal(null)}
                       className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 self-start"
                     >
                       ← Voltar para Clientes
                     </button>
                     <div className="relative w-full">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input
                         type="text"
                         placeholder="Buscar produto (Nome ou SKU)..."
                         value={productSearch}
                         onChange={(e) => setProductSearch(e.target.value)}
                         className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                       />
                     </div>
                   </div>
                   
                   {Object.entries(products
                     .filter(p => p.client?.id === selectedClientForModal)
                     .filter(p => {
                        // Search Filter
                        const search = productSearch.toLowerCase();
                        const matchesSearch = p.name.toLowerCase().includes(search) || (p.sku && p.sku.toLowerCase().includes(search));
                        if (!matchesSearch) return false;

                        // Supermarket Group Filter
                        const currentSupermarket = currentRouteItemIndex !== null && routeItems[currentRouteItemIndex] 
                            ? routeItems[currentRouteItemIndex].supermarket 
                            : null;

                        if (p.supermarketGroups && p.supermarketGroups.length > 0) {
                            // If product has restrictions, supermarket MUST belong to one of the groups
                            if (!currentSupermarket || !currentSupermarket.group) {
                                return false; // Supermarket has no group -> Restricted product hidden
                            }
                            const isAllowed = p.supermarketGroups.some((g: any) => g.id === currentSupermarket.group.id);
                            if (!isAllowed) {
                                return false; // Product group doesn't match supermarket group -> Hidden
                            }
                        }
                        
                        return true;
                     })
                     .reduce((acc, product) => {
                        const categoryName = product.categoryRef?.name || product.category || 'Sem Categoria';
                        if (!acc[categoryName]) acc[categoryName] = [];
                        acc[categoryName].push(product);
                        return acc;
                     }, {} as Record<string, any[]>)
                   ).sort((a, b) => a[0].localeCompare(b[0])).map(([categoryName, categoryProducts]) => (
                     <div key={categoryName}>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1 sticky top-0 bg-white z-10 py-1 border-b border-slate-50">
                          {categoryName} <span className="text-slate-300 font-normal">({categoryProducts.length})</span>
                        </h4>
                        <div className="space-y-2 mb-4">
                           {categoryProducts.map(product => (
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

                        {tempSelectedProducts.includes(product.id) && (
                          <div className="ml-4" onClick={(e) => e.stopPropagation()}>
                             <select
                               value={tempProductChecklists[product.id] || ''}
                               onChange={(e) => setTempProductChecklists({
                                 ...tempProductChecklists,
                                 [product.id]: e.target.value
                               })}
                               className="text-xs border border-slate-200 rounded p-1 max-w-[150px] outline-none focus:border-blue-400 bg-white"
                             >
                               <option value="">
                                 {product.checklistTemplate 
                                   ? `Padrão (${product.checklistTemplate.name})` 
                                   : 'Checklist Padrão'}
                               </option>
                               {checklistTemplates.map(t => (
                                 <option key={t.id} value={t.id}>{t.name}</option>
                               ))}
                             </select>
                          </div>
                        )}
                      </div>
                        ))}
                     </div>
                  </div>
               ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button onClick={() => {
                setShowProductModal(false);
                setSelectedClientForModal(null);
              }} className="px-4 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100 text-sm">Cancelar</button>
              <button 
                onClick={handleSaveProductSelection}
                className="px-4 py-2 rounded-lg font-bold text-white shadow-lg text-sm"
                style={{ backgroundColor: settings.primaryColor }}
              >
                Confirmar ({tempSelectedProducts.length})
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

      {/* Manage Promoters Modal */}
      {managingPromotersRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Gerenciar Promotores</h3>
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Adicione ou remova promotores para esta rota em execução.
              </p>
              
              <div className="h-64 overflow-y-auto space-y-2 pr-2 border border-slate-100 rounded-xl p-2">
                  {promoters
                    .map(promoter => {
                      const isSelected = managedPromoterIds.includes(promoter.id);
                      return (
                        <button 
                          key={promoter.id}
                          onClick={() => handleToggleManagedPromoter(promoter.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                              : 'bg-white border border-slate-100 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {promoter.name.charAt(0)}
                          </div>
                          <div className="text-left">
                            <p className="font-bold">{promoter.name}</p>
                            <p className={`text-xs ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                              {promoter.email}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="ml-auto">
                              <CheckCircle size={20} className="text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button onClick={() => {
                  setManagingPromotersRoute(null);
                  setManagedPromoterIds([]);
                }} className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
                <button 
                  onClick={handleSaveManagedPromoters}
                  className="px-6 py-2 rounded-lg font-bold text-white shadow-lg"
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
                <label className="text-xs font-bold text-slate-500 block mb-2">Adicionar Dias</label>
                
                <div className="flex gap-2 mb-4">
                  <input 
                    type="date" 
                    value={currentDateInput}
                    onChange={e => setCurrentDateInput(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold"
                  />
                  <button 
                    onClick={handleAddDate}
                    disabled={!currentDateInput}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 disabled:opacity-50"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <button 
                    onClick={() => {
                        if (!routeToDuplicate) return;
                        const sourceDate = new Date(routeToDuplicate.date);
                        const dates = [];
                        let current = new Date(sourceDate);
                        // Generate for next 4 weeks
                        for (let i = 0; i < 4; i++) {
                            current.setDate(current.getDate() + 7);
                            dates.push(current.toISOString().split('T')[0]);
                        }
                        const newDates = dates.filter(d => !duplicateTargetDates.includes(d));
                        setDuplicateTargetDates([...duplicateTargetDates, ...newDates]);
                    }}
                    className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 flex items-center justify-center gap-2 border border-indigo-100 mb-2"
                >
                    <Copy size={16} />
                    Repetir nas Próximas 4 Semanas
                </button>
              </div>

              {duplicateTargetDates.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                  <p className="text-xs font-bold text-slate-400 mb-2">Dias Selecionados ({duplicateTargetDates.length})</p>
                  {duplicateTargetDates.map(date => (
                    <div key={date} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                      <span className="text-sm font-bold text-slate-700">
                        {new Date(date + 'T12:00:00').toLocaleDateString()}
                      </span>
                      <button 
                        onClick={() => handleRemoveDate(date)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button onClick={() => {
                  setShowDuplicateModal(false);
                  setRouteToDuplicate(null);
                  setDuplicateTargetDates([]);
                  setCurrentDateInput('');
                }} className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
                <button 
                  onClick={handleDuplicateRoute}
                  disabled={duplicateTargetDates.length === 0}
                  className="px-6 py-2 rounded-lg font-bold text-white shadow-lg disabled:opacity-50"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  Duplicar ({duplicateTargetDates.length})
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