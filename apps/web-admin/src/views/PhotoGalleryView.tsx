import React, { useState, useEffect, useMemo } from 'react';
import { useBranding } from '../context/BrandingContext';
import SectionHeader from '../components/SectionHeader';
import { 
  Image as ImageIcon,
  Calendar, 
  Filter, 
  User,
  Search,
  Grid
} from 'lucide-react';
import api from '../api/client';

interface RouteReportItem {
  id: string;
  date: string;
  status: string;
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
    supermarket: {
      id: string;
      fantasyName: string;
    };
    products: Array<{
      id: string;
      photos?: string[];
      product: {
        id: string;
        name: string;
        sku?: string;
      };
    }>;
  }>;
}

const PhotoGalleryView: React.FC = () => {
  const { settings } = useBranding();
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<RouteReportItem[]>([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  
  // Gallery Filters
  const [galleryFilters, setGalleryFilters] = useState({
    pdv: '',
    product: '',
    sku: '',
    promoter: '',
    supervisor: ''
  });

  useEffect(() => {
    fetchRoutes();
  }, [dateFilter]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/routes');
      const allRoutes: RouteReportItem[] = res.data;
      const filtered = allRoutes.filter(r => r.date.startsWith(dateFilter));
      setRoutes(filtered);
    } catch (err) {
      console.error('Error fetching routes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Gallery Data
  const galleryPhotos = useMemo(() => {
    return routes.flatMap(route => 
      route.items.flatMap(item => 
        item.products.flatMap(product => 
          (product.photos || []).map(photo => ({
            url: photo,
            route,
            item,
            product
          }))
        )
      )
    ).filter(p => {
      // Filters
      if (galleryFilters.pdv && !p.item.supermarket.fantasyName.toLowerCase().includes(galleryFilters.pdv.toLowerCase())) return false;
      if (galleryFilters.product && !p.product.product.name.toLowerCase().includes(galleryFilters.product.toLowerCase())) return false;
      if (galleryFilters.sku && !p.product.product.sku?.toLowerCase().includes(galleryFilters.sku.toLowerCase())) return false;
      if (galleryFilters.promoter && !p.route.promoter.fullName.toLowerCase().includes(galleryFilters.promoter.toLowerCase())) return false;
      if (galleryFilters.supervisor && !p.route.promoter.supervisor?.fullName.toLowerCase().includes(galleryFilters.supervisor.toLowerCase())) return false;
      return true;
    });
  }, [routes, galleryFilters]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <SectionHeader 
        icon={<ImageIcon className="text-blue-600" />}
        title="Galeria de Fotos"
        subtitle="Visualize e filtre as fotos das execuções em campo"
      />

      {/* Filters */}
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-slate-500">
            <Filter size={20} />
            <span className="font-bold text-sm">Filtros:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase">Data</label>
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              placeholder="PDV / Loja" 
              value={galleryFilters.pdv}
              onChange={e => setGalleryFilters({...galleryFilters, pdv: e.target.value})}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              placeholder="Produto" 
              value={galleryFilters.product}
              onChange={e => setGalleryFilters({...galleryFilters, product: e.target.value})}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
              placeholder="SKU" 
              value={galleryFilters.sku}
              onChange={e => setGalleryFilters({...galleryFilters, sku: e.target.value})}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="relative">
             <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
              placeholder="Promotor" 
              value={galleryFilters.promoter}
              onChange={e => setGalleryFilters({...galleryFilters, promoter: e.target.value})}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="relative">
             <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
              placeholder="Supervisor" 
              value={galleryFilters.supervisor}
              onChange={e => setGalleryFilters({...galleryFilters, supervisor: e.target.value})}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {galleryPhotos.map((photo, i) => (
            <div key={i} className="group relative bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className="aspect-square bg-slate-100 relative overflow-hidden">
                <img src={photo.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="text-white text-xs font-bold truncate">{photo.product.product.name}</p>
                  <p className="text-white/80 text-[10px] truncate">{photo.item.supermarket.fantasyName}</p>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <User size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-600 truncate">{photo.route.promoter.fullName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-600 truncate">{new Date(photo.route.date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <a href={photo.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" />
            </div>
          ))}
          {galleryPhotos.length === 0 && (
              <div className="col-span-full p-12 text-center text-slate-400 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                  <ImageIcon size={32} />
                </div>
                <p>Nenhuma foto encontrada com os filtros atuais.</p>
              </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoGalleryView;
