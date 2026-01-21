import { useState, useEffect } from 'react';
import client from '../api/client';
import { toast, Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, Coffee, LogIn, LogOut, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TimeClockEvent {
  id: string;
  eventType: 'ENTRY' | 'LUNCH_START' | 'LUNCH_END' | 'EXIT';
  timestamp: string;
}

interface TodayStatus {
  events: TimeClockEvent[];
  nextAction: 'ENTRY' | 'LUNCH_START' | 'LUNCH_END' | 'EXIT' | 'DONE';
  status: 'PENDING' | 'WORKING' | 'LUNCH' | 'DONE';
  summary: {
    entry?: string;
    lunchStart?: string;
    lunchEnd?: string;
    exit?: string;
  };
}

export default function TimeClockView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [data, setData] = useState<TodayStatus | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await client.get('/time-clock/status/today');
      setData(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados do ponto');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!data) return;

    setProcessing(true);
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada');
      setProcessing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        await client.post('/time-clock', {
          eventType: data.nextAction,
          timestamp: new Date().toISOString(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        toast.success('Ponto registrado com sucesso!');
        fetchStatus();
      } catch (error) {
        console.error(error);
        toast.error('Erro ao registrar ponto');
      } finally {
        setProcessing(false);
      }
    }, (error) => {
      toast.error('Erro de localização: ' + error.message);
      setProcessing(false);
    }, { enableHighAccuracy: true });
  };

  const getButtonConfig = () => {
    switch (data?.nextAction) {
      case 'ENTRY': return { label: 'Registrar Entrada', icon: LogIn, color: 'bg-green-600 hover:bg-green-700' };
      case 'LUNCH_START': return { label: 'Início Almoço', icon: Coffee, color: 'bg-orange-500 hover:bg-orange-600' };
      case 'LUNCH_END': return { label: 'Volta Almoço', icon: Coffee, color: 'bg-orange-500 hover:bg-orange-600' };
      case 'EXIT': return { label: 'Registrar Saída', icon: LogOut, color: 'bg-red-600 hover:bg-red-700' };
      case 'DONE': return { label: 'Dia Finalizado', icon: CheckCircle, color: 'bg-gray-400 cursor-not-allowed', disabled: true };
      default: return { label: 'Carregando...', icon: Clock, color: 'bg-gray-400' };
    }
  };

  const CheckCircle = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );

  const btnConfig = getButtonConfig();
  const Icon = btnConfig.icon;

  if (loading) return <div className="h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="bg-white p-4 shadow-sm flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="p-1">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-800 text-lg">Ponto Eletrônico</h1>
      </div>

      <div className="p-6 flex flex-col items-center gap-8">
        
        {/* Clock Display */}
        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="text-gray-500 font-medium text-lg capitalize">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </div>
          <div className="text-5xl font-bold text-gray-800 tracking-wider font-mono">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${
            data?.status === 'WORKING' ? 'bg-green-100 text-green-700' :
            data?.status === 'LUNCH' ? 'bg-orange-100 text-orange-700' :
            data?.status === 'DONE' ? 'bg-gray-200 text-gray-600' :
            'bg-gray-100 text-gray-500'
          }`}>
            {data?.status === 'WORKING' ? 'Em Jornada' :
             data?.status === 'LUNCH' ? 'Em Almoço' :
             data?.status === 'DONE' ? 'Jornada Finalizada' : 'Aguardando Início'}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRegister}
          disabled={processing || btnConfig.disabled}
          className={`w-64 h-64 rounded-full shadow-lg flex flex-col items-center justify-center gap-4 text-white transition-transform active:scale-95 ${btnConfig.color} ${processing ? 'opacity-75' : ''}`}
        >
          {processing ? (
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
          ) : (
            <>
              <Icon size={64} />
              <span className="text-2xl font-bold">{btnConfig.label}</span>
            </>
          )}
        </button>

        {/* Summary Card */}
        <div className="w-full bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
            <Clock size={18} /> Resumo do Dia
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-gray-500">Entrada</span>
              <p className="font-mono font-medium text-gray-800">
                {data?.summary.entry ? format(new Date(data.summary.entry), 'HH:mm') : '--:--'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-500">Saída Almoço</span>
              <p className="font-mono font-medium text-gray-800">
                {data?.summary.lunchStart ? format(new Date(data.summary.lunchStart), 'HH:mm') : '--:--'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-500">Volta Almoço</span>
              <p className="font-mono font-medium text-gray-800">
                {data?.summary.lunchEnd ? format(new Date(data.summary.lunchEnd), 'HH:mm') : '--:--'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-500">Saída</span>
              <p className="font-mono font-medium text-gray-800">
                {data?.summary.exit ? format(new Date(data.summary.exit), 'HH:mm') : '--:--'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}