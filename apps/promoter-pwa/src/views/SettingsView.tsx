import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Wifi, WifiOff, Database, Smartphone } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { offlineService } from '../services/offline.service';
import { toast } from 'react-hot-toast';
import { APP_VERSION } from '../version';

export default function SettingsView() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // SW hook for manual check
  const {
    updateServiceWorker,
    update
  } = useRegisterSW({
    onRegisterError(error) {
      console.log('SW registration error', error);
      toast.error('Erro ao verificar atualizações');
    }
  });

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    
    loadPendingCount();

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const loadPendingCount = async () => {
    const count = await offlineService.getPendingCount();
    setPendingCount(count);
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      await update();
      // If no update is found immediately, give feedback
      // Note: If update is found, ReloadPrompt component (global) will likely trigger the toast
      // or the browser will handle the lifecycle.
      toast.success('Verificação de atualização iniciada');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao verificar atualização');
    } finally {
      setTimeout(() => setCheckingUpdate(false), 1000);
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      toast.error('Você está offline. Conecte-se para sincronizar.');
      return;
    }

    setSyncing(true);
    try {
      await offlineService.syncPendingActions();
      const count = await offlineService.getPendingCount();
      setPendingCount(count);
      toast.success('Sincronização concluída!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao sincronizar dados.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Configurações</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Network Status Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium text-gray-900">Status da Conexão</h2>
            {isOnline ? (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <Wifi size={14} /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                <WifiOff size={14} /> Offline
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {isOnline 
              ? 'Você está conectado à internet. O aplicativo pode sincronizar dados.' 
              : 'Você está sem internet. Os dados serão salvos localmente.'}
          </p>
        </div>

        {/* Sync Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-4 border-b border-gray-50">
            <h2 className="font-medium text-gray-900 flex items-center gap-2">
              <Database size={18} className="text-blue-500" />
              Sincronização de Dados
            </h2>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">Ações pendentes de envio</span>
              <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                {pendingCount}
              </span>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing || !isOnline}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors ${
                syncing || !isOnline
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
            </button>
          </div>
        </div>

        {/* App Version Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-4 border-b border-gray-50">
            <h2 className="font-medium text-gray-900 flex items-center gap-2">
              <Smartphone size={18} className="text-purple-500" />
              Versão do Aplicativo
            </h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">
              Mantenha o aplicativo atualizado para receber as últimas funcionalidades e correções.
            </p>
            <button
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors border-2 ${
                checkingUpdate
                  ? 'border-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-purple-100 text-purple-600 hover:bg-purple-50 active:bg-purple-100'
              }`}
            >
              <RefreshCw size={18} className={checkingUpdate ? 'animate-spin' : ''} />
              {checkingUpdate ? 'Verificando...' : 'Verificar Atualizações'}
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 mt-8">
          Ayratech Promotor v{APP_VERSION}
        </div>
      </div>
    </div>
  );
}
