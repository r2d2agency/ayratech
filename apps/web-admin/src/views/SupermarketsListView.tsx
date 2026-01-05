import React, { useState, useEffect } from 'react';
import { Store, ExternalLink } from 'lucide-react';
import api from '../api/client';
import { useBranding } from '../context/BrandingContext';
import { ViewType } from '../types';

interface SupermarketsListViewProps {
  onNavigate: (view: ViewType) => void;
}

const SupermarketsListView: React.FC<SupermarketsListViewProps> = ({ onNavigate }) => {
  const { settings } = useBranding();
  const [supermarkets, setSupermarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupermarkets = async () => {
      try {
        const response = await api.get('/supermarkets');
        setSupermarkets(response.data);
      } catch (error) {
        console.error("Error fetching supermarkets:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSupermarkets();
  }, []);

  if (loading) return <div className="p-8">Carregando supermercados...</div>;

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Supermercados</h1>
          <p className="text-slate-500 font-medium text-lg">Pontos de venda da rede Ayratech.</p>
        </div>
        <button 
          onClick={() => onNavigate('supermarket_form')} 
          className="text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-blue-200"
          style={{ backgroundColor: settings.primaryColor }}
        >
          Cadastrar PDV
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="px-8 py-5">Identificação do PDV</th>
              <th className="px-8 py-5">Rede / Grupo</th>
              <th className="px-8 py-5">Cidade / UF</th>
              <th className="px-8 py-5 text-center">Classificação</th>
              <th className="px-8 py-5 text-right">Controle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {supermarkets.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                   <div className="flex items-center gap-4">
                      <div 
                        className="h-12 w-12 rounded-2xl flex items-center justify-center border transition-colors"
                        style={{ 
                          backgroundColor: `${settings.primaryColor}10`, // 10% opacity
                          color: settings.primaryColor,
                          borderColor: `${settings.primaryColor}20`
                        }}
                      >
                         <Store size={22} />
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-900">{s.fantasyName}</p>
                        <p className="text-xs text-slate-400 font-bold">CNPJ: {s.cnpj || 'Não informado'}</p>
                      </div>
                   </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-sm font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{s.group?.name || 'Sem Rede'}</span>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm font-bold text-slate-600">{s.city} - {s.state}</p>
                </td>
                <td className="px-8 py-6 text-center">
                   <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                      s.classification === 'Ouro' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                   }`}>
                      {s.classification}
                   </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="p-3 text-slate-400 hover:bg-blue-50 rounded-xl transition-all"
                    style={{ color: 'inherit' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = settings.primaryColor}
                    onMouseLeave={(e) => e.currentTarget.style.color = ''}
                  >
                    <ExternalLink size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupermarketsListView;
