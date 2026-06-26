// Brazilian phone helpers
export function onlyDigits(s: string) {
  return (s ?? "").replace(/\D+/g, "");
}

// Mask digits as (DD) 9XXXX-XXXX or (DD) XXXX-XXXX
export function maskBrPhone(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Accepts any input (masked or E.164) and returns +55DDDNUMBER
export function toE164BR(input: string): string {
  let d = onlyDigits(input);
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return `+${d}`;
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  return input.startsWith("+") ? input : d ? `+${d}` : "";
}

// For wa.me — no plus sign, digits only with country code
export function toWaDigits(input: string): string {
  const e = toE164BR(input).replace(/\D+/g, "");
  return e;
}

export function isValidBrPhone(input: string): boolean {
  const d = onlyDigits(input);
  if (d.startsWith("55")) return d.length === 12 || d.length === 13;
  return d.length === 10 || d.length === 11;
}

export function formatBrFromE164(e164: string): string {
  const d = onlyDigits(e164);
  const local = d.startsWith("55") ? d.slice(2) : d;
  return maskBrPhone(local);
}

export const maskBrPhoneInput = maskBrPhone;

export function maskCpfInput(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
