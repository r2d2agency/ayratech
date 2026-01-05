import { Client, Product, SupermarketData, Promoter, INITIAL_DATA } from './types';

export const mockClients: Client[] = [
  { id: 'c1', nome: 'Nestlé', logo: 'https://logo.clearbit.com/nestle.com', totalProdutos: 42, status: true },
  { id: 'c2', nome: 'Coca-Cola', logo: 'https://logo.clearbit.com/cocacola.com', totalProdutos: 18, status: true },
  { id: 'c3', nome: 'P&G', logo: 'https://logo.clearbit.com/pg.com', totalProdutos: 56, status: true },
  { id: 'c4', nome: 'Unilever', logo: 'https://logo.clearbit.com/unilever.com', totalProdutos: 89, status: true },
];

export const mockProducts: Product[] = [
  { id: 'p1', nome: 'Nescafé Original 200g', sku: '789123456', categoria: 'Mercearia Doce', clientId: 'c1', imagem: 'https://picsum.photos/200?random=1' },
  { id: 'p2', nome: 'Coca-Cola Zero 2L', sku: '789654321', categoria: 'Bebidas', clientId: 'c2', imagem: 'https://picsum.photos/200?random=2' },
  { id: 'p3', nome: 'Ariel Líquido 3L', sku: '789000111', categoria: 'Limpeza', clientId: 'c3', imagem: 'https://picsum.photos/200?random=3' },
];

export const mockSupermarkets: SupermarketData[] = [
  { ...INITIAL_DATA, id: 's1', nomeFantasia: 'Pão de Açúcar - Oscar Freire', redeFranquia: 'GPA', classificacao: 'Ouro', cidade: 'São Paulo', estado: 'SP', status: true },
  { ...INITIAL_DATA, id: 's2', nomeFantasia: 'Carrefour Express - Paulista', redeFranquia: 'Carrefour', classificacao: 'Prata', cidade: 'São Paulo', estado: 'SP', status: true },
];

export const mockPromoters: Promoter[] = [
  { id: 'pr1', nome: 'Ricardo Silva', status: 'Em Rota', ultimaVisita: '10:45', totalVisitasHoje: 3, foto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ricardo', atividadeAtual: 'Reposição Nestlé' },
  { id: 'pr2', nome: 'Ana Oliveira', status: 'Em Rota', ultimaVisita: '11:02', totalVisitasHoje: 2, foto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana', atividadeAtual: 'Foto de Gôndola Coca-Cola' },
];
