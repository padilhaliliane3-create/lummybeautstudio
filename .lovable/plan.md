## Escopo

A solicitação tem duas naturezas muito diferentes:

**A) Correções rápidas** (faço imediatamente, sem fases)
1. **Excluir cliente não funciona** — investigar o handler `adminDeleteClient` e o botão na tela `/admin/clientes`. Provavelmente erro silencioso por FK (bookings/hair_schedules referenciam clients). Solução: tratar erro, mostrar toast e, quando houver agendamentos, oferecer "arquivar" (soft delete) em vez de DELETE físico.
2. **Data de cadastro D-1** — o banco grava `created_at` em UTC (correto), mas a UI formata sem timezone, então 22h de Brasília vira "dia anterior". Vou padronizar a formatação em pt-BR com `timeZone: "America/Sao_Paulo"` em todas as telas que mostram datas de cliente/agendamento.

**B) 13 grandes módulos novos** (Dashboard cliente, Galeria de evolução, Histórico detalhado, Anamnese, Produtos recomendados, Lembretes automáticos, Lista de espera, Agenda inteligente, Financeiro do cliente, Fidelidade, Planos/assinaturas, Centro de notificações, Fluxo de confirmação).

Isto é, na prática, **outro sistema do tamanho do atual**. Tentar entregar tudo numa única rodada vai gerar código frágil, schema mal pensado e regressões nas correções A). Proponho dividir em **4 fases incrementais**, cada uma entregando valor real e testável.

## Fases propostas

### Fase 0 — Correções (faço já, nesta rodada)
- Corrigir exclusão de cliente (soft delete quando houver vínculos).
- Padronizar timezone `America/Sao_Paulo` em datas exibidas.
- Corrigir o hydration warning de `/auth` que apareceu nos logs.

### Fase 1 — Fundação do "Cliente 360"
Cobre itens **1, 2, 3, 4, 5, 12** (Dashboard, Evolução com fotos, Histórico, Anamnese, Recomendações, Notificações internas).
- Tabelas novas: `client_anamnesis`, `client_evolution_photos`, `client_notifications`, expansão de `bookings` (produtos usados, observações pós-atendimento).
- Bucket Storage `client-photos` (privado, RLS por client/admin).
- Dashboard `/cliente` reformulado com cards: próximo agendamento, última visita, total de procedimentos, próxima manutenção, avisos.
- Centro de notificações com contador no header.

### Fase 2 — Automação de retenção
Cobre itens **6, 7, 8, 13** (Lembretes automáticos, Lista de espera, Agenda inteligente, Fluxo de confirmação).
- Cron via `pg_cron` chamando rota `/api/public/hooks/run-reminders` (gera links wa.me prontos no painel admin — wa.me é semi-manual como combinamos).
- Tabela `waitlist` + worker que dispara quando um booking vira `cancelled`.
- Sugestão automática da próxima data ao confirmar manutenção.
- Fluxo "Confirmar / Não posso" no painel do cliente, com reagendamento.

### Fase 3 — Comercial
Cobre itens **9, 10, 11** (Financeiro do cliente, Fidelidade, Planos).
- Já temos `finance_entries`; criar view `client_financials`.
- Tabelas `loyalty_rules`, `loyalty_points`, `loyalty_redemptions`.
- Tabelas `plans`, `client_subscriptions`, `subscription_usage`.
- Telas no admin (CRUD) e no cliente (consulta).

## O que eu preciso de você para seguir

1. **Aprovar Fase 0 já** (correções) — faço em seguida sem nova confirmação.
2. **Confirmar a ordem das fases** (1 → 2 → 3) ou pedir reordenação. Cada fase leva várias rodadas de prompt; ao final de cada uma eu paro para você validar antes de abrir a próxima.
3. **WhatsApp/E-mail dos lembretes**: mantemos wa.me semi-manual (como já está) e sem e-mail, certo? Ou agora quer ativar e-mail via Lovable Emails (precisa subdomínio)?
4. **Fidelidade**: regra inicial padrão (ex.: 1 ponto por R$ 1 gasto, níveis Bronze 0+, Prata 500+, Ouro 1500+) ou você quer definir antes?

Assim que você responder, executo a Fase 0 imediatamente e já abro a Fase 1.