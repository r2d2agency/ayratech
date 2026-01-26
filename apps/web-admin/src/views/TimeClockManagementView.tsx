import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, User, Clock, Plus, Filter, Search, FileText, Download, AlertTriangle, X } from 'lucide-react';
import api, { API_URL } from '../api/client';
import SectionHeader from '../components/SectionHeader';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

interface Alert {
  id: string;
  employeeName: string;
  label: string;
  scheduledTime: string;
  delayMinutes: number;
  message: string;
  timestamp: Date;
}

const TimeClockManagementView = () => {
  const [events, setEvents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filters, setFilters] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    employeeId: ''
  });
  const [showModal, setShowModal] = useState(false);
  const initialEventState = {
    employeeId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '08:00',
    eventType: 'ENTRY',
    observation: ''
  };

  const [newEvent, setNewEvent] = useState(initialEventState);

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchEvents();

    const socket = io(API_URL + '/time-clock');

    socket.on('connect', () => {
      console.log('Connected to TimeClock WebSocket');
    });

    socket.on('hr-alert', (alert: any) => {
      console.log('Received HR Alert:', alert);
      toast((t) => (
        <div className="flex items-start gap-2">
           <AlertTriangle className="text-red-500" size={24} />
           <div>
             <p className="font-bold">Alerta de Ponto</p>
             <p className="text-sm">{alert.message}</p>
           </div>
        </div>
      ), { duration: 5000 });

      setAlerts(prev => [{ ...alert, id: Math.random().toString(36).substr(2, 9), timestamp: new Date() }, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []); // Initial load

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm) {
        setIsSearching(true);
        try {
          const response = await api.get(`/employees?search=${searchTerm}`);
          setFilteredEmployees(response.data);
        } catch (error) {
          console.error('Error searching employees', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setFilteredEmployees([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Erro ao buscar funcionários', error);
      toast.error('Erro ao carregar funcionários');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/time-clock/export', {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          employeeId: filters.employeeId
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_ponto_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erro ao exportar relatório', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      
      const res = await api.get(`/time-clock?${params.toString()}`);
      setEvents(res.data);
    } catch (error) {
      toast.error('Erro ao carregar registros de ponto');
    }
  };

  const handleManualEntry = async () => {
    try {
        if (!newEvent.employeeId || !newEvent.date || !newEvent.time) {
            toast.error('Preencha todos os campos obrigatórios');
            return;
        }

        const timestamp = new Date(`${newEvent.date}T${newEvent.time}:00`);

        await api.post('/time-clock/entry/manual', {
        employeeId: newEvent.employeeId,
        eventType: newEvent.eventType,
        timestamp: timestamp.toISOString(),
        observation: newEvent.observation
      });

      toast.success('Registro manual adicionado com sucesso!');
      setShowModal(false);
      setNewEvent(initialEventState);
      setSearchTerm('');
      setFilteredEmployees([]);
      fetchEvents();
    } catch (error: any) {
      console.error('Erro ao registrar ponto manual:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao adicionar registro manual';
      toast.error(`Erro: ${errorMessage}`);
    }
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const getEventTypeLabel = (type: string) => {
      const map: any = {
          'ENTRY': 'Entrada',
          'LUNCH_START': 'Início Almoço',
          'LUNCH_END': 'Fim Almoço',
          'EXIT': 'Saída'
      };
      return map[type] || type;
  };

  const getEventTypeColor = (type: string) => {
      const map: any = {
          'ENTRY': 'bg-green-100 text-green-800',
          'LUNCH_START': 'bg-yellow-100 text-yellow-800',
          'LUNCH_END': 'bg-orange-100 text-orange-800',
          'EXIT': 'bg-red-100 text-red-800'
      };
      return map[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="flex justify-between items-center">
            <SectionHeader 
                icon={<Clock size={24} className="text-blue-600" />} 
                title="Gestão de Ponto Eletrônico" 
                subtitle="Visualize e gerencie os registros de ponto dos colaboradores."
            />
            <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
          >
            <Download size={20} /> Exportar Excel
          </button>
          <button 
            onClick={() => {
                setNewEvent(initialEventState);
                setSearchTerm('');
                setFilteredEmployees([]);
                setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
          >
            <Plus size={20} /> Lançamento Manual
          </button>
        </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-red-600 flex items-center gap-2">
              <AlertTriangle size={20} />
              Alertas de Ponto ({alerts.length})
            </h3>
            <div className="grid gap-2">
              {alerts.map(alert => (
                <div key={alert.id} className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-full text-red-600">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-red-900">{alert.message}</p>
                      <p className="text-sm text-red-700">
                        {format(new Date(alert.timestamp), "HH:mm")} - {alert.employeeName} ({alert.label} agendado para {alert.scheduledTime})
                      </p>
                    </div>
                  </div>
                  <button onClick={() => removeAlert(alert.id)} className="text-red-400 hover:text-red-600">
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Colaborador</label>
                <select 
                    className="border border-slate-300 rounded-lg p-2 w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={filters.employeeId}
                    onChange={(e) => setFilters({...filters, employeeId: e.target.value})}
                >
                    <option value="">Todos</option>
                    {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
                <input 
                    type="date" 
                    className="border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
                <input 
                    type="date" 
                    className="border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                />
            </div>
            <button 
                onClick={fetchEvents}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 flex items-center gap-2"
            >
                <Filter size={18} /> Filtrar
            </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Colaborador</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Data/Hora</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Tipo</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Origem</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Observação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {events.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td>
                        </tr>
                    ) : (
                        events.map((event: any) => (
                            <tr key={event.id} className="hover:bg-slate-50">
                                <td className="p-4">
                                    <div className="font-medium text-slate-900">{event.employee?.fullName}</div>
                                    <div className="text-xs text-slate-500">{event.employee?.email}</div>
                                </td>
                                <td className="p-4 text-slate-700">
                                    {format(new Date(event.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getEventTypeColor(event.eventType)}`}>
                                        {getEventTypeLabel(event.eventType)}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {event.isManual ? (
                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium" title={`Editado por: ${event.editedBy}`}>
                                            Manual ({event.editedBy})
                                        </span>
                                    ) : (
                                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium">App</span>
                                    )}
                                </td>
                                <td className="p-4 text-sm text-slate-500 max-w-xs truncate">
                                    {event.validationReason || '-'}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* Modal */}
        {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                    <h2 className="text-xl font-bold mb-4">Lançamento Manual de Ponto</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Colaborador</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Digite para buscar..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-3">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    </div>
                                )}
                                {isDropdownOpen && filteredEmployees.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                                        {filteredEmployees.map((emp: any) => (
                                            <div
                                                key={emp.id}
                                                className="p-2 hover:bg-gray-50 cursor-pointer flex flex-col"
                                                onClick={() => {
                                                    setNewEvent({ ...newEvent, employeeId: emp.id });
                                                    setSearchTerm(emp.fullName);
                                                    setIsDropdownOpen(false);
                                                }}
                                            >
                                                <span className="font-medium">{emp.fullName}</span>
                                                <span className="text-xs text-gray-500">{emp.email}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {newEvent.employeeId && !isDropdownOpen && (
                                    <div className="text-xs text-green-600 mt-1 font-medium">
                                        Selecionado: {filteredEmployees.find((e: any) => e.id === newEvent.employeeId)?.fullName || searchTerm}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Data</label>
                                <input 
                                    type="date" 
                                    className="w-full border rounded-lg p-2"
                                    value={newEvent.date}
                                    onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Hora</label>
                                <input 
                                    type="time" 
                                    className="w-full border rounded-lg p-2"
                                    value={newEvent.time}
                                    onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tipo de Evento</label>
                            <select 
                                className="w-full border rounded-lg p-2"
                                value={newEvent.eventType}
                                onChange={(e) => setNewEvent({...newEvent, eventType: e.target.value})}
                            >
                                <option value="ENTRY">Entrada</option>
                                <option value="LUNCH_START">Início Almoço</option>
                                <option value="LUNCH_END">Fim Almoço</option>
                                <option value="EXIT">Saída</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Observação / Justificativa</label>
                            <textarea 
                                className="w-full border rounded-lg p-2"
                                rows={3}
                                value={newEvent.observation}
                                onChange={(e) => setNewEvent({...newEvent, observation: e.target.value})}
                                placeholder="Ex: Esqueceu de bater o ponto..."
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button 
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleManualEntry}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            Salvar Registro
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default TimeClockManagementView;