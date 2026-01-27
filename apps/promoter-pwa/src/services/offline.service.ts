import { db, PendingAction } from '../db/db';
import client from '../api/client';
import toast from 'react-hot-toast';

class OfflineService {
  async saveRoute(route: any) {
    try {
      await db.routes.put({
        id: route.id,
        date: route.date,
        promoterId: route.promoter?.id,
        items: route.items,
        status: route.status,
        syncedAt: new Date()
      });
      console.log('Route cached offline:', route.id);
    } catch (error) {
      console.error('Error caching route:', error);
    }
  }

  async getRoute(routeId: string) {
    return await db.routes.get(routeId);
  }

  async addPendingAction(
    type: PendingAction['type'],
    url: string,
    method: PendingAction['method'],
    payload: any
  ) {
    try {
      await db.pendingActions.add({
        type,
        url,
        method,
        payload,
        createdAt: new Date(),
        status: 'PENDING',
        retryCount: 0
      });
      toast.success('Ação salva offline. Será sincronizada quando houver conexão.');
      
      // Try to sync immediately if online
      if (navigator.onLine) {
        this.syncPendingActions();
      }
    } catch (error) {
      console.error('Error saving pending action:', error);
      toast.error('Erro ao salvar ação offline.');
    }
  }

  async syncPendingActions() {
    if (!navigator.onLine) return;

    // Fetch both PENDING and ERROR status to retry failed attempts
    const pendingActions = await db.pendingActions
      .where('status')
      .anyOf('PENDING', 'ERROR')
      .toArray();

    if (pendingActions.length === 0) return;

    // Sort by createdAt to ensure correct order (Entry -> Lunch -> Exit)
    pendingActions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const toastId = toast.loading(`Sincronizando ${pendingActions.length} ações pendentes...`);

    let successCount = 0;
    let failCount = 0;

    for (const action of pendingActions) {
      try {
        await db.pendingActions.update(action.id!, { status: 'SYNCING' });

        console.log(`Syncing action ${action.type}: ${action.url}`, action.payload);

        // Execute API call
        if (action.method === 'POST') {
          await client.post(action.url, action.payload);
        } else if (action.method === 'PUT') {
          await client.put(action.url, action.payload);
        } else if (action.method === 'PATCH') {
          await client.patch(action.url, action.payload);
        }

        // Remove from DB on success
        await db.pendingActions.delete(action.id!);
        successCount++;
        
      } catch (error: any) {
        console.error(`Error syncing action ${action.id}:`, error);
        const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido';
        console.error(`Sync failure details:`, errorMessage);
        
        // If it's a 4xx error (client error), maybe we should not retry endlessly?
        // But for now, let's keep it as ERROR so user knows.
        // Exception: 409 Conflict (already exists) -> treat as success?
        if (error.response && error.response.status === 409) {
             console.warn('Action conflict (already exists), removing from queue:', action.id);
             await db.pendingActions.delete(action.id!);
             successCount++;
        } else {
             await db.pendingActions.update(action.id!, { 
               status: 'ERROR', 
               error: errorMessage,
               retryCount: (action.retryCount || 0) + 1 
             });
             failCount++;
        }
      }
    }

    toast.dismiss(toastId);
    
    if (failCount === 0) {
      toast.success('Sincronização concluída com sucesso!');
    } else {
      toast.error(`${failCount} ações falharam. Verifique o console para detalhes.`);
    }
    
    // Refresh pending count UI
    // We can emit an event or rely on components polling/checking
  }

  async getPendingCount() {
    return await db.pendingActions.where('status').anyOf('PENDING', 'ERROR').count();
  }
}

export const offlineService = new OfflineService();
