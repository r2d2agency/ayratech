import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, WifiOff, CheckCircle } from 'lucide-react';
import { db } from '../db/db';
import { offlineService } from '../services/offline.service';
import toast from 'react-hot-toast';

const SyncStatus = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Function to check pending count
  const checkPending = useCallback(async () => {
    try {
      const count = await db.pendingActions
        .where('status')
        .anyOf('PENDING', 'ERROR')
        .count();
      setPendingCount(count);
    } catch (error) {
      console.error('Error checking pending actions:', error);
    }
  }, []);

  // Function to perform sync
  const performSync = useCallback(async () => {
    // Allow manual sync attempt even if navigator says offline
    // because navigator.onLine can be unreliable
    
    setIsSyncing(true);
    try {
      // Force sync attempt
      await offlineService.syncPendingActions(true);
      await checkPending(); // Update count after sync
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar. Tente novamente.');
    } finally {
      setIsSyncing(false);
    }
  }, [checkPending]);

  // Effect for online/offline status and auto-sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      performSync(); // Auto-sync when coming online
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkPending();
    
    // Poll pending count every 5s
    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [performSync, checkPending]);

  // Don't render anything if no pending items and not syncing
  if (pendingCount === 0 && !isSyncing) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
      <button
        onClick={performSync}
        disabled={isSyncing}
        className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${
          isSyncing 
             ? 'bg-blue-600 text-white cursor-wait pr-5'
             : isOnline 
               ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95' 
               : 'bg-slate-700 text-slate-300 hover:bg-slate-600 active:scale-95'
        }`}
      >
        {isSyncing ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : isOnline ? (
          <RefreshCw size={16} />
        ) : (
          <WifiOff size={16} />
        )}
        
        <div className="flex flex-col items-start leading-tight">
           <span className="text-xs font-bold">
             {isSyncing ? 'Sincronizando...' : `${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`}
           </span>
           {!isSyncing && (
             <span className="text-[10px] opacity-80 font-medium">
               {isOnline ? 'Toque para enviar' : 'Toque para forçar envio'}
             </span>
           )}
        </div>
      </button>
    </div>
  );
};

export default SyncStatus;
