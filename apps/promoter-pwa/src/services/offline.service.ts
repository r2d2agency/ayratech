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

    const pendingActions = await db.pendingActions
      .where('status')
      .equals('PENDING')
      .toArray();

    if (pendingActions.length === 0) return;

    const toastId = toast.loading(`Sincronizando ${pendingActions.length} ações pendentes...`);

    for (const action of pendingActions) {
      try {
        await db.pendingActions.update(action.id!, { status: 'SYNCING' });

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
        
      } catch (error) {
        console.error(`Error syncing action ${action.id}:`, error);
        await db.pendingActions.update(action.id!, { 
          status: 'ERROR', 
          error: String(error),
          retryCount: action.retryCount + 1 
        });
      }
    }

    toast.dismiss(toastId);
    
    const remaining = await db.pendingActions.where('status').equals('PENDING').count();
    if (remaining === 0) {
      toast.success('Sincronização concluída!');
    } else {
      toast.error(`${remaining} ações não puderam ser sincronizadas.`);
    }
  }

  async getPendingCount() {
    return await db.pendingActions.where('status').anyOf('PENDING', 'ERROR').count();
  }
}

export const offlineService = new OfflineService();
