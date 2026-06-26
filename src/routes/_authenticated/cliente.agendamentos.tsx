import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyBookings, cancelMyBooking } from "@/lib/client-area.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/cliente/agendamentos")({
  component: MyBookingsPage,
});

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Aguardando entrada", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmado", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
  completed: { label: "Concluído", cls: "bg-secondary text-foreground" },
  no_show: { label: "Não compareceu", cls: "bg-red-100 text-red-700" },
};

function MyBookingsPage() {
  const qc = useQueryClient();
  const gb = useServerFn(getMyBookings);
  const cancel = useServerFn(cancelMyBooking);
  const bookings = useQuery({ queryKey: ["myBookings"], queryFn: () => gb() });

  const todayISO = new Date().toISOString().slice(0, 10);
  const upcoming = (bookings.data ?? []).filter((b: any) => b.scheduled_date >= todayISO);
  const past = (bookings.data ?? []).filter((b: any) => b.scheduled_date < todayISO);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Meus agendamentos</h1>
        <Link
          to="/agendar"
          className="inline-flex items-center rounded-full bg-gradient-gold px-4 py-1.5 text-xs font-medium text-white"
        >
          Novo agendamento
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Próximos
        </h2>
        <div className="space-y-3">
          {upcoming.map((b: any) => (
            <BookingCard
              key={b.id}
              b={b}
              onCancel={async () => {
                if (!confirm("Cancelar este agendamento?")) return;
                try {
                  await cancel({ data: { bookingId: b.id } });
                  qc.invalidateQueries({ queryKey: ["myBookings"] });
                } catch (e) {
                  alert(e instanceof Error ? e.message : "Erro");
                }
              }}
            />
          ))}
          {!upcoming.length && (
            <p className="text-sm text-muted-foreground">Nada agendado por enquanto.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Histórico
        </h2>
        <div className="space-y-3">
          {past.map((b: any) => (
            <BookingCard key={b.id} b={b} />
          ))}
          {!past.length && <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>}
        </div>
      </section>
    </div>
  );
}

function BookingCard({ b, onCancel }: { b: any; onCancel?: () => void }) {
  const st = STATUS_LABEL[b.status] ?? { label: b.status, cls: "bg-secondary" };
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">{b.service?.name}</CardTitle>
          <p className="text-xs text-muted-foreground">com {b.professional?.name}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.cls}`}>
          {st.label}
        </span>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div>
          <div className="font-medium">
            {b.scheduled_date.split("-").reverse().join("/")} · {b.start_time.slice(0, 5)}
          </div>
          <div className="text-xs text-muted-foreground">
            Total: R$ {Number(b.total_price).toFixed(2).replace(".", ",")} · Código {b.code}
          </div>
        </div>
        {onCancel && b.status !== "cancelled" && (
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
