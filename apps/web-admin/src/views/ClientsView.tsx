import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { mockClients } from '../mockData';
import { useBranding } from '../context/BrandingContext';
import api from '../api/client';

const ClientsView: React.FC = () => {
  const { settings } = useBranding();
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await api.get('/clients');
        // Map backend data to frontend structure if needed
        // Backend: { id, name, logo, status, products: [] }
        // Frontend Mock: { id, nome, logo, totalProdutos }
        const mappedClients = response.data.map((c: any) => ({
          id: c.id,
          nome: c.name,
          logo: c.logo || 'https://via.placeholder.com/150',
          totalProdutos: c.products ? c.products.length : 0,
          status: c.status
        }));
        
        if (mappedClients.length > 0) {
           setClients(mappedClients);
        } else {
           setClients(mockClients); // Fallback if DB is empty
        }
      } catch (error) {
        console.error("Failed to fetch clients, using mock data", error);
        setClients(mockClients);
      }
    };

    fetchClients();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Clientes & Contratos</h1>
          <p className="text-slate-500 font-medium text-lg">Marcas que confiam na operação Ayratech.</p>
        </div>
        <button 
          className="flex items-center gap-2 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-blue-200 transition-all hover:scale-105"
          style={{ backgroundColor: settings.primaryColor }}
        >
          <Plus size={20} /> Novo Contrato
        </button>
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
