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

  async getRoutesByDate(date: string) {
    // Busca rotas que começam com a data (YYYY-MM-DD)
    return await db.routes
      .where('date')
      .startsWith(date)
      .toArray();
  }

  async getAllRoutes() {
    return await db.routes.toArray();
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
        if (action.type === 'DOCUMENT_UPLOAD') {
             // Reconstruct FormData for file upload
             const formData = new FormData();
             const { fileBase64, filename, type, description } = action.payload;
             
             // Convert Base64 to Blob
             const res = await fetch(fileBase64);
             const blob = await res.blob();
             
             formData.append('file', blob, filename);
             formData.append('type', type || 'Outros');
             formData.append('description', description || '');
             
             await client.post(action.url, formData, {
                 headers: { 'Content-Type': 'multipart/form-data' }
             });
        } else if (action.method === 'POST') {
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
        const statusCode = error.response?.status;

        console.error(`Sync failure details for ${action.type}:`, errorMessage, statusCode);
        
        // Se for 400 (Bad Request), o erro pode ser fatal (dados inválidos)
        // Se for "Usuário não vinculado", precisamos avisar o usuário para relogar
        if (statusCode === 400 && errorMessage.includes('não vinculado')) {
             toast.error('Sessão inválida: Faça logout e login novamente.', { duration: 5000 });
        }

        // Exception: 409 Conflict (already exists) -> treat as success?
        if (statusCode === 409) {
             console.warn('Action conflict (already exists), removing from queue:', action.id);
             await db.pendingActions.delete(action.id!);
             successCount++;
        } else {
             // Atualiza com erro detalhado
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
      // Get the last error message to show to the user
      // Recarrega as ações para pegar o erro atualizado do DB
      const failedActions = await db.pendingActions.where('status').equals('ERROR').toArray();
      const lastErrorAction = failedActions[failedActions.length - 1];
      
      const errorMsg = lastErrorAction?.error || 'Verifique sua conexão e tente novamente.';
      
      // Toast persistente se for erro de validação
      toast.error(`${failCount} falhas: ${errorMsg}`, {
        duration: 6000,
        style: { maxWidth: '500px' }
      });
    }
    
    // Refresh pending count UI
    // We can emit an event or rely on components polling/checking
  }

  async getPendingCount() {
    return await db.pendingActions.where('status').anyOf('PENDING', 'ERROR', 'SYNCING').count();
  }

  async getPendingActionsByType(type: PendingAction['type']) {
    return await db.pendingActions
      .where('type')
      .equals(type)
      .filter(item => item.status === 'PENDING' || item.status === 'ERROR' || item.status === 'SYNCING')
      .toArray();
  }
}

export const offlineService = new OfflineService();
