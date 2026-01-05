import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import api from '../api/client';

const ProductsView: React.FC = () => {
  const { settings } = useBranding();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('Todas as Marcas');
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, clientsRes] = await Promise.all([
          api.get('/products'),
          api.get('/clients')
        ]);

        const mappedClients = clientsRes.data.map((c: any) => ({
          id: c.id,
          nome: c.name,
          logo: c.logo
        }));
        setClients(mappedClients);

        const mappedProducts = productsRes.data.map((p: any) => ({
          id: p.id,
          nome: p.name,
          sku: p.sku,
          categoria: p.category,
          imagem: p.image || 'https://via.placeholder.com/150',
          clientId: p.clientId
        }));
        setProducts(mappedProducts);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.includes(searchTerm) || 
                          p.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    
    const clientName = clients.find(c => c.id === p.clientId)?.nome || '';
    const matchesClient = selectedClient === 'Todas as Marcas' || clientName === selectedClient;

    return matchesSearch && matchesClient;
  });

  if (loading) return <div className="p-8">Carregando produtos...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Catálogo de SKUs</h1>
          <p className="text-slate-500 font-medium text-lg">Controle central de mix de produtos.</p>
        </div>
        <button 
          className="text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-blue-200 hover:scale-105 transition-all"
          style={{ backgroundColor: settings.primaryColor }}
        >
          Adicionar Produto
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Filtrar por nome, SKU ou categoria..." 
              className="w-full pl-12 h-12 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="h-12 px-6 rounded-xl border border-slate-200 outline-none text-sm font-black text-slate-700 bg-white"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            <option>Todas as Marcas</option>
            {clients.map(c => <option key={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-8">
          {filteredProducts.map(p => (
            <div key={p.id} className="group border border-slate-100 rounded-2xl p-5 hover:shadow-xl transition-all bg-white" style={{ borderColor: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = settings.primaryColor} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
              <div className="relative aspect-square overflow-hidden rounded-xl mb-5">
                <img src={p.imagem} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" alt={p.nome} />
                <div className="absolute top-2 right-2 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[9px] font-black text-slate-700 border border-slate-100 shadow-sm">
                  {p.sku}
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: settings.primaryColor }}>{p.categoria}</p>
              <h4 className="text-lg font-black text-slate-900 truncate mb-1">{p.nome}</h4>
              <div className="flex items-center gap-2 mt-4">
                <div className="h-6 w-6 rounded-lg border border-slate-100 flex items-center justify-center p-1">
                  <img src={clients.find(c => c.id === p.clientId)?.logo} className="object-contain" alt="" />
                </div>
                <span className="text-[11px] font-black text-slate-500">{clients.find(c => c.id === p.clientId)?.nome}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductsView;
