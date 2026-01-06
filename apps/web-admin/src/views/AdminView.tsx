import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { Save, Shield, Palette, Users, Trash2 } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import api from '../api/client';

const AdminView: React.FC = () => {
  const { settings, updateSettings } = useBranding();
  const [activeTab, setActiveTab] = useState<'branding' | 'users' | 'permissions'>('branding');

  // Local state for branding form
  const [brandingForm, setBrandingForm] = useState(settings);

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'user' });

  // Permissions state
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [roles, setRoles] = useState([
    { id: 'r1', name: 'Administrador', permissions: ['all'] },
    { id: 'r2', name: 'Supervisor', permissions: ['view_dashboard', 'manage_routes', 'view_reports'] },
    { id: 'r3', name: 'Promotor', permissions: ['view_routes', 'submit_checklist'] },
  ]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', {
        email: newUser.username,
        password: newUser.password,
        roleId: newUser.role
      });
      alert('Usuário criado com sucesso!');
      setNewUser({ name: '', username: '', password: '', role: 'user' });
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao criar usuário: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert('Erro ao excluir usuário');
    }
  };

  const handleBrandingSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(brandingForm);
    alert('Configurações de Branding salvas!');
  };

  const togglePermission = (roleId: string, permission: string) => {
    setRoles(roles.map(r => {
      if (r.id === roleId) {
        const has = r.permissions.includes(permission);
        return {
          ...r,
          permissions: has 
            ? r.permissions.filter(p => p !== permission)
            : [...r.permissions, permission]
        };
      }
      return r;
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Administração</h1>
          <p className="text-slate-500 font-medium text-lg">Configurações globais do sistema.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('branding')}
          className={`pb-4 px-4 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'branding' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Branding & Identidade
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 px-4 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'users' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Usuários
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`pb-4 px-4 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'permissions' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Permissões & Cargos
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm h-fit">
            <SectionHeader icon={<Users className="text-[var(--primary-color)]" size={22} />} title="Novo Usuário" />
            <form onSubmit={handleCreateUser} className="mt-6 space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Nome Completo (Opcional)</label>
                <input 
                  type="text" 
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                  placeholder="Nome do funcionário"
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Email (Login)</label>
                <input 
                  type="email" 
                  required
                  value={newUser.username}
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Senha</label>
                <input 
                  type="password" 
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Cargo</label>
                <select 
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                >
                  <option value="user">Usuário Comum</option>
                  <option value="admin">Administrador</option>
                  <option value="promoter">Promotor</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-[var(--primary-color)] text-white rounded-xl font-black shadow-lg hover:opacity-90 transition-all mt-4">
                Criar Usuário
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <SectionHeader icon={<Users className="text-[var(--primary-color)]" size={22} />} title="Lista de Usuários" />
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                    <th className="pb-3 px-4">Email / Login</th>
                    <th className="pb-3 px-4">Cargo</th>
                    <th className="pb-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(user => (
                    <tr key={user.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-700">
                        {user.email}
                        {user.employee?.name && <span className="block text-xs text-slate-400 font-normal">{user.employee.name}</span>}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-black uppercase">
                          {user.roleId || 'user'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir usuário"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !loadingUsers && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">Nenhum usuário encontrado.</td>
                    </tr>
                  )}
                  {loadingUsers && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">Carregando...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
               <div key={role.id} className="p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all flex flex-col gap-4">
                 <div className="flex justify-between items-center w-full">
                   <div>
                     <h3 className="font-black text-slate-900">{role.name}</h3>
                     <p className="text-xs text-slate-500 font-bold mt-1">{role.permissions.length} permissões ativas</p>
                   </div>
                   <button 
                    onClick={() => setEditingPermissions(editingPermissions === role.id ? null : role.id)}
                    className="text-[var(--primary-color)] font-bold text-sm hover:underline"
                   >
                     {editingPermissions === role.id ? 'Fechar Edição' : 'Editar Permissões'}
                   </button>
                 </div>
                 
                 {editingPermissions === role.id && (
                   <div className="pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-2 animate-in slide-in-from-top-2 duration-200">
                      {['view_dashboard', 'manage_users', 'manage_routes', 'view_reports', 'submit_checklist', 'all'].map(perm => (
                        <label key={perm} className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer hover:bg-slate-100 p-2 rounded-lg">
                          <input 
                            type="checkbox" 
                            checked={role.permissions.includes(perm)}
                            onChange={() => togglePermission(role.id, perm)}
                            className="rounded text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                          />
                          {perm}
                        </label>
                      ))}
                   </div>
                 )}
               </div>
             ))}
             <button 
              onClick={() => alert('Em breve: Criação de novos cargos personalizados.')}
              className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] transition-all"
             >
               + Criar Novo Cargo
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
