import React, { useState, useEffect, useMemo } from 'react';
import { useBranding } from '../context/BrandingContext';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import { 
  BarChart2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  Filter, 
  Download, 
  Users,
  X,
  MapPin,
  Clock,
  User,
  Image as ImageIcon,
  Upload,
  Camera,
  Save,
  Edit,
  Shield,
  Monitor,
  LayoutGrid,
  List,
  Store,
  Package
} from 'lucide-react';
import { jwtDecode } from "jwt-decode";
import api from '../api/client';
import { getImageUrl } from '../utils/image';
import { processImage } from '../utils/image-processor';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';

interface RouteReportItem {
  id: string;
  date: string;
  status: string;
  promoterId?: string;
  promoter: {
    id: string;
    fullName: string;
    supervisor?: {
      id: string;
      fullName: string;
    };
  };
  items: Array<{
    id: string;
    status: string;
    checkInTime?: string;
    checkOutTime?: string;
    manualEntryBy?: string;
    manualEntryAt?: string;
    supermarket: {
      id: string;
      fantasyName: string;
      city?: string;
      state?: string;
    };
    products: Array<{
      id: string;
      isStockout: boolean;
      checked: boolean;
      observation?: string;
      photos?: string[];
      checkInTime?: string;
      checkOutTime?: string;
      product: {
        id: string;
        name: string;
        sku?: string;
        brand?: {
          name: string;
        };
      };
      validityDate?: string;
      stockCount?: number;
    }>;
  }>;
}

