import React, { useState, useEffect } from 'react';
import { Wand2, Check, XCircle } from 'lucide-react';
import api from '../api/client';
import { getImageUrl } from '../utils/image';

const PhotoProcessingView: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/pending');
      setItems(res.data);
    } catch (error) {
      console.error('Error fetching pending items', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeBatch = async () => {
    setProcessing(true);
    const ids = items.map(i => i.id);
    try {
      const res = await api.post('/ai/analyze-batch', { ids });
      // Update local state based on results
      const results = res.data; // [{id, status, reason}]
      
      setItems(prev => prev.map(item => {
        const result = results.find((r: any) => r.id === item.id);
        if (result) {
            return { ...item, aiStatus: result.status, aiObservation: result.reason };
        }
        return item;
      }));
      
      alert('Análise concluída!');
    } catch (error) {
      alert('Erro na análise em lote.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-4xl font-black text-slate-900 tracking-tight">Centro de Processamento de Fotos (IA)</h1>
           <p className="text-slate-500 font-medium text-lg">Validação automática de execução no PDV.</p>
        </div>
        <button 
          onClick={handleAnalyzeBatch}
          disabled={processing || items.length === 0}
          className="flex items-center gap-2 bg-purple-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-purple-200 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          <Wand2 size={20} />
          {processing ? 'Processando...' : 'Analisar Lote'}
        </button>
      </div>

      {items.length === 0 && !loading && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-500 font-medium">Nenhuma foto pendente de análise.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map(item => (
            <div key={item.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="grid grid-cols-2 h-48">
                    <div className="relative border-r border-slate-100 group">
                        <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 backdrop-blur-md">Referência</span>
                        <img 
                            src={getImageUrl(item.product?.referenceImageUrl || item.product?.image)} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" 
                            alt="Reference" 
                        />
                    </div>
                    <div className="relative group">
                        <span className="absolute top-2 left-2 bg-blue-500/80 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 backdrop-blur-md">PDV</span>
                        <img 
                            src={getImageUrl(item.photos?.[0])} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" 
                            alt="PDV" 
                        />
                    </div>
                </div>
                <div className="p-5">
                    <div className="flex justify-between items-start mb-3 gap-2">
                        <h3 className="font-bold text-slate-800 line-clamp-1 text-sm" title={item.product?.name}>{item.product?.name}</h3>
                        <StatusBadge status={item.aiStatus} />
                    </div>
                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                        <span className="font-bold">{item.routeItem?.route?.user?.name || 'Promotor'}</span>
                        <span>•</span>
                        <span>{item.checkInTime ? new Date(item.checkInTime).toLocaleDateString() : '-'}</span>
                    </p>
                    
                    {item.aiObservation ? (
                        <div className={`text-xs p-3 rounded-xl ${item.aiStatus === 'OK' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {item.aiObservation}
                        </div>
                    ) : (
                         <div className="text-xs p-3 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 italic">
                            Aguardando análise...
                        </div>
                    )}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
    switch(status) {
        case 'OK': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 whitespace-nowrap"><Check size={10}/> OK</span>;
        case 'FLAGGED': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 whitespace-nowrap"><XCircle size={10}/> REVISAR</span>;
        default: return <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap">PENDENTE</span>;
    }
}

export default PhotoProcessingView;
