# Regras de Negócio - Ayratech Merchandising

Este documento detalha as regras de negócio e fluxos operacionais do sistema Ayratech, servindo como guia para desenvolvimento e ajustes futuros.

## 1. Atores do Sistema

*   **Administrador (Admin):** Usuário da Agência/Ayratech. Tem acesso total ao sistema, configurações de branding, gestão de usuários e visão global de todos os clientes.
*   **Cliente (Fabricante/Marca):** Empresa contratante do serviço de merchandising. Visualiza apenas seus próprios produtos, relatórios e desempenho.
*   **Supervisor:** Responsável por uma equipe de promotores e uma rota de supermercados.
*   **Promotor:** Usuário de campo (App Mobile). Realiza as visitas, check-in, coleta de dados e fotos.

## 2. Estrutura de Dados Principal

### 2.1. Clientes (Fabricantes)
*   Cada cliente possui um contrato ativo ou inativo.
*   Um cliente pode ter múltiplos produtos (SKUs).
*   **Regra:** Um produto DEVE pertencer a um único cliente.
*   **Branding:** O sistema pode adaptar cores e logos na visualização do dashboard do cliente (white-label parcial).

### 2.2. Produtos (SKUs)
*   Itens que serão auditados no ponto de venda.
*   Atributos obrigatórios: Nome, SKU (código), Categoria.
*   Atributos opcionais: Imagem de referência, Preço sugerido, Código de barras (EAN).

### 2.3. Supermercados (PDVs)
*   Locais onde o serviço é executado.
*   Classificação: Ouro, Prata, Bronze (define prioridade ou frequência de visita).
*   Geolocalização: Latitude/Longitude obrigatórias para validação de check-in.

## 3. Fluxos Operacionais

### 3.1. Gestão de Rotas e Visitas
1.  **Criação de Rota:** O Admin ou Supervisor cria uma rota associando um Promotor a uma lista de Supermercados para dias específicos da semana.
2.  **Execução (App Mobile):**
    *   **Check-in:** O promotor só pode realizar check-in se estiver num raio de X metros (configurável, ex: 200m) do PDV.
    *   **Tarefas:** Ao fazer check-in, o app lista as tarefas: Auditoria de Preço, Ruptura (falta de produto), Fotos de Gôndola, Validação de Planograma.
    *   **Check-out:** Finaliza a visita e envia os dados. Só permitido após completar tarefas obrigatórias.

### 3.2. Coleta de Dados e IA
*   **Fotos:** Devem ser validadas por IA para confirmar a presença dos produtos e conformidade com o planograma (Share of Shelf).
*   **Offline-First:** O App deve permitir coleta de dados sem internet e sincronizar quando houver conexão.

### 3.3. Dashboard e Relatórios
*   **Visão Admin:** Vê produtividade de todos os promotores, alertas de ruptura global e status dos contratos.
*   **Visão Cliente:** Vê apenas dados dos seus produtos (Preço médio, Presença/Ruptura, Fotos das gôndolas).

## 4. Regras de Acesso e Segurança (Autenticação)

*   **Login:** Via JWT (Token).
*   **Permissões (RBAC):**
    *   `admin`: Acesso total (CRUD de Clientes, Produtos, Usuários).
    *   `supervisor`: Acesso a rotas e relatórios da sua equipe.
    *   `promotor`: Acesso apenas ao App Mobile (sua rota do dia).
    *   `cliente_viewer`: Acesso apenas leitura aos dashboards do seu contrato.

## 5. Integrações Previstas

*   **API de Mapas:** Para roteirização e visualização "Live Map" dos promotores.
*   **Serviço de IA:** Para processamento de imagens (reconhecimento de produtos).
*   **Exportação:** Relatórios em PDF/Excel para clientes.

---
*Documento em evolução. Última atualização: 29/12/2025*
