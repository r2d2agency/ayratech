import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { FileText, Download, Upload, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast, Toaster } from 'react-hot-toast';
import { format } from 'date-fns';

const DocumentsView = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      const employeeId = user?.employee?.id;
      
      if (employeeId) {
        const response = await client.get(`/employees/${employeeId}/documents`); 
        setDocuments(response.data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Only show error toast if not 404 (handled by empty state)
      if ((error as any).response?.status !== 404) {
          toast.error('Erro ao carregar documentos');
      }
    } finally {
      setLoading(false);
    }
  };

  const getDownloadUrl = (url: string) => {
    if (!url) return '#';
    if (url.startsWith('http')) return url;
    // Remove leading slash if present to avoid double slash issues
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    // Construct full URL using API base URL
    return `${import.meta.env.VITE_API_URL || 'https://api.ayratech.app.br'}/${cleanUrl}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsModalOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', 'Outros'); // Default type
    formData.append('description', description); // Add description

    setUploading(true);
    try {
      const employeeId = user?.employee?.id;
      
      if (employeeId) {
        await client.post(`/employees/${employeeId}/documents`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Documento enviado com sucesso!');
        fetchDocuments();
        setIsModalOpen(false);
        setSelectedFile(null);
        setDescription('');
      } else {
        toast.error('Erro: Funcionário não identificado');
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
          Upload
          <input type="file" className="hidden" onChange={handleFileSelect} />
        </label>
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Enviar Documento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500">
                <X size={24} />
              </button>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Arquivo Selecionado:</p>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 p-2 rounded">
                <FileText size={16} />
                <span className="truncate">{selectedFile?.name}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Observação</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Comprovante de vacinação..."
                className="w-full border rounded-lg p-2 text-sm h-24"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
               <button 
                 onClick={() => setIsModalOpen(false)}
                 className="px-4 py-2 text-gray-600 font-medium"
               >
                 Cancelar
               </button>
               <button 
                 onClick={handleUpload}
                 disabled={uploading}
                 className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
               >
                 {uploading ? 'Enviando...' : 'Enviar'}
               </button>
            </div>
          </div>
        </div>
      )}

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
                 href={getDownloadUrl(doc.fileUrl)} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                 download // Hint to browser to download
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