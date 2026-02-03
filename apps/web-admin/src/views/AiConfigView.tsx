import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import api from '../services/api';

const AiConfigView: React.FC = () => {
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/ai/config');
      if (response.data) {
        setProvider(response.data.provider);
        setApiKey(response.data.apiKey);
        setModel(response.data.model || '');
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/ai/config', {
        provider,
        apiKey,
        model,
        isActive: true,
      });
      setMessage({ type: 'success', text: 'Configuração salva com sucesso!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar configuração.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Configuração de Inteligência Artificial
      </Typography>

      <Card>
        <CardContent>
          <Box display="flex" flexDirection="column" gap={3} maxWidth={600}>
            {message && <Alert severity={message.type}>{message.text}</Alert>}

            <FormControl fullWidth>
              <InputLabel>Provedor de IA</InputLabel>
              <Select
                value={provider}
                label="Provedor de IA"
                onChange={(e) => setProvider(e.target.value)}
              >
                <MenuItem value="gemini">Google Gemini</MenuItem>
                <MenuItem value="openai">OpenAI (GPT-4)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="API Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              fullWidth
              helperText="Insira a chave de API do provedor selecionado"
            />

            <TextField
              label="Modelo (Opcional)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              fullWidth
              placeholder={provider === 'gemini' ? 'gemini-pro-vision' : 'gpt-4-vision-preview'}
              helperText="Deixe em branco para usar o padrão"
            />

            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AiConfigView;
