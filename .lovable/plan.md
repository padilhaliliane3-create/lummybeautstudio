
# Plano de implementação — LUMMY v2

O escopo é grande (8 frentes). Para não estourar o tempo de uma única iteração e manter qualidade, proponho **quebrar em 4 fases** e entregar uma fase por vez. Você aprova esta fatiação (ou ajusta) e eu já começo pela Fase 1.

---

## Fase 1 — Fundações (admin, clientes, configurações, tema)

**1. Gerenciamento de Administradores** — nova aba `/admin/usuarios`:
- Lista de usuários autenticados (via `auth.users` por server function admin)
- Promover / despromover (`admin` ↔ usuário comum) gravando em `user_roles`
- Bloqueio: admin não consegue se auto-despromover se for o único
- RLS: só `has_role(admin)` enxerga e altera

**2. Cadastro de clientes (CRUD completo)** — nova aba `/admin/clientes`:
- Migração para adicionar em `clients`: `cpf`, `birth_date`, `address`, `notes`, mantendo `name/email/whatsapp`
- Máscara BR `(42) 99999-9999` no input e armazenamento em E.164 (`+5542999999999`)
- Ícone WhatsApp ao lado abrindo `https://wa.me/...`
- Histórico de atendimentos por cliente (lista de bookings)

**6. Configurações do site** — nova aba `/admin/configuracoes`:
- Expandir `salon_settings`: `company_name, address, phone, whatsapp, instagram, facebook, email, hours_json, hero_title, hero_subtitle, about_text, logo_url, banner_url`
- Home, header e footer passam a ler de `salon_settings` (via server fn pública)
- Upload de logo/banner em bucket `branding` (Supabase Storage)

**7. Tema Claro/Escuro**:
- `ThemeProvider` com `localStorage` + fallback `prefers-color-scheme`
- Botão sol/lua no header (site e admin)
- Revisar tokens no `styles.css` (já existe `.dark` parcial — completar paleta dourada noturna)
- Transição suave em `body`

---

## Fase 2 — Notificações automáticas (item 2)

- **WhatsApp**: sem API oficial paga, usaremos **mensagens prontas via `wa.me`** + um painel "Mensagens pendentes" no admin que abre o WhatsApp Web com o texto montado (1 clique). Alternativa real: integrar **Twilio WhatsApp** ou **GatewayAPI** se você fornecer a conta. *Preciso da sua escolha.*
- **E-mail**: ativar **Lovable Emails** (domínio próprio, fila e templates React Email):
  - Templates: `booking-confirmed`, `booking-reminder-24h`, `booking-cancelled`, `booking-rescheduled`
  - Disparo automático em mudanças de `bookings.status` ou `scheduled_date/start_time` (trigger no banco enfileirando + server fn enviando)
- **Lembrete 24h**: cron `pg_cron` rodando de hora em hora, varrendo agendamentos de amanhã e enfileirando lembretes

> Item bloqueante: preciso saber **WhatsApp via wa.me (grátis, semi-manual)** ou **Twilio/GatewayAPI (pago, 100% automático)** e **autorizar a configuração do domínio de e-mail** (você escolhe o subdomínio, ex.: `notify.lummybeauty.com.br`).

---

## Fase 3 — Área do cliente + Cronograma capilar (item 4)

- Login do cliente em `/cliente` (email/senha + Google), separado do admin
- Vínculo `clients.user_id → auth.users`
- Painel `/cliente`:
  - Próximos agendamentos e histórico (RLS por `user_id`)
  - Recomendações do profissional (campo livre por booking)
  - **Cronograma capilar**: nova tabela `hair_schedules` (etapas: hidratação/nutrição/reconstrução, datas, observações) — admin gerencia, cliente só visualiza
- Ajuste no fluxo `/agendar`: se o cliente estiver logado, pré-preenche dados e vincula booking ao `user_id`

---

## Fase 4 — Financeiro (item 5)

- Novas tabelas: `finance_entries` (entradas/saídas, categoria, método, data, valor, descrição, referência opcional ao booking), `finance_categories`
- Lançamento automático ao concluir agendamento (entrada de serviço)
- Lançamento manual de saídas (despesas, salários, compras)
- Dashboard `/admin/financeiro`: cards (dia/semana/mês/ano), gráfico de fluxo, filtros, tabela paginada
- Export CSV (PDF/Excel: opcional, posso adicionar `xlsx` e `jspdf` se quiser)

---

## Decisões que preciso de você antes de codar a Fase 2

1. **WhatsApp**: `wa.me` (grátis, semi-automático) **ou** Twilio/GatewayAPI (pago, 100% auto)?
2. **E-mail**: posso já ativar Lovable Emails e te pedir o subdomínio?
3. **Logo/Banner em Configurações**: criar bucket público no Storage? (recomendado: sim)
4. **Login do cliente** (Fase 3): quero adicionar **Google** além de email/senha? (recomendado: sim)

---

## Próximo passo

Se aprovar este plano, começo **agora pela Fase 1 inteira** (Admins + Clientes + Configurações + Tema). Quando terminar, te aviso e passamos para Fase 2.

Se quiser reordenar (ex.: "quero o financeiro antes do cronograma capilar"), só me dizer.
