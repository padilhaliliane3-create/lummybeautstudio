/** Helpers para gerar links wa.me com mensagens pré-formatadas. */

function digits(s: string | null | undefined) {
  return (s ?? "").replace(/\D/g, "");
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export type BookingMsgInput = {
  client: { name?: string | null; whatsapp?: string | null } | null;
  service?: { name?: string | null } | null;
  professional?: { name?: string | null } | null;
  scheduled_date: string;
  start_time: string;
  code?: string | null;
  total_price?: number | string | null;
  remaining_amount?: number | string | null;
  salonName?: string;
};

function brl(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildLink(phone: string, text: string) {
  return `https://wa.me/${digits(phone).replace(/^0+/, "")}?text=${encodeURIComponent(text)}`;
}

export function waConfirmLink(b: BookingMsgInput) {
  const salon = b.salonName ?? "LUMMY Beauty Studio";
  const text =
    `Olá ${b.client?.name ?? ""}! Tudo certo com seu agendamento na ${salon} 💛\n\n` +
    `✂️ ${b.service?.name ?? "Serviço"}\n` +
    `👩 ${b.professional?.name ?? ""}\n` +
    `📅 ${formatDate(b.scheduled_date)} às ${b.start_time.slice(0, 5)}\n` +
    (b.code ? `🔖 Código: ${b.code}\n` : "") +
    (b.remaining_amount ? `💳 Restante no dia: ${brl(b.remaining_amount)}\n` : "") +
    `\nAté breve!`;
  return buildLink(b.client?.whatsapp ?? "", text);
}

export function waReminderLink(b: BookingMsgInput) {
  const salon = b.salonName ?? "LUMMY Beauty Studio";
  const text =
    `Oi ${b.client?.name ?? ""}! Passando para lembrar do seu horário na ${salon} amanhã 💛\n\n` +
    `✂️ ${b.service?.name ?? "Serviço"}\n` +
    `👩 ${b.professional?.name ?? ""}\n` +
    `📅 ${formatDate(b.scheduled_date)} às ${b.start_time.slice(0, 5)}\n\n` +
    `Caso precise remarcar, é só responder esta mensagem.`;
  return buildLink(b.client?.whatsapp ?? "", text);
}

export function waCancelLink(b: BookingMsgInput) {
  const salon = b.salonName ?? "LUMMY Beauty Studio";
  const text =
    `Olá ${b.client?.name ?? ""}, infelizmente precisamos cancelar seu agendamento na ${salon}.\n\n` +
    `✂️ ${b.service?.name ?? "Serviço"}\n` +
    `📅 ${formatDate(b.scheduled_date)} às ${b.start_time.slice(0, 5)}\n\n` +
    `Quer que eu reagende para outro dia?`;
  return buildLink(b.client?.whatsapp ?? "", text);
}
