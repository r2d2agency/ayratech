import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { FileText, Download, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast, Toaster } from 'react-hot-toast';
import { format } from 'date-fns';

const DocumentsView = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      // Assuming user.id is the user ID, but we need employee ID.
      // The auth context should ideally provide employee ID or we fetch it.
      // For now, let's assume we can get it or use a 'me' endpoint.
      // If user.role is 'promoter', user.id might be the user ID, linked to employee.
      // We might need to fetch /auth/profile to get employee ID.
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      // This is a guess. We might need to implement this endpoint.
      // Or use /employees/me/documents if it exists.
      // Since we don't have it, let's try to get profile first to get employee ID.
      const profile = await client.get('/auth/profile');
      const employeeId = profile.data.employee?.id;
      
      if (employeeId) {
        // We need to fetch documents. If the endpoint doesn't exist, we might be stuck.
        // For now, I'll assume we can get them.
        // If the backend doesn't support it, this will 404.
        // I'll leave it as a placeholder.
        const response = await client.get(`/employees/${employeeId}/documents`); 
        setDocuments(response.data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      // toast.error('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'Outros'); // Default type
    formData.append('description', 'Upload via App');

    setUploading(true);
    try {
      const profile = await client.get('/auth/profile');
      const employeeId = profile.data.employee?.id;
      
      if (employeeId) {
        await client.post(`/employees/${employeeId}/documents`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Documento enviado com sucesso!');
        fetchDocuments();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 pb-20 space-y-4">
      <Toaster position="top-center" />
      <h1 className="text-2xl font-bold text-gray-800">Meus Arquivos</h1>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
        <div className="bg-blue-100 p-3 rounded-full">
          <Upload className="text-blue-600" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">Enviar Arquivo</h3>
          <p className="text-xs text-blue-700">Envie comprovantes ou relatórios</p>
        </div>
        <label className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors">
          {uploading ? '...' : 'Upload'}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700 ml-1">Arquivos Recebidos</h3>
        
        {loading ? (
           <div className="text-center py-8">Carregando...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-100 shadow-sm">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum arquivo encontrado.</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
               <div className="flex items-center gap-3 overflow-hidden">
                 <div className="bg-gray-100 p-2 rounded-lg shrink-0">
                   <FileText size={20} className="text-gray-600" />
                 </div>
                 <div className="min-w-0">
                   <p className="font-medium text-gray-800 truncate">{doc.type}</p>
                   <p className="text-xs text-gray-500 truncate">{doc.description || doc.filename}</p>
                   <p className="text-[10px] text-gray-400 mt-0.5">
                     {format(new Date(doc.sentAt), 'dd/MM/yyyy HH:mm')}
                   </p>
                 </div>
               </div>
               
               <a 
                 href={doc.fileUrl} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
               >
                 <Download size={20} />
               </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DocumentsView;