const RoutesReportView: React.FC = () => {
  const { settings } = useBranding();
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<RouteReportItem[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });
  const [selectedRoute, setSelectedRoute] = useState<RouteReportItem | null>(null);

  // Filter State
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedPromoter, setSelectedPromoter] = useState('');
  const [selectedClient, setSelectedClient] = useState(''); // Brand
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedPDV, setSelectedPDV] = useState('');
  const [onlyRuptures, setOnlyRuptures] = useState(false);
  const [validityStart, setValidityStart] = useState('');
  const [validityEnd, setValidityEnd] = useState('');
  
  // View Mode
  const [groupBy, setGroupBy] = useState<'route' | 'pdv' | 'validity'>('route');
  
  // Computed stats
  const [stats, setStats] = useState({
    total: 0,
    executed: 0,
    notExecuted: 0,
    withIssues: 0,
    nearExpiry: 0
  });

  const [supervisorData, setSupervisorData] = useState<any[]>([]);
  const [promoterData, setPromoterData] = useState<any[]>([]);

  // Manual Entry State
  const [isAdmin, setIsAdmin] = useState(false);
  const [promotersList, setPromotersList] = useState<any[]>([]);
  const [manualForm, setManualForm] = useState<{
    itemId: string;
    checkInTime: string;
    checkOutTime: string;
    promoterId: string;
    observation: string;
    products: { 
      productId: string; 
      checked: boolean; 
      isStockout: boolean; 
      observation: string; 
      photos: string[];
      productName: string;
    }[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Photo Processing State
  const [photoMeta, setPhotoMeta] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    promoterName: '',
    pdvName: ''
  });
  const [processing, setProcessing] = useState(false);

  const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAdmin();
    fetchRoutes();
  }, [startDate, endDate]);

  // Extract unique values for filters
  const uniqueOptions = useMemo(() => {
    const supervisors = new Set<string>();
    const promoters = new Set<string>();
    const clients = new Set<string>();
    const products = new Set<string>();
    const pdvs = new Set<string>();

    routes.forEach(r => {
      if (r.promoter.supervisor?.fullName) supervisors.add(r.promoter.supervisor.fullName);
      if (r.promoter.fullName) promoters.add(r.promoter.fullName);
      
      r.items.forEach(i => {
        if (i.supermarket.fantasyName) pdvs.add(i.supermarket.fantasyName);
        i.products.forEach(p => {
          if (p.product.name) products.add(p.product.name);
          if (p.product.brand?.name) clients.add(p.product.brand.name);
        });
      });
    });

    return {
      supervisors: Array.from(supervisors).sort(),
      promoters: Array.from(promoters).sort(),
      clients: Array.from(clients).sort(),
      products: Array.from(products).sort(),
      pdvs: Array.from(pdvs).sort()
    };
  }, [routes]);

  // Filter Logic
  const filteredRoutes = useMemo(() => {
    return routes.filter(r => {
      // Route-level filters
      if (selectedSupervisor && r.promoter.supervisor?.fullName !== selectedSupervisor) return false;
      if (selectedPromoter && r.promoter.fullName !== selectedPromoter) return false;
      
      // Item-level filters (Check if ANY item matches)
      // If a filter is set, the route must contain at least one item that satisfies the criteria
      // However, for correct reporting, we might want to filter the items inside the route too?
      // For now, we'll just filter which Routes show up.
      
      // Filter by Ruptures
      if (onlyRuptures) {
        const hasRuptures = r.items.some(i => i.products.some(p => p.isStockout));
        if (!hasRuptures) return false;
      }

      const hasPDV = !selectedPDV || r.items.some(i => i.supermarket.fantasyName === selectedPDV);
      if (!hasPDV) return false;

      if (selectedProduct || selectedClient) {
        const hasProductOrClient = r.items.some(i => 
          i.products.some(p => 
            (!selectedProduct || p.product.name === selectedProduct) &&
            (!selectedClient || p.product.brand?.name === selectedClient)
          )
        );
        if (!hasProductOrClient) return false;
      }
      
      return true;
    });
  }, [routes, selectedSupervisor, selectedPromoter, selectedClient, selectedProduct, selectedPDV, onlyRuptures]);

  // Recalculate Stats when filteredRoutes changes
  useEffect(() => {
    processData(filteredRoutes);
  }, [filteredRoutes]);

  // Group By PDV Logic
  const pdvReport = useMemo(() => {
    if (groupBy !== 'pdv') return [];

    const pdvMap = new Map<string, {
      id: string;
      name: string;
      city: string;
      visits: number;
      productsChecked: number;
      ruptures: number;
      promoters: Set<string>;
      supervisors: Set<string>;
      items: any[];
    }>();

    filteredRoutes.forEach(r => {
      r.items.forEach(i => {
        // Apply item-level filters again for aggregation correctness
        if (selectedPDV && i.supermarket.fantasyName !== selectedPDV) return;
        
        // Filter by Ruptures (Item Level)
        if (onlyRuptures) {
          const hasRuptures = i.products.some(p => p.isStockout);
          if (!hasRuptures) return;
        }

        const hasMatchingProduct = i.products.some(p => 
          (!selectedProduct || p.product.name === selectedProduct) &&
          (!selectedClient || p.product.brand?.name === selectedClient)
        );
        if (!hasMatchingProduct) return;

        // Key by Supermarket ID
        const key = i.supermarket.id;
        if (!pdvMap.has(key)) {
          pdvMap.set(key, {
            id: i.supermarket.id,
            name: i.supermarket.fantasyName,
            city: `${i.supermarket.city || ''} - ${i.supermarket.state || ''}`,
            visits: 0,
            productsChecked: 0,
            ruptures: 0,
            promoters: new Set(),
            supervisors: new Set(),
            items: []
          });
        }

        const entry = pdvMap.get(key)!;
        
        // Only count if executed
        const isExecuted = ['CHECKOUT', 'COMPLETED'].includes(i.status);
        if (isExecuted) {
          entry.visits++;
          entry.items.push({ ...i, date: r.date, promoter: r.promoter });
          
          // Count products (respecting filters)
          const relevantProducts = i.products.filter(p => 
            (!selectedProduct || p.product.name === selectedProduct) &&
            (!selectedClient || p.product.brand?.name === selectedClient)
          );
          
          entry.productsChecked += relevantProducts.filter(p => p.checked).length;
          entry.ruptures += relevantProducts.filter(p => p.isStockout).length;
          
          if (r.promoter.fullName) entry.promoters.add(r.promoter.fullName);
          if (r.promoter.supervisor?.fullName) entry.supervisors.add(r.promoter.supervisor.fullName);
        }
      });
    });

    return Array.from(pdvMap.values()).sort((a, b) => b.visits - a.visits);
  }, [filteredRoutes, groupBy, selectedPDV, selectedProduct, selectedClient, onlyRuptures]);

  // Group By Validity (Product focused, grouped by PDV)
  const validityReport = useMemo(() => {
    if (groupBy !== 'validity') return [];

    const pdvMap = new Map<string, {
      id: string;
      name: string;
      items: {
        productName: string;
        brandName: string;
        validityDate?: string;
        checked: boolean;
        checkInTime?: string;
        promoterName: string;
        date: string;
      }[]
    }>();

    filteredRoutes.forEach(r => {
      r.items.forEach(i => {
        // Apply filters
        if (selectedPDV && i.supermarket.fantasyName !== selectedPDV) return;

        i.products.forEach(p => {
            // Apply product/brand filters
            if (selectedProduct && p.product.name !== selectedProduct) return;
            if (selectedClient && p.product.brand?.name !== selectedClient) return;

            // Apply validity filter if set
            if (validityStart || validityEnd) {
                 if (!p.validityDate) return;
                 const vDate = p.validityDate;
                 if (validityStart && vDate < validityStart) return;
                 if (validityEnd && vDate > validityEnd) return;
            }

            // Group by PDV
            const key = i.supermarket.id;
            if (!pdvMap.has(key)) {
                pdvMap.set(key, {
                    id: i.supermarket.id,
                    name: i.supermarket.fantasyName,
                    items: []
                });
            }
            
            pdvMap.get(key)!.items.push({
                productName: p.product.name,
                brandName: p.product.brand?.name || '-',
                validityDate: p.validityDate,
                checked: p.checked,
                checkInTime: p.checkInTime,
                promoterName: r.promoter.fullName || 'N/A',
                date: r.date
            });
        });
      });
    });

    return Array.from(pdvMap.values());
  }, [filteredRoutes, groupBy, selectedPDV, selectedProduct, selectedClient, validityStart, validityEnd]);


  const checkAdmin = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const role = decoded.role?.toLowerCase() || '';
        const admin = ['admin', 'manager', 'superadmin', 'administrador do sistema', 'supervisor de operações'].includes(role);
        setIsAdmin(admin);
        if (admin) fetchPromoters();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const fetchPromoters = async () => {
    try {
      const res = await api.get('/employees');
      setPromotersList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openPhotoModal = (index: number) => {
    setActiveProductIndex(index);
    
    const currentPromoterId = manualForm?.promoterId;
    const currentPromoter = promotersList.find(p => p.id === currentPromoterId);
    
    let pdvName = 'PDV';
    if (selectedRoute) {
        const item = selectedRoute.items.find(i => i.id === manualForm?.itemId);
        if (item) pdvName = item.supermarket.fantasyName;
    }

    // Default to current time, but prefer manualForm.checkInTime if available
    let initialDate = new Date().toISOString().split('T')[0];
    let initialTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (manualForm?.checkInTime) {
        const checkIn = new Date(manualForm.checkInTime);
        if (!isNaN(checkIn.getTime())) {
            initialDate = checkIn.toISOString().split('T')[0];
            const hours = checkIn.getHours().toString().padStart(2, '0');
            const minutes = checkIn.getMinutes().toString().padStart(2, '0');
            initialTime = `${hours}:${minutes}`;
        }
    }

    setPhotoMeta({
        date: initialDate,
        time: initialTime,
        promoterName: currentPromoter?.fullName || currentPromoter?.name || '',
        pdvName: pdvName
    });

    setShowPhotoModal(true);
  };

  const handlePhotoModalConfirm = () => {
    setShowPhotoModal(false);
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || activeProductIndex === null) return;
    const files = Array.from(fileList);
    processAndUploadPhotos(files, activeProductIndex);
  };

  const processAndUploadPhotos = async (files: File[], productIndex: number) => {
    setProcessing(true);
    try {
        const newPhotos: string[] = [];
        
        // Combine Date and Time
        const timestamp = new Date(`${photoMeta.date}T${photoMeta.time}`);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const processed = await processImage(file, {
                supermarketName: photoMeta.pdvName,
                promoterName: photoMeta.promoterName,
                timestamp: timestamp
            });

            const formData = new FormData();
            formData.append('file', processed);

            const res = await api.post('/upload', formData);
            const url = res.data.path || res.data.url;
            newPhotos.push(url);
        }

        if (manualForm) {
            const newProducts = [...manualForm.products];
            newProducts[productIndex].photos = [...(newProducts[productIndex].photos || []), ...newPhotos];
            setManualForm({ ...manualForm, products: newProducts });
        }
    } catch (err) {
        console.error('Processing/Upload failed', err);
        alert('Erro ao processar/enviar foto(s).');
    } finally {
        setProcessing(false);
        setActiveProductIndex(null);
    }
  };

  const openManualEntry = (item: any, routePromoterId: string) => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    const toLocalISO = (date: Date) => {
      const pad = (n: number) => n < 10 ? '0' + n : n;
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const initialCheckIn = item.checkInTime ? new Date(item.checkInTime) : now;
    const initialCheckOut = item.checkOutTime ? new Date(item.checkOutTime) : oneHourLater;

    setManualForm({
      itemId: item.id,
      checkInTime: toLocalISO(initialCheckIn),
      checkOutTime: toLocalISO(initialCheckOut),
      promoterId: routePromoterId,
      observation: item.observation || '',
      products: item.products.map((p: any) => ({
        productId: p.product.id,
        checked: p.checked || false,
        isStockout: p.isStockout || false,
        observation: p.observation || '',
        photos: p.photos || [],
        productName: p.product.name,
        validityDate: p.validityDate || '',
        stockCount: p.stockCount || ''
      }))
    });
  };

  const submitManualEntry = async () => {
    if (!manualForm) return;
    setSubmitting(true);
    try {
      await api.post(`/routes/items/${manualForm.itemId}/manual-execution`, {
        checkInTime: manualForm.checkInTime,
        checkOutTime: manualForm.checkOutTime,
        promoterId: manualForm.promoterId,
        products: manualForm.products
      });
      alert('Lançamento realizado com sucesso!');
      setManualForm(null);
      setSelectedRoute(null);
      fetchRoutes();
    } catch (err) {
      console.error(err);
      alert('Erro ao realizar lançamento manual.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/routes');
      const allRoutes: RouteReportItem[] = res.data;

      const filtered = allRoutes.filter(r => {
        const routeDate = r.date.split('T')[0];
        return routeDate >= startDate && routeDate <= endDate;
      });
      
      setRoutes(filtered);
    } catch (err) {
      console.error('Error fetching routes report:', err);
    } finally {
      setLoading(false);
    }
  };

  const processData = (data: RouteReportItem[]) => {
    let executedCount = 0;
    let issuesCount = 0;
    let nearExpiryCount = 0;
    
    const supervisors: Record<string, { name: string, executed: number, total: number }> = {};
    const promoters: Record<string, { name: string, executed: number, total: number }> = {};

    data.forEach(route => {
      const isExecuted = route.items.some(i => ['CHECKOUT', 'COMPLETED'].includes(i.status));
      if (isExecuted) executedCount++;

      const hasIssues = route.items.some(i => i.products.some(p => p.isStockout));
      if (hasIssues) issuesCount++;

      const hasNearExpiry = route.items.some(i => i.products.some(p => {
        if (!p.validityDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const valDate = new Date(p.validityDate);
        // Fix timezone offset issue for calculation
        const userTimezoneOffset = valDate.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(valDate.getTime() + userTimezoneOffset);
        
        const diffTime = adjustedDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      }));
      if (hasNearExpiry) nearExpiryCount++;

      const supName = route.promoter.supervisor?.fullName || 'Sem Supervisor';
      if (!supervisors[supName]) supervisors[supName] = { name: supName, executed: 0, total: 0 };
      supervisors[supName].total++;
      if (isExecuted) supervisors[supName].executed++;

      const promName = route.promoter.fullName || 'Sem Nome';
      if (!promoters[promName]) promoters[promName] = { name: promName, executed: 0, total: 0 };
      promoters[promName].total++;
      if (isExecuted) promoters[promName].executed++;
    });

    setStats({
      total: data.length,
      executed: executedCount,
      notExecuted: data.length - executedCount,
      withIssues: issuesCount,
      nearExpiry: nearExpiryCount
    });

    setSupervisorData(Object.values(supervisors));
    setPromoterData(Object.values(promoters));
  };

  const getStatusBadge = (route: RouteReportItem) => {
    const isExecuted = route.items.some(i => ['CHECKOUT', 'COMPLETED'].includes(i.status));
    const isInProgress = route.items.some(i => i.checkInTime && !i.checkOutTime);
    const hasIssues = route.items.some(i => i.products.some(p => p.isStockout));

    if (isInProgress) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-yellow-50 text-yellow-600 border border-yellow-200">
          <Clock size={14} />
          Em Visita
        </span>
      );
    }

    if (!isExecuted) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
          <XCircle size={14} />
          Não Executado
        </span>
      );
    }
    
    if (hasIssues) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
          <AlertTriangle size={14} />
          Com Ruptura
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
        <CheckCircle2 size={14} />
        Verificado
      </span>
    );
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diff = endTime - startTime;
    if (diff < 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const calculateTotalRouteDuration = (items: RouteReportItem['items']) => {
    let totalMs = 0;
    
    items.forEach(item => {
      if (item.checkInTime && item.checkOutTime) {
        const start = new Date(item.checkInTime).getTime();
        const end = new Date(item.checkOutTime).getTime();
        if (end > start) {
          totalMs += (end - start);
        }
      }
    });

    if (totalMs === 0) return null;

    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatRouteDate = (dateString: string) => {
    if (!dateString) return '-';
    // Handle ISO string by taking only the date part to avoid timezone issues
    if (dateString.includes('T')) {
      dateString = dateString.split('T')[0];
    }
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleExport = () => {
    if (filteredRoutes.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const csvContent = [];
    const headers = [
      'Data',
      'Promotor',
      'Supervisor',
      'PDV',
      'Cidade',
      'Produto',
      'Marca',
      'Status',
      'Check-in',
      'Check-out',
      'Ruptura',
      'Verificado',
      'Observação'
    ];
    csvContent.push(headers.join(';'));

    filteredRoutes.forEach(route => {
      const date = formatRouteDate(route.date);
      const promoter = route.promoter.fullName;
      const supervisor = route.promoter.supervisor?.fullName || '-';

      route.items.forEach(item => {
        // Apply item level filters if needed
        if (selectedPDV && item.supermarket.fantasyName !== selectedPDV) return;

        const pdv = item.supermarket.fantasyName;
        const city = item.supermarket.city || '';

        item.products.forEach(p => {
          // Apply product level filters
          if (selectedProduct && p.product.name !== selectedProduct) return;
          if (selectedClient && p.product.brand?.name !== selectedClient) return;

          const row = [
            date,
            promoter,
            supervisor,
            pdv,
            city,
            p.product.name,
            p.product.brand?.name || '-',
            item.status,
            item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString('pt-BR') : '-',
            item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString('pt-BR') : '-',
            p.isStockout ? 'Sim' : 'Não',
            p.checked ? 'Sim' : 'Não',
            p.observation || ''
          ];
          
          // Escape fields that might contain semicolons or newlines
          const escapedRow = row.map(field => {
             const str = String(field);
             if (str.includes(';') || str.includes('\n')) {
               return `"${str.replace(/"/g, '""')}"`;
             }
             return str;
          });

          csvContent.push(escapedRow.join(';'));
        });
      });
    });

    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_rotas_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-32">
      <SectionHeader 
        icon={<BarChart2 className="text-blue-600" />}
        title="Relatório de Rotas"
        subtitle="Análise de execução, performance e rupturas"
      />

      {/* Filters & Actions */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Supervisor</label>
              <select 
                value={selectedSupervisor}
                onChange={e => setSelectedSupervisor(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Todos</option>
                {uniqueOptions.supervisors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Promotor</label>
              <select 
                value={selectedPromoter}
                onChange={e => setSelectedPromoter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Todos</option>
                {uniqueOptions.promoters.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Cliente (Marca)</label>
              <select 
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Todos</option>
                {uniqueOptions.clients.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">PDV</label>
              <select 
                value={selectedPDV}
                onChange={e => setSelectedPDV(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Todos</option>
                {uniqueOptions.pdvs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

             <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Produto</label>
              <select 
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Todos</option>
                {uniqueOptions.products.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">De</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Até</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            
            <button
              onClick={() => setOnlyRuptures(!onlyRuptures)}
              className={`w-full px-3 py-2 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 h-[38px] ${
                onlyRuptures 
                  ? 'bg-red-50 border-red-200 text-red-600' 
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle size={16} />
              {onlyRuptures ? 'Com Rupturas' : 'Rupturas'}
            </button>
        </div>
      </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <StatCard 
              icon={<Calendar />}
              label="Total de Rotas"
              value={stats.total.toString()}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard 
              icon={<CheckCircle2 />}
              label="Executadas"
              value={stats.executed.toString()}
              sub={`${((stats.executed / (stats.total || 1)) * 100).toFixed(1)}% do total`}
              color="bg-emerald-50 text-emerald-600"
            />
            <StatCard 
              icon={<XCircle />}
              label="Não Executadas"
              value={stats.notExecuted.toString()}
              color="bg-rose-50 text-rose-600"
            />
            <StatCard 
              icon={<AlertTriangle />}
              label="Com Ruptura"
              value={stats.withIssues.toString()}
              color="bg-amber-50 text-amber-600"
            />
            <StatCard 
              icon={<Clock />}
              label="Vencendo (<30d)"
              value={stats.nearExpiry.toString()}
              color="bg-orange-50 text-orange-600"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2">
                <Users size={20} className="text-slate-400" />
                Execução por Supervisor
              </h3>
              <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supervisorData} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="executed" name="Executadas" fill="#10B981" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="total" name="Total" fill="#E2E8F0" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2">
                <Users size={20} className="text-slate-400" />
                Execução por Promotor
              </h3>
              <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={promoterData.slice(0, 10)} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="executed" name="Executadas" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="total" name="Total" fill="#E2E8F0" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* View Toggle & List */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <h3 className="font-black text-lg text-slate-800">
                  {groupBy === 'route' ? 'Detalhamento das Rotas' : 'Relatório por PDV'}
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setGroupBy('route')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      groupBy === 'route' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <List size={14} />
                    Por Rota
                  </button>
                  <button 
                    onClick={() => setGroupBy('pdv')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      groupBy === 'pdv' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Store size={14} />
                    Por PDV
                  </button>
                  <button 
                    onClick={() => setGroupBy('validity')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      groupBy === 'validity' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Clock size={14} />
                    Validade
                  </button>
                </div>
              </div>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">
                <Download size={16} />
                Exportar CSV
              </button>
            </div>
            
            <div className="overflow-x-auto">
              {groupBy === 'route' ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Data</th>
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Promotor</th>
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Supervisor</th>
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">PDVs</th>
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRoutes.map((route) => (
                      <tr 
                        key={route.id} 
                        onClick={() => setSelectedRoute(route)}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                      >
                        <td className="p-4">
                          <span className="font-bold text-slate-700 text-sm">
                            {formatRouteDate(route.date)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                              {route.promoter.fullName.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-700 text-sm">{route.promoter.fullName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium text-slate-500">
                            {route.promoter.supervisor?.fullName || '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium text-slate-500">
                            {route.items.length} lojas
                          </span>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(route)}
                        </td>
                      </tr>
                    ))}
                    {filteredRoutes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                          Nenhuma rota encontrada para os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : groupBy === 'pdv' ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">PDV</th>
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Localização</th>
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider text-center">Visitas</th>
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider text-center">Prod. Verificados</th>
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider text-center">Rupturas</th>
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Promotores</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pdvReport.map((pdv) => (
                      <tr 
                        key={pdv.id} 
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                              <Store size={14} />
                            </div>
                            <span className="font-bold text-slate-700 text-sm">{pdv.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium text-slate-500">
                            {pdv.city}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg text-xs">
                            {pdv.visits}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-xs">
                            {pdv.productsChecked}
                          </span>
                        </td>
                         <td className="p-4 text-center">
                          {pdv.ruptures > 0 ? (
                            <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg text-xs">
                              {pdv.ruptures}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {Array.from(pdv.promoters).map((prom, i) => (
                              <span key={i} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-100">
                                {prom}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pdvReport.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                          Nenhum dado de PDV encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">PDV</th>
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Produto</th>
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Marca</th>
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Validade</th>
                      <th className="p-4 font-black text-xs text-slate-400 uppercase tracking-wider">Promotor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validityReport.map((pdv) => (
                      <React.Fragment key={pdv.id}>
                        <tr className="bg-slate-50/50">
                          <td colSpan={5} className="p-3 font-bold text-slate-700 border-y border-slate-100">
                             <div className="flex items-center gap-2">
                               <Store size={14} className="text-blue-500" />
                               {pdv.name}
                             </div>
                          </td>
                        </tr>
                        {pdv.items.map((item, idx) => (
                           <tr key={idx} className="hover:bg-slate-50 transition-colors">
                             <td className="p-3 pl-8 text-slate-400 text-xs">
                               -
                             </td>
                             <td className="p-3 font-medium text-slate-700 text-sm">
                               {item.productName}
                             </td>
                             <td className="p-3 text-slate-500 text-sm">
                               {item.brandName}
                             </td>
                             <td className="p-3 text-sm">
                                {item.validityDate ? (() => {
                                     const today = new Date();
                                     today.setHours(0, 0, 0, 0);
                                     const valDate = new Date(item.validityDate);
                                     const userTimezoneOffset = valDate.getTimezoneOffset() * 60000;
                                     const adjustedDate = new Date(valDate.getTime() + userTimezoneOffset);
                                     const diffTime = adjustedDate.getTime() - today.getTime();
                                     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                     
                                     if (diffDays < 0) {
                                       return (
                                         <span className="flex items-center gap-2 text-red-600 font-bold">
                                           <AlertTriangle size={14}/> 
                                           VENCIDO ({adjustedDate.toLocaleDateString('pt-BR')})
                                         </span>
                                       );
                                     }
                                     if (diffDays <= 30) {
                                       return (
                                         <span className="flex items-center gap-2 text-amber-600 font-bold">
                                           <AlertTriangle size={14}/> 
                                           Vence em {diffDays}d ({adjustedDate.toLocaleDateString('pt-BR')})
                                         </span>
                                       );
                                     }
                                     return <span className="text-slate-600">{adjustedDate.toLocaleDateString('pt-BR')}</span>;
                                   })() : <span className="text-slate-300">-</span>}
                             </td>
                             <td className="p-3 text-sm text-slate-500">
                               {item.promoterName}
                               <div className="text-[10px] text-slate-400">
                                 {formatRouteDate(item.date)}
                               </div>
                             </td>
                           </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {validityReport.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                          Nenhum registro de validade encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

      {/* Detail Modal */}
      {selectedRoute && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900">Detalhes da Rota</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {formatRouteDate(selectedRoute.date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User size={14} />
                    Promotor: <strong className="text-slate-700">{selectedRoute.promoter.fullName}</strong>
                  </span>
                  {selectedRoute.promoter.supervisor && (
                    <span className="flex items-center gap-1.5">
                      <Users size={14} />
                    Supervisor: <strong className="text-slate-700">{selectedRoute.promoter.supervisor.fullName}</strong>
                  </span>
                )}
                {calculateTotalRouteDuration(selectedRoute.items) && (
                  <span className="flex items-center gap-1.5 ml-4 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-100">
                    <Clock size={14} />
                    Tempo Total: {calculateTotalRouteDuration(selectedRoute.items)}
                  </span>
                )}
              </div>
            </div>
              <button 
                onClick={() => setSelectedRoute(null)}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-red-500 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-8 bg-slate-50/30">
              {selectedRoute.items.map((item, index) => (
                <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  item.products.some(p => p.isStockout) 
                    ? 'border-red-200 ring-2 ring-red-100 shadow-red-50' 
                    : 'border-slate-200'
                }`}>
                  {/* Item Header */}
                  <div className={`p-4 border-b flex flex-wrap items-center gap-4 ${
                    item.products.some(p => p.isStockout)
                      ? 'bg-red-50/30 border-red-100'
                      : 'bg-slate-50/50 border-slate-100'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      item.products.some(p => p.isStockout)
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-900 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{item.supermarket.fantasyName}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <MapPin size={12} />
                        {item.supermarket.city || 'Cidade não inf.'} - {item.supermarket.state || 'UF'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {isAdmin && (
                         <button 
                           onClick={() => openManualEntry(item, selectedRoute.promoterId || selectedRoute.promoter.id)}
                           className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                         >
                           <Edit size={14} />
                           {['CHECKOUT', 'COMPLETED'].includes(item.status) ? 'Editar Execução' : 'Lançamento Manual'}
                         </button>
                      )}

                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        <Clock size={14} className="text-slate-400" />
                        <span>In: {formatTime(item.checkInTime)}</span>
                        <span className="text-slate-300">|</span>
                        <span>Out: {formatTime(item.checkOutTime)}</span>
                      </div>
                      
                      {item.manualEntryBy && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title={`Lançado manualmente por ${item.manualEntryBy} em ${new Date(item.manualEntryAt!).toLocaleString('pt-BR')}`}>
                          <Monitor size={14} />
                          Verificado por {item.manualEntryBy} em {new Date(item.manualEntryAt!).toLocaleString('pt-BR')}
                        </div>
                      )}

                      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        ['CHECKOUT', 'COMPLETED'].includes(item.status) 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {item.status}
                      </div>
                    </div>
                  </div>

                  {/* Products Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100">
                        <tr>
                          <th className="p-3 w-10">#</th>
                          <th className="p-3">Produto</th>
                          <th className="p-3">Marca</th>
                          <th className="p-3">Validade</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Fotos</th>
                          <th className="p-3">Observação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {item.products.map((p, pIndex) => (
                          <tr key={p.id} className={p.isStockout ? 'bg-red-50/30' : ''}>
                            <td className="p-3 text-slate-400 text-xs">{pIndex + 1}</td>
                            <td className="p-3 font-medium text-slate-700">{p.product.name}</td>
                            <td className="p-3 text-slate-500">{p.product.brand?.name || '-'}</td>
                            <td className="p-3 text-xs">
                              {p.validityDate ? (() => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const valDate = new Date(p.validityDate);
                                // Fix timezone offset issue for display
                                const userTimezoneOffset = valDate.getTimezoneOffset() * 60000;
                                const adjustedDate = new Date(valDate.getTime() + userTimezoneOffset);
                                
                                const diffTime = adjustedDate.getTime() - today.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                
                                if (diffDays < 0) {
                                  return (
                                    <span className="flex flex-col text-red-600 font-bold">
                                      <span className="flex items-center gap-1"><AlertTriangle size={12}/> VENCIDO</span>
                                      <span>{adjustedDate.toLocaleDateString('pt-BR')}</span>
                                    </span>
                                  );
                                }
                                if (diffDays <= 30) {
                                  return (
                                    <span className="flex flex-col text-amber-600 font-bold">
                                      <span className="flex items-center gap-1"><AlertTriangle size={12}/> Vence em {diffDays}d</span>
                                      <span>{adjustedDate.toLocaleDateString('pt-BR')}</span>
                                    </span>
                                  );
                                }
                                return <span className="text-slate-600 font-medium">{adjustedDate.toLocaleDateString('pt-BR')}</span>;
                              })() : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="p-3 text-xs font-bold text-slate-500">
                              {p.checkInTime && p.checkOutTime ? (
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                  {formatDuration(p.checkInTime, p.checkOutTime)}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              {p.isStockout ? (
                                <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold">
                                  <AlertTriangle size={12} /> Ruptura
                                </span>
                              ) : p.checked ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                  <CheckCircle2 size={12} /> Verificado
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              {p.photos && p.photos.length > 0 ? (
                                <div className="flex gap-1 overflow-x-auto max-w-[200px] py-1">
                                  {p.photos.map((photo, i) => (
                                    <a 
                                      key={i} 
                                      href={getImageUrl(photo)} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="block w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:ring-2 ring-blue-500 transition-all"
                                    >
                                      <img src={getImageUrl(photo)} alt="Produto" className="w-full h-full object-cover" />
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>
                            <td className="p-3 text-slate-500 italic text-xs max-w-xs truncate">
                              {p.observation || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {manualForm && (
        <div className="fixed inset-0 bg-slate-900/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h2 className="text-xl font-black text-slate-900">Lançamento Manual de Visita</h2>
               <button 
                  onClick={() => setManualForm(null)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all"
                >
                  <X size={20} />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {/* Header Inputs */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Horário Entrada</label>
                    <input 
                      type="datetime-local" 
                      value={manualForm.checkInTime}
                      onChange={e => setManualForm({...manualForm, checkInTime: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Horário Saída</label>
                    <input 
                      type="datetime-local" 
                      value={manualForm.checkOutTime}
                      onChange={e => setManualForm({...manualForm, checkOutTime: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Promotor Responsável</label>
                    <select 
                      value={manualForm.promoterId}
                      onChange={e => setManualForm({...manualForm, promoterId: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Selecione um promotor...</option>
                      {promotersList.map(p => (
                        <option key={p.id} value={p.id}>{p.fullName}</option>
                      ))}
                    </select>
                  </div>
               </div>

               {/* Products List */}
               <div className="space-y-4">
                 <h3 className="font-bold text-slate-800">Produtos da Rota</h3>
                 {manualForm.products.map((prod, idx) => (
                   <div key={prod.productId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                     <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">{prod.productName}</span>
                        <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2">
                           <label className="text-xs font-bold text-slate-500">Estoque:</label>
                           <input 
                             type="number" 
                             placeholder="Qtd"
                             value={prod.stockCount}
                             onChange={e => {
                               const newProds = [...manualForm.products];
                               newProds[idx].stockCount = e.target.value ? parseInt(e.target.value) : '';
                               setManualForm({...manualForm, products: newProds});
                             }}
                             className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 w-20"
                           />
                         </div>
                         <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
                           <input 
                             type="checkbox" 
                             checked={prod.checked}
                              onChange={e => {
                                const newProds = [...manualForm.products];
                                newProds[idx].checked = e.target.checked;
                                setManualForm({...manualForm, products: newProds});
                              }}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            Conferido
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-red-600 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={prod.isStockout}
                              onChange={e => {
                                const newProds = [...manualForm.products];
                                newProds[idx].isStockout = e.target.checked;
                                setManualForm({...manualForm, products: newProds});
                              }}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                            />
                            Ruptura
                          </label>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <input 
                          type="text" 
                          placeholder="Observação (opcional)"
                          value={prod.observation}
                          onChange={e => {
                            const newProds = [...manualForm.products];
                            newProds[idx].observation = e.target.value;
                            setManualForm({...manualForm, products: newProds});
                          }}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                       />
                       <div className="flex items-center gap-2">
                         <button 
                           onClick={() => openPhotoModal(idx)}
                           className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                         >
                           <Camera size={16} />
                           <span className="truncate">Adicionar Fotos</span>
                         </button>
                       </div>
                     </div>

                     {/* Thumbnails */}
                    {prod.photos && prod.photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 py-1">
                        {prod.photos.map((pUrl, pIdx) => (
                          <div key={pIdx} className="aspect-square w-full rounded-lg overflow-hidden border border-slate-200 relative group">
                             <img 
                               src={getImageUrl(pUrl)} 
                               alt="" 
                               className="w-full h-full object-cover" 
                             />
                             <button 
                              onClick={() => {
                                const newProds = [...manualForm.products];
                                newProds[idx].photos = newProds[idx].photos.filter((_, i) => i !== pIdx);
                                setManualForm({...manualForm, products: newProds});
                              }}
                              className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                   </div>
                 ))}
               </div>
             </div>

             <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
               <button 
                 onClick={() => setManualForm(null)}
                 className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
               >
                 Cancelar
               </button>
               <button 
                 onClick={submitManualEntry}
                 disabled={submitting}
                 className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {submitting ? 'Salvando...' : 'Salvar Lançamento'}
                 <Save size={18} />
               </button>
             </div>
           </div>
        </div>
      )}
      {/* Photo Processing Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h2 className="text-xl font-black text-slate-900">Dados da Foto</h2>
               <button 
                  onClick={() => setShowPhotoModal(false)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all"
                >
                  <X size={20} />
                </button>
             </div>
             
             <div className="p-6 space-y-4">
                <p className="text-sm text-slate-500">
                  Informe os dados que serão estampados na marca d'água das fotos.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                    <input 
                      type="date"
                      value={photoMeta.date}
                      onChange={e => setPhotoMeta({...photoMeta, date: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Hora</label>
                    <input 
                      type="time"
                      value={photoMeta.time}
                      onChange={e => setPhotoMeta({...photoMeta, time: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Promotor</label>
                  <select 
                    value={photoMeta.promoterName}
                    onChange={e => setPhotoMeta({...photoMeta, promoterName: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione um promotor...</option>
                    {promotersList.map(p => (
                        <option key={p.id} value={p.fullName || p.name}>{p.fullName || p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">PDV</label>
                  <input 
                    type="text"
                    value={photoMeta.pdvName}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm outline-none text-slate-500 cursor-not-allowed"
                  />
                </div>
             </div>

             <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
               <button 
                 onClick={() => setShowPhotoModal(false)}
                 className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
               >
                 Cancelar
               </button>
               <button 
                 onClick={handlePhotoModalConfirm}
                 className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
               >
                 Selecionar Fotos
                 <Camera size={18} />
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input 
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
            handleFileSelect(e.target.files);
            e.target.value = '';
        }}
      />
      
      {/* Processing Indicator */}
      {processing && (
        <div className="fixed inset-0 bg-black/50 z-[130] flex items-center justify-center backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-800">Processando Fotos...</h3>
                    <p className="text-slate-500 text-sm">Aguarde enquanto adicionamos a marca d'água.</p>
                </div>
            </div>
        </div>
      )}

      {groupBy === 'validity' && (
            <div className="divide-y divide-slate-100">
                {validityReport.map(pdv => (
                    <div key={pdv.id} className="p-6">
                        <h4 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                            <Store size={18} className="text-blue-500" />
                            {pdv.name}
                            <span className="text-sm font-normal text-slate-500 ml-2">({pdv.items.length} produtos)</span>
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg">Produto</th>
                                        <th className="px-4 py-3">Marca</th>
                                        <th className="px-4 py-3">Validade</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Verificado em</th>
                                        <th className="px-4 py-3 rounded-r-lg">Promotor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pdv.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-700">{item.productName}</td>
                                            <td className="px-4 py-3 text-slate-600">{item.brandName}</td>
                                            <td className="px-4 py-3">
                                                {item.validityDate ? (
                                                    <span className={`font-bold ${
                                                        new Date(item.validityDate) < new Date() ? 'text-red-600' : 
                                                        new Date(item.validityDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-orange-600' : 'text-green-600'
                                                    }`}>
                                                        {new Date(item.validityDate).toLocaleDateString('pt-BR')}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.checked ? (
                                                    <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded">Verificado</span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">Pendente</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {new Date(item.date).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{item.promoterName}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
                {validityReport.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                        Nenhum registro de validade encontrado para os filtros selecionados.
                    </div>
                )}
            </div>
          )}
    </div>
  );
};

export default RoutesReportView;