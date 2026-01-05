import React, { useState } from 'react';
import { useBranding } from '../context/BrandingContext';
import { Save, Shield, Palette } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';

const AdminView: React.FC = () => {
  const { settings, updateSettings } = useBranding();
  const [activeTab, setActiveTab] = useState<'branding' | 'permissions'>('branding');

  // Local state for branding form
  const [brandingForm, setBrandingForm] = useState(settings);

  // Mock roles
  const [roles, setRoles] = useState([
    { id: 'r1', name: 'Administrador', permissions: ['all'] },
    { id: 'r2', name: 'Supervisor', permissions: ['view_dashboard', 'manage_routes', 'view_reports'] },
    { id: 'r3', name: 'Promotor', permissions: ['view_routes', 'submit_checklist'] },
  ]);

  const handleBrandingSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(brandingForm);
    alert('Configurações de Branding salvas!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Administração</h1>
          <p className="text-slate-500 font-medium text-lg">Configurações globais do sistema.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('branding')}
          className={`pb-4 px-4 font-bold text-sm transition-all ${activeTab === 'branding' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Branding & Identidade
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`pb-4 px-4 font-bold text-sm transition-all ${activeTab === 'permissions' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Permissões & Cargos
        </button>
      </div>

      {activeTab === 'branding' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm max-w-2xl">
          <SectionHeader icon={<Palette className="text-[var(--primary-color)]" size={22} />} title="Identidade Visual" />
          
          <form onSubmit={handleBrandingSave} className="mt-8 space-y-6">
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Nome da Empresa (Sistema)</label>
              <input 
                type="text" 
                value={brandingForm.companyName}
                onChange={e => setBrandingForm({...brandingForm, companyName: e.target.value})}
                className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800"
              />
            </div>
            
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Cor Primária</label>
              <div className="flex items-center gap-4">
                <input 
                  type="color" 
                  value={brandingForm.primaryColor}
                  onChange={e => setBrandingForm({...brandingForm, primaryColor: e.target.value})}
                  className="h-12 w-24 rounded-xl cursor-pointer"
                />
                <span className="font-mono text-slate-500">{brandingForm.primaryColor}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Logo URL</label>
              <input 
                type="text" 
                value={brandingForm.logoUrl}
                onChange={e => setBrandingForm({...brandingForm, logoUrl: e.target.value})}
                className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-800"
                placeholder="https://..."
              />
              {brandingForm.logoUrl && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 inline-block">
                  <img src={brandingForm.logoUrl} alt="Preview" className="h-12 object-contain" />
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button type="submit" className="flex items-center gap-2 bg-[var(--primary-color)] text-white px-8 py-3 rounded-2xl font-black shadow-xl hover:opacity-90 transition-all">
                <Save size={18} /> Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <SectionHeader icon={<Shield className="text-[var(--primary-color)]" size={22} />} title="Gestão de Acesso" />
          
          <div className="mt-8 space-y-4">
             {roles.map(role => (
               <div key={role.id} className="p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all flex justify-between items-center">
                 <div>
                   <h3 className="font-black text-slate-900">{role.name}</h3>
                   <p className="text-xs text-slate-500 font-bold mt-1">{role.permissions.length} permissões ativas</p>
                 </div>
                 <button className="text-[var(--primary-color)] font-bold text-sm hover:underline">Editar Permissões</button>
               </div>
             ))}
             <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] transition-all">
               + Criar Novo Cargo
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
