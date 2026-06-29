// Helpers de data padronizados para o fuso America/Sao_Paulo.
// Use sempre em telas que mostram datas vindas do banco.

const TZ = "America/Sao_Paulo";

/** Formata um timestamptz/ISO no fuso de SP. Ex: "27/06/2026". */
export function formatBrDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: TZ });
}

/** Formata data + hora curtas em SP. Ex: "27/06/2026 14:30". */
export function formatBrDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formata uma coluna do tipo DATE (ex: "2026-06-27") evitando o
 * deslocamento de fuso. `new Date("2026-06-27")` é UTC midnight, que em
 * Brasília vira o dia anterior — por isso parseamos manualmente.
 */
export function formatBrDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return formatBrDate(iso);
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

/** "HH:mm" a partir de "HH:mm:ss" ou Date. */
export function formatBrTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string") return value.slice(0, 5);
  return value.toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "YYYY-MM-DD" no fuso de SP — útil pra comparar "hoje". */
export function todayInSpIso(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA produz YYYY-MM-DD
}
