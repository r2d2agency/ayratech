
export interface Client {
  id: string;
  nome: string;
  logo: string;
  totalProdutos: number;
  status: boolean;
}

export interface Product {
  id: string;
  nome: string;
  sku: string;
  categoria: string;
  clientId: string;
  imagem: string;
}

export interface RouteAssignment {
  id: string;
  promoterId: string;
  data: string;
  periodo: 'Manhã' | 'Tarde' | 'Integral';
  supermarketId: string;
  clientsIds: string[]; // Marcas que ele vai atender nessa visita
  status: 'Pendente' | 'Em Andamento' | 'Concluído';
}

export interface SupermarketData {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  redeFranquia: string;
  classificacao: 'Ouro' | 'Prata' | 'Bronze';
  status: boolean;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  nomeGerente: string;
  email: string;
  telefone: string;
  horarioAbertura: string;
  horarioFechamento: string;
  observacoes: string;
  marcasVinculadas: string[];
}

export interface Promoter {
  id: string;
  nome: string;
  status: 'Em Rota' | 'Pausa' | 'Offline';
  ultimaVisita: string;
  totalVisitasHoje: number;
  foto: string;
  lat?: number;
  lng?: number;
  atividadeAtual?: string;
}

export type ViewType = 'dashboard' | 'supermarkets_list' | 'supermarket_form' | 'promoters' | 'clients' | 'products' | 'routes' | 'live_map' | 'admin';

export const INITIAL_DATA: SupermarketData = {
  id: '',
  nomeFantasia: '',
  razaoSocial: '',
  cnpj: '',
  redeFranquia: '',
  classificacao: 'Ouro',
  status: true,
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  nomeGerente: '',
  email: '',
  telefone: '',
  horarioAbertura: '08:00',
  horarioFechamento: '22:00',
  observacoes: '',
  marcasVinculadas: []
};
