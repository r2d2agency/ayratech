import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { Save, Shield, Palette, Users, Trash2, Edit } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import api, { API_URL } from '../api/client';

const AdminView: React.FC = () => {
  const { settings, updateSettings } = useBranding();
  const [activeTab, setActiveTab] = useState<'branding' | 'users' | 'permissions'>('branding');

  // Local state for branding form
  const [brandingForm, setBrandingForm] = useState(settings);

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'user' });

  // Permissions state
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      // Map backend roles to frontend structure
      const rolesWithPermissions = res.data.map((r: any) => ({
        ...r,
        permissions: r.permissions || [] // Ensure permissions array exists
      }));
      setRoles(rolesWithPermissions);
    } catch (err) {
      console.error('Erro ao buscar cargos:', err);
    }
  };

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

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userForm.role) {
      alert('Por favor, selecione um cargo.');
      return;
    }

    try {
      const payload: any = {
        email: userForm.username,
        roleId: userForm.role,
        // name is not directly on user, but we might want to handle it later or ignore it for now if backend doesn't support it
        // The backend CreateUserDto doesn't have 'name'. 
      };

      if (editingUser) {
        // Edit existing user
        if (userForm.password) {
          payload.password = userForm.password;
        }
        await api.patch(`/users/${editingUser.id}`, payload);
        alert('Usuário atualizado com sucesso!');
      } else {
        // Create new user
        payload.password = userForm.password;
        await api.post('/users', payload);
        alert('Usuário criado com sucesso!');
      }
      resetUserForm();
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar usuário: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || '',
      username: user.email || '',
      password: '', // Password is blank on edit
      role: user.roleId || (roles.length > 0 ? roles[0].id : '')
    });
  };

  const resetUserForm = () => {
    setEditingUser(null);
    setUserForm({ name: '', username: '', password: '', role: roles.length > 0 ? roles[0].id : '' });
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
            ? r.permissions.filter((p: string) => p !== permission)
            : [...r.permissions, permission]
        };
      }
      return r;
    }));
  };

  const handleSavePermissions = async (role: any) => {
    try {
      await api.patch(`/roles/${role.id}`, {
        permissions: role.permissions
      });
      setEditingPermissions(null);
      alert('Permissões atualizadas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar permissões.');
    }
  };

  const getRoleName = (roleId: string) => {
    if (!roleId) return 'Usuário Comum';
    const role = roles.find(r => r.id === roleId);
    return role ? (role.description || role.name) : 'Usuário Comum';
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
            <SectionHeader icon={<Users className="text-[var(--primary-color)]" size={22} />} title={editingUser ? "Editar Usuário" : "Novo Usuário"} />
            <form onSubmit={handleUserSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Email (Login)</label>
                <input 
                  type="email" 
                  required
                  value={userForm.username}
                  onChange={e => setUserForm({...userForm, username: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Senha {editingUser && '(Deixe em branco para manter)'}</label>
                <input 
                  type="password" 
                  required={!editingUser}
                  value={userForm.password}
                  onChange={e => setUserForm({...userForm, password: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase mb-1 block">Cargo</label>
                <select 
                  value={userForm.role}
                  onChange={e => setUserForm({...userForm, role: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-sm"
                >
                  <option value="">Selecione um cargo...</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.description || role.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-3 bg-[var(--primary-color)] text-white rounded-xl font-black shadow-lg hover:opacity-90 transition-all mt-4">
                  {editingUser ? 'Atualizar Usuário' : 'Criar Usuário'}
                </button>
                {editingUser && (
                  <button 
                    type="button" 
                    onClick={resetUserForm}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-all mt-4"
                  >
                    Cancelar
                  </button>
                )}
              </div>
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
                          {getRoleName(user.roleId)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-slate-400 hover:text-[var(--primary-color)] hover:bg-blue-50 rounded-lg transition-all"
                            title="Editar usuário"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir usuário"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
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
                  <img 
                    src={brandingForm.logoUrl.startsWith('/') ? `${API_URL}${brandingForm.logoUrl}` : brandingForm.logoUrl} 
                    alt="Preview" 
                    className="h-12 object-contain" 
                  />
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
                      <div className="col-span-full flex justify-end mt-4">
                        <button 
                          onClick={() => handleSavePermissions(role)}
                          className="px-6 py-2 bg-[var(--primary-color)] text-white rounded-lg font-bold shadow-md hover:opacity-90 transition-all"
                        >
                          Salvar Permissões
                        </button>
                      </div>
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
