import React, { useState } from 'react';
import { useBranding } from '../context/BrandingContext';
import api from '../api/client';

interface LoginViewProps {
  onLogin: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const { settings } = useBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.access_token);
      onLogin();
    } catch (err) {
      setError('Login falhou. Verifique suas credenciais.');
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      setError('Preencha usuário e senha para registrar.');
      return;
    }
    try {
      await api.post('/auth/register', { email, password });
      alert('Usuário criado com sucesso! Agora clique em Entrar.');
      setError('');
    } catch (err: any) {
      console.error('Registration error:', err);
      let errorMessage = 'Erro ao criar usuário.';
      
      if (err.response?.data?.message) {
        const msg = err.response.data.message;
        errorMessage = Array.isArray(msg) ? msg.join(', ') : msg;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(`Erro no registro: ${errorMessage}`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: settings.primaryColor }}>Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Senha</label>
            <input
              type="password"
              className="w-full px-3 py-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full text-white font-bold py-2 px-4 rounded hover:opacity-90 transition-colors"
            style={{ backgroundColor: settings.primaryColor }}
          >
            Entrar
          </button>
           <button
            type="button"
            onClick={handleRegister}
            className="w-full mt-2 text-gray-600 font-bold py-2 px-4 rounded border hover:bg-gray-50 transition-colors"
          >
            Registrar (Dev)
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
