# Treinamento do Usuário (RH / Ponto / Afastamentos)

## Modificações implementadas nesta entrega

### 1) Documentos do App vinculados ao promotor (colaborador)
- Antes: o upload/consulta de documentos podia ficar vinculado ao usuário logado, causando divergência na visualização pelo RH.
- Agora: o App usa o colaborador do token (employeeId do usuário) para gravar e listar documentos.
- Impacto no RH: na guia de Afastamentos do colaborador, o RH consegue ver os documentos corretos vinculados ao promotor.

### 2) Atestado (campos obrigatórios)
Para atestado, os campos passam a contemplar:
- CRM (fixo)
- Local de atendimento
- CID
- Nome do médico

### 3) RH → Relatórios e conferências de ponto
Na tela de Gestão de Ponto, foram adicionadas abas/relatórios para:
- Lista de ponto diário (com filtro por colaborador)
- Ocorrências (padrão “dia anterior”)
- Marcação manual (diário)
- Marcações ímpares (diário)
- Faltas (diário)
- Relatório de horas (50%, 100%, adicional noturno, banco e horas faltas)
- Banco de horas (consulta e ajuste manual de saldo por competência)

## Como usar (Web Admin)

### A) Afastamentos → Criar Atestado
1. Abra **Colaboradores** → selecione o colaborador → **Afastamentos**.
2. Clique em **Novo afastamento** e selecione **Atestado**.
3. Preencha:
   - CID
   - Nome do médico
   - Local de atendimento
   - CRM
4. Salve o afastamento.

### B) RH → Gestão de Ponto Eletrônico
Abra a tela **Gestão de Ponto Eletrônico** e use as abas:

#### 1) Eventos
- Mostra os registros “crus” agrupados por colaborador e data, com Entrada/Almoço/Saída.
- Filtro por colaborador e período.
- Permite **Lançamento Manual** (ajuste), que fica identificado como “Manual”.

#### 2) Ponto diário
- Mostra um resumo por colaborador para uma data:
  - Escala do dia (se existir)
  - Entrada/Almoço/Saída
  - Trabalhadas, Previstas, Extras e Faltas (diferença)
  - Indicadores: “Manual” e “Ímpar”

#### 3) Ocorrências (dia anterior)
- Para conferência de ponto e inclusão de faltas:
  - Marcação faltando (ENTRY/EXIT/LUNCH_START/LUNCH_END)
  - Marcações ímpares
  - Marcação manual
  - Atraso e saída antecipada (com tolerância da escala)

#### 4) Manuais
- Lista as marcações manuais do dia, com “editado por” e motivo.

#### 5) Ímpares
- Lista colaboradores com quantidade ímpar de marcações no dia.

#### 6) Faltas
- Lista colaboradores sem marcações no dia (quando existe escala do dia e não há afastamento aprovado no período).

#### 7) Horas
- Consolida por colaborador no período:
  - Extra 50%
  - Extra 100% (domingo)
  - Adicional noturno (minutos entre 22:00–05:00)
  - Banco (saldo do período = trabalhadas - previstas)
  - Horas faltas

#### 8) Banco
- Consulta o **saldo de banco** por competência (AAAA-MM).
- Permite **ajuste manual**:
  - Seleciona colaborador
  - Competência
  - Delta (horas): positivo soma no banco, negativo reduz
  - Motivo

## Funções já existentes no sistema (para treinamento)

### Ponto (App / Web Admin)
- Bater ponto pelo App (Entrada/Almoço/Saída).
- Visualizar pontos do dia no App.
- Visualizar eventos no Web Admin (aba “Eventos”).
- Lançar marcação manual pelo Web Admin (correções e justificativas).
- Exportar relatório em Excel do período filtrado.

### Afastamentos (RH)
- Cadastrar afastamento por colaborador.
- Anexar/visualizar documentos do colaborador na guia de Afastamentos.
- Registrar atestado com dados clínicos básicos (CID, médico, local e CRM).

### Rotas / Operação (resumo)
- Cadastro de rotas e itens de rota.
- Check-in/check-out e registros de execução.
- Relatórios e acompanhamento operacional na área de Rotas.

## Endpoints (referência técnica)
- Documentos do colaborador pelo token:
  - `GET /employees/me/documents`
  - `POST /employees/me/documents`
- RH (Relatórios de Ponto):
  - `GET /time-clock/reports/daily?date=YYYY-MM-DD&employeeId=...`
  - `GET /time-clock/reports/occurrences?date=YYYY-MM-DD&employeeId=...`
  - `GET /time-clock/reports/manual?date=YYYY-MM-DD&employeeId=...`
  - `GET /time-clock/reports/odd?date=YYYY-MM-DD&employeeId=...`
  - `GET /time-clock/reports/overtime?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&employeeId=...`
- Banco de horas:
  - `GET /time-clock/balances?competence=YYYY-MM&employeeId=...`
  - `POST /time-clock/balances/adjust`
