import React from 'react';
import { useLivePhotos } from '../hooks/useLivePhotos';
import { getImageUrl } from '../utils/image';
import { Clock, MapPin, User, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LivePhotosFeedProps {
  clientId?: string;
}

export const LivePhotosFeed: React.FC<LivePhotosFeedProps> = ({ clientId }) => {
  const { photos, loading } = useLivePhotos(60, 10000, clientId); // Last 60 mins, refresh every 10s

  if (loading && photos.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        Carregando fotos em tempo real...
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p>Nenhuma foto recebida nos últimos 60 minutos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          Feed Ao Vivo
        </h3>
        <span className="text-xs text-slate-400 font-medium">Atualizando em tempo real</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {photos.map((photo) => (
          <div key={photo.id + photo.photoUrl} className="group relative bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all animate-in fade-in zoom-in-95 duration-300">
            {/* Image */}
            <div className="aspect-square relative overflow-hidden bg-slate-100">
              <img 
                src={getImageUrl(photo.photoUrl)} 
                alt={photo.productName} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Info Overlay (Hover) */}
            <div className="absolute inset-0 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white">
               <p className="font-bold text-sm truncate">{photo.productName}</p>
               <p className="text-xs text-white/80 truncate">{photo.brandName}</p>
            </div>

            {/* Always Visible Info */}
            <div className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                 <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 truncate">
                    <User size={12} className="text-blue-500" />
                    <span className="truncate max-w-[100px]" title={photo.promoterName}>{photo.promoterName.split(' ')[0]}</span>
                 </div>
                 <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded-full border border-slate-100">
                    <Clock size={10} />
                    {formatDistanceToNow(new Date(photo.timestamp), { addSuffix: true, locale: ptBR }).replace('cerca de ', '')}
                 </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate border-t border-slate-50 pt-2 mt-1">
                <MapPin size={12} className="text-orange-500 flex-shrink-0" />
                <span className="truncate" title={photo.supermarketName}>{photo.supermarketName}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
