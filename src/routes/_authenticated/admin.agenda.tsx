import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { adminLoadAll, adminListBookings, adminUpdateBookingStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/agenda")({
  component: AgendaPage,
});

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function AgendaPage() {
  const loadAll = useServerFn(adminLoadAll);
  const listBookings = useServerFn(adminListBookings);
  const updateStatus = useServerFn(adminUpdateBookingStatus);
  const qc = useQueryClient();

  const [date, setDate] = useState(toISO(new Date()));
  const [proId, setProId] = useState<string | "">("");

  const all = useQuery({ queryKey: ["adminAll"], queryFn: () => loadAll() });
  const bookings = useQuery({
    queryKey: ["agenda", date, proId],
    queryFn: () =>
      listBookings({
        data: { from: date, to: date, professionalId: proId || undefined },
      }),
  });

  const update = useMutation({
    mutationFn: (v: { id: string; status: any }) => updateStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agenda"] }),
  });

  const shiftDay = (n: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + n);
    setDate(toISO(d));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
        <button onClick={() => shiftDay(-1)} className="rounded-md border border-input p-1.5 hover:bg-secondary">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        />
        <button onClick={() => shiftDay(1)} className="rounded-md border border-input p-1.5 hover:bg-secondary">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => setDate(toISO(new Date()))}
          className="rounded-full border border-input px-3 py-1 text-xs hover:bg-secondary"
        >
          Hoje
        </button>
        <select
          value={proId}
          onChange={(e) => setProId(e.target.value)}
          className="ml-auto rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Todos os profissionais</option>
          {(all.data?.professionals ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-border/60 bg-card">
        {(bookings.data?.length ?? 0) === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum agendamento para esse dia.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {bookings.data!
              .slice()
              .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
              .map((b: any) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                  <div className="font-mono text-base text-gold">
                    {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-medium">{b.client?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.service?.name} · {b.professional?.name} · R$ {Number(b.total_price).toFixed(2)}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                  <select
                    value={b.status}
                    onChange={(e) => update.mutate({ id: b.id, status: e.target.value })}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value="pending_payment">Aguardando pgto</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">Concluído</option>
                    <option value="cancelled">Cancelado</option>
                    <option value="no_show">Não compareceu</option>
                  </select>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; l: string }> = {
    pending_payment: { c: "bg-amber-100 text-amber-800", l: "Aguardando" },
    confirmed: { c: "bg-emerald-100 text-emerald-800", l: "Confirmado" },
    completed: { c: "bg-blue-100 text-blue-800", l: "Concluído" },
    cancelled: { c: "bg-rose-100 text-rose-800", l: "Cancelado" },
    no_show: { c: "bg-zinc-200 text-zinc-700", l: "Faltou" },
  };
  const v = map[status] ?? { c: "bg-secondary", l: status };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${v.c}`}>{v.l}</span>;
}
