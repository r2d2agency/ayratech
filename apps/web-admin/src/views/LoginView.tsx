import React, { useState } from 'react';
import { useBranding } from '../context/BrandingContext';
import api from '../api/client';

interface LoginViewProps {
  onLogin: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const { branding } = useBranding();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.access_token);
      onLogin();
    } catch (err) {
      setError('Login falhou. Verifique suas credenciais.');
    }
  };

  const handleRegister = async () => {
     try {
      await api.post('/auth/register', { username, password, name: username, role: 'admin' });
      alert('Usuário criado! Faça login.');
    } catch (err) {
      setError('Erro ao criar usuário.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100" style={{ fontFamily: branding.fontFamily }}>
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: branding.primaryColor }}>Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Usuário</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            style={{ backgroundColor: branding.primaryColor }}
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
