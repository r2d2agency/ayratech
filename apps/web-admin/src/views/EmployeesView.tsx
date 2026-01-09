import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api/client';
import { useBranding } from '../context/BrandingContext';

interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  role?: { id: string; name: string };
  status: string;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

const EmployeesView: React.FC = () => {
  const { settings } = useBranding();
  const [activeTab, setActiveTab] = useState<'employees' | 'roles'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);

  // Forms
  const [employeeForm, setEmployeeForm] = useState({
    fullName: '',
    cpf: '',
    rg: '',
    birthDate: '',
    email: '',
    phone: '',
    addressStreet: '',
    addressNumber: '',
    addressDistrict: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    internalCode: '',
    roleId: '',
    supervisorId: '',
    contractType: 'clt',
    admissionDate: '',
    status: 'active',
    // Compensation (simplified for now)
    baseSalary: '',
    transportVoucher: '',
    mealVoucher: '',
    // Schedule (simplified)
    weeklyHours: 44,
    facialPhotoUrl: '',
    createAccess: false,
    appPassword: ''
  });

  const [facialPhotoFile, setFacialPhotoFile] = useState<File | null>(null);
  const [facialPhotoPreview, setFacialPhotoPreview] = useState<string>('');

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    accessLevel: 'basic'
  });

  const [formTab, setFormTab] = useState<'general' | 'address' | 'contract' | 'schedule'>('general');
  const [cpfError, setCpfError] = useState<string>('');
  const [cepError, setCepError] = useState<string>('');

  // Helper functions
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };
  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  };

  const validateCPF = (cpf: string) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
  };

  const handleCepLookup = async () => {
    const cepDigits = employeeForm.addressZip.replace(/\D/g, '');
    if (cepDigits.length !== 8) {
      setCepError(cepDigits.length > 0 ? 'CEP deve ter 8 dígitos' : '');
      return;
    }
    setCepError('');
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setEmployeeForm(prev => ({
          ...prev,
          addressStreet: data.logradouro,
          addressDistrict: data.bairro,
          addressCity: data.localidade,
          addressState: data.uf
        }));
      } else {
        setCepError('CEP não encontrado');
      }
    } catch (error) {
      console.error('Error fetching CEP:', error);
      setCepError('Erro ao consultar CEP');
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, []);
  useEffect(() => {
    const digits = employeeForm.addressZip.replace(/\D/g, '');
    if (digits.length === 8) {
      handleCepLookup();
    }
  }, [employeeForm.addressZip]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      if ((error as any)?.response?.status === 401) {
        alert('Sessão expirada ou não autenticado. Faça login para continuar.');
      } else {
        console.error('Error fetching employees:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.role && emp.role.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cpfError) {
      alert('Corrija o CPF antes de salvar.');
      return;
    }

    try {
      const formData = new FormData();
      
      // Append all form fields
      Object.keys(employeeForm).forEach(key => {
        const value = (employeeForm as any)[key];
        if (value !== null && value !== undefined && value !== '') {
            formData.append(key, value);
        }
      });

      if (facialPhotoFile) {
        formData.append('facialPhoto', facialPhotoFile);
      }

      if (editingEmployee) {
        await api.patch(`/employees/${editingEmployee.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Funcionário atualizado com sucesso!');
      } else {
        await api.post('/employees', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Funcionário cadastrado com sucesso!');
      }
      setShowEmployeeModal(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Erro ao salvar funcionário.');
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/roles', roleForm);
      setShowRoleModal(false);
      setRoleForm({ name: '', description: '', accessLevel: 'basic' });
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      fullName: '',
      cpf: '',
      rg: '',
      birthDate: '',
      email: '',
      phone: '',
      addressStreet: '',
      addressNumber: '',
      addressDistrict: '',
      addressCity: '',
      addressState: '',
      addressZip: '',
      internalCode: '',
      roleId: '',
      supervisorId: '',
      contractType: 'clt',
      admissionDate: '',
      status: 'active',
      baseSalary: '',
      transportVoucher: '',
      mealVoucher: '',
      weeklyHours: 44
    });
    setFormTab('general');
  };

  const openEditEmployee = (emp: any) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      ...emp,
      roleId: emp.role?.id || '',
      birthDate: emp.birthDate ? emp.birthDate.split('T')[0] : '',
      admissionDate: emp.admissionDate ? emp.admissionDate.split('T')[0] : '',
    });
    setShowEmployeeModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Pessoas</h1>
          <p className="text-slate-500">Gerencie funcionários, cargos e escalas</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'employees' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Funcionários
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'roles' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Cargos
          </button>
        </div>
      </div>

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center bg-slate-50 gap-4">
            <h2 className="font-semibold text-slate-700">Lista de Funcionários</h2>
            
            <div className="flex flex-1 w-full md:w-auto gap-4 justify-end">
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="Buscar funcionário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
              
              <button
                onClick={() => {
                  setEditingEmployee(null);
                  resetEmployeeForm();
                  setShowEmployeeModal(true);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
              >
                <Plus size={20} />
                Novo Funcionário
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-600 text-sm font-semibold">
                <tr>
                  <th className="p-4 text-left">Nome</th>
                  <th className="p-4 text-left">Cargo</th>
                  <th className="p-4 text-left">Contato</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{emp.fullName}</div>
                      <div className="text-xs text-slate-500">CPF: {emp.cpf}</div>
                    </td>
                    <td className="p-4 text-slate-600">{emp.role?.name || '-'}</td>
                    <td className="p-4">
                      <div className="text-sm text-slate-600">{emp.email}</div>
                      <div className="text-xs text-slate-500">{emp.phone}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {emp.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => openEditEmployee(emp)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Edit size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Nenhum funcionário cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="font-semibold text-slate-700">Cargos e Permissões</h2>
            <button
              onClick={() => setShowRoleModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Novo Cargo
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-bold text-slate-800">{role.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{role.description}</p>
              </div>
            ))}
            {roles.length === 0 && (
              <p className="text-slate-500 col-span-3 text-center py-8">Nenhum cargo cadastrado.</p>
            )}
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Novo Cargo</h3>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveRole} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cargo</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={roleForm.name}
                  onChange={e => setRoleForm({...roleForm, name: e.target.value})}
                  placeholder="Ex: Promotor, Supervisor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={roleForm.description}
                  onChange={e => setRoleForm({...roleForm, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">
                {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h3>
              <button onClick={() => setShowEmployeeModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>

            {/* Form Tabs */}
            <div className="flex border-b border-slate-200 px-6 shrink-0">
              <button
                onClick={() => setFormTab('general')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  formTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Dados Gerais
              </button>
              <button
                onClick={() => setFormTab('address')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  formTab === 'address' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Endereço
              </button>
              <button
                onClick={() => setFormTab('contract')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  formTab === 'contract' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Contrato & Vínculo
              </button>
              <button
                onClick={() => setFormTab('schedule')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  formTab === 'schedule' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Escala
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="overflow-y-auto p-6 flex-1">
              {formTab === 'general' && (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.fullName}
                      onChange={e => setEmployeeForm({...employeeForm, fullName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                    <input
                      type="text"
                      required
                      maxLength={14}
                      className={`w-full px-3 py-2 border rounded-lg ${cpfError ? 'border-red-500' : 'border-slate-300'}`}
                      value={employeeForm.cpf}
                      onChange={e => setEmployeeForm({...employeeForm, cpf: formatCPF(e.target.value)})}
                      onBlur={() => setCpfError(validateCPF(employeeForm.cpf) ? '' : 'CPF inválido')}
                      placeholder="000.000.000-00"
                    />
                    {cpfError && <p className="text-red-600 text-xs mt-1">{cpfError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">RG</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.rg}
                      onChange={e => setEmployeeForm({...employeeForm, rg: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.birthDate}
                      onChange={e => setEmployeeForm({...employeeForm, birthDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.email}
                      onChange={e => setEmployeeForm({...employeeForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.phone}
                      onChange={e => setEmployeeForm({...employeeForm, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Foto Facial</h3>
                  <div className="flex items-start gap-4">
                    {facialPhotoPreview ? (
                      <div className="relative">
                        <img 
                          src={facialPhotoPreview} 
                          alt="Preview" 
                          className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFacialPhotoPreview('');
                            setFacialPhotoFile(null);
                            setEmployeeForm({ ...employeeForm, facialPhotoUrl: '' });
                          }}
                          className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white text-gray-400">
                        <span className="text-xs text-center p-2">Sem foto</span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Carregar Foto
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                                alert('Arquivo muito grande. Máximo 5MB.');
                                return;
                            }
                            setFacialPhotoFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                setFacialPhotoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        PNG, JPG ou JPEG até 5MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-900">Acesso ao Aplicativo</h3>
                    <div className="flex items-center">
                      <input
                        id="createAccess"
                        type="checkbox"
                        checked={(employeeForm as any).createAccess || false}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, createAccess: e.target.checked } as any)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="createAccess" className="ml-2 block text-sm text-gray-900">
                        Habilitar acesso
                      </label>
                    </div>
                  </div>
                  
                  {(employeeForm as any).createAccess && (
                    <div className="grid grid-cols-1 gap-6">
                       <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                          <div className="flex">
                            <div className="ml-3">
                              <p className="text-sm text-yellow-700">
                                Isso criará um usuário vinculado a este funcionário com perfil de <strong>Promotor</strong>.
                                O funcionário poderá usar o email cadastrado e a senha abaixo para acessar o App.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Senha de Acesso
                          </label>
                          <input
                            type="text"
                            value={(employeeForm as any).appPassword || ''}
                            onChange={(e) => setEmployeeForm({ ...employeeForm, appPassword: e.target.value } as any)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            placeholder="Digite uma senha inicial"
                          />
                        </div>
                    </div>
                  )}
                </div>
                </>
              )}

              {formTab === 'address' && (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">CEP *</label>
                    <input
                      type="text"
                      required
                      className={`w-full px-3 py-2 border rounded-lg ${cepError ? 'border-red-500' : 'border-slate-300'}`}
                      value={employeeForm.addressZip}
                      onChange={e => setEmployeeForm({...employeeForm, addressZip: formatCEP(e.target.value)})}
                      onBlur={handleCepLookup}
                      placeholder="00000-000"
                    />
                    {cepError && <p className="text-red-600 text-xs mt-1">{cepError}</p>}
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Logradouro *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.addressStreet}
                      onChange={e => setEmployeeForm({...employeeForm, addressStreet: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Número *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.addressNumber}
                      onChange={e => setEmployeeForm({...employeeForm, addressNumber: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bairro *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.addressDistrict}
                      onChange={e => setEmployeeForm({...employeeForm, addressDistrict: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cidade *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.addressCity}
                      onChange={e => setEmployeeForm({...employeeForm, addressCity: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.addressState}
                      onChange={e => setEmployeeForm({...employeeForm, addressState: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {formTab === 'contract' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Matrícula Interna</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.internalCode}
                      onChange={e => setEmployeeForm({...employeeForm, internalCode: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.roleId}
                      onChange={e => setEmployeeForm({...employeeForm, roleId: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Supervisor</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.supervisorId}
                      onChange={e => setEmployeeForm({...employeeForm, supervisorId: e.target.value})}
                    >
                      <option value="">Nenhum</option>
                      {employees.filter(e => e.id !== editingEmployee?.id).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Contrato</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.contractType}
                      onChange={e => setEmployeeForm({...employeeForm, contractType: e.target.value})}
                    >
                      <option value="clt">CLT</option>
                      <option value="pj">PJ</option>
                      <option value="temporario">Temporário</option>
                      <option value="estagio">Estágio</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data de Admissão</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.admissionDate}
                      onChange={e => setEmployeeForm({...employeeForm, admissionDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.status}
                      onChange={e => setEmployeeForm({...employeeForm, status: e.target.value})}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo/Desligado</option>
                      <option value="vacation">Férias/Afastado</option>
                    </select>
                  </div>
                  
                  <div className="col-span-2 mt-4">
                    <h4 className="font-semibold text-slate-800 border-b pb-2 mb-4">Remuneração (Estimativa)</h4>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Salário Base</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.baseSalary}
                      onChange={e => setEmployeeForm({...employeeForm, baseSalary: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vale Transporte</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.transportVoucher}
                      onChange={e => setEmployeeForm({...employeeForm, transportVoucher: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {formTab === 'schedule' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Configuração simplificada de jornada.</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Carga Horária Semanal</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      value={employeeForm.weeklyHours}
                      onChange={e => setEmployeeForm({...employeeForm, weeklyHours: Number(e.target.value)})}
                    />
                  </div>
                  {/* Future: Add day-by-day schedule here */}
                </div>
              )}
            </form>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowEmployeeModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEmployee}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar Funcionário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesView;
