import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, MessageCircle, Bell, XCircle } from "lucide-react";
import { adminLoadAll, adminListBookings, adminUpdateBookingStatus } from "@/lib/admin.functions";
import { StatusBadge } from "./admin.agenda";
import { waConfirmLink, waReminderLink, waCancelLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin/agendamentos")({
  component: BookingsPage,
});

function BookingsPage() {
  const loadAll = useServerFn(adminLoadAll);
  const listBookings = useServerFn(adminListBookings);
  const updateStatus = useServerFn(adminUpdateBookingStatus);
  const qc = useQueryClient();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [proId, setProId] = useState<string | "">("");
  const [status, setStatus] = useState<string | "">("");
  const [search, setSearch] = useState("");

  const all = useQuery({ queryKey: ["adminAll"], queryFn: () => loadAll() });
  const bookings = useQuery({
    queryKey: ["bookings", from, to, proId, status],
    queryFn: () =>
      listBookings({
        data: {
          from: from || undefined,
          to: to || undefined,
          professionalId: proId || undefined,
          status: (status || undefined) as any,
        },
      }),
  });

  const update = useMutation({
    mutationFn: (v: { id: string; status: any }) => updateStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bookings.data ?? [];
    return (bookings.data ?? []).filter((b: any) =>
      [b.client?.name, b.client?.whatsapp, b.service?.name, b.code]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(term)),
    );
  }, [bookings.data, search]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-border/60 bg-card p-4 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Buscar</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, WhatsApp, serviço ou código"
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">De</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Até</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Profissional</label>
          <select
            value={proId}
            onChange={(e) => setProId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {(all.data?.professionals ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            <option value="pending_payment">Aguardando</option>
            <option value="confirmed">Confirmado</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
            <option value="no_show">Não compareceu</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Hora</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Serviço</th>
                <th className="px-4 py-3 text-left">Profissional</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">WhatsApp</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum agendamento encontrado.
                  </td>
                </tr>
              )}
              {filtered.map((b: any) => (
                <tr key={b.id} className="border-b border-border/40 hover:bg-secondary/40">
                  <td className="px-4 py-3 whitespace-nowrap">{b.scheduled_date}</td>
                  <td className="px-4 py-3 font-mono">{b.start_time?.slice(0, 5)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{b.client?.name}</div>
                    <div className="text-xs text-muted-foreground">{b.client?.whatsapp}</div>
                  </td>
                  <td className="px-4 py-3">{b.service?.name}</td>
                  <td className="px-4 py-3">{b.professional?.name}</td>
                  <td className="px-4 py-3 text-right font-mono">R$ {Number(b.total_price).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <a
                        href={waConfirmLink(b)}
                        target="_blank"
                        rel="noreferrer"
                        title="Confirmar"
                        className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={waReminderLink(b)}
                        target="_blank"
                        rel="noreferrer"
                        title="Lembrete 24h"
                        className="rounded p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                      >
                        <Bell className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={waCancelLink(b)}
                        target="_blank"
                        rel="noreferrer"
                        title="Cancelar"
                        className="rounded p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={b.status}
                      onChange={(e) => update.mutate({ id: b.id, status: e.target.value })}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      <option value="pending_payment">Aguardando</option>
                      <option value="confirmed">Confirmado</option>
                      <option value="completed">Concluído</option>
                      <option value="cancelled">Cancelado</option>
                      <option value="no_show">Faltou</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
          {filtered.length} resultado(s)
        </div>
      </div>
    </div>
  );
}
