# Fase 3 + Módulo Financeiro

Vou entregar as duas frentes em sequência, na mesma leva de migrações para evitar idas e voltas.

## 1. Banco de dados (uma migração só)

Tabelas novas:
- **`finance_entries`** — lançamentos manuais do financeiro
  - `type` (`income` | `expense`), `category` (texto livre: "Produtos", "Aluguel", "Comissão"...), `amount`, `description`, `entry_date`, `payment_method`, `booking_id` (opcional, para vincular a um agendamento), `created_by`.
- **`hair_schedules`** — cronograma capilar por cliente
  - `client_id`, `step_type` (`hidratacao` | `nutricao` | `reconstrucao`), `scheduled_date`, `done` (bool), `notes`.
- **`client_recommendations`** — recomendações geradas pelo admin
  - `client_id`, `title`, `body`, `created_by`.

Ajustes:
- Adicionar coluna `auth_user_id uuid` em `clients` para ligar conta logada ao cadastro (UNIQUE, nullable).
- View/leitura: receita do financeiro inclui **agendamentos `completed`** (preço cheio) somados a `finance_entries.income`, menos `finance_entries.expense`.

RLS:
- Cliente lê/edita só os próprios dados (`clients.auth_user_id = auth.uid()`), incluindo bookings, hair_schedules e recommendations vinculados.
- Admin total. Financeiro: só admin.

## 2. Área do Cliente (`/_cliente/*`)

Layout próprio, separado do `/admin`, com header da marca e tema claro/escuro.

Rotas:
- **`/_cliente`** (gate): se logado e `clients.auth_user_id` não estiver setado, oferece "vincular meu cadastro" via WhatsApp/CPF.
- **`/_cliente/`** — dashboard: próximo agendamento, próximo passo do cronograma, recomendações ativas.
- **`/_cliente/agendamentos`** — histórico + futuros, com ações (cancelar se >24h, reagendar = atalho `/agendar`).
- **`/_cliente/cronograma`** — cronograma capilar visual (hidratação/nutrição/reconstrução), marcar como feito, sugestão automática do próximo ciclo (toda hidratação 7d, nutrição 15d, reconstrução 30d — config padrão).
- **`/_cliente/perfil`** — editar dados pessoais (CPF, nascimento, endereço, foto opcional).

Login do cliente: reaproveita `/auth` (mesma tela). Após login, se vier de fluxo de cliente vai pra `/cliente`; se admin, pra `/admin`. Decide pelo `has_role`.

## 3. Módulo Financeiro (`/admin/financeiro`)

Subseções via tabs:
- **Dashboard**: cards (Receita mês, Despesas mês, Lucro, Ticket médio), gráfico de barras receita x despesa (últimos 6 meses) usando `recharts`.
- **Lançamentos**: tabela com filtros (período, tipo, categoria), CRUD (modal), import automático de agendamentos `completed` como receita (toggle "ver com agendamentos").
- **Fluxo de Caixa**: lista diária acumulada com saldo, exportar CSV.
- **Categorias**: gestão simples (lista de strings sugeridas, salvas em `salon_settings.finance_categories` jsonb).

Server fns novas em `src/lib/finance.functions.ts`:
- `adminListFinanceEntries(filters)`, `adminSaveFinanceEntry`, `adminDeleteFinanceEntry`, `adminFinanceSummary({from,to})`.

## 4. Itens transversais

- Item de menu no admin sidebar: "Financeiro".
- Link "Área do Cliente" no header público (`SiteShell`) quando logado como cliente.
- Após criar agendamento em `/agendar`, se usuário estiver logado, auto-linkar `clients.auth_user_id`.

## Ordem de execução

1. Migração única (tabelas + RLS + coluna em `clients`).
2. `finance.functions.ts` + rota `/admin/financeiro` (com tabs).
3. `client.functions.ts` (cronograma, recomendações, vincular conta) + layout `/_cliente`.
4. Páginas do cliente (dashboard, agendamentos, cronograma, perfil).
5. Ajustes no `SiteShell` e `/agendar` (auto-link).

Sigo direto?
