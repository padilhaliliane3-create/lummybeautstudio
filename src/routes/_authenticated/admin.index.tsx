import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, DollarSign, Users, Scissors, Bell, MessageCircle } from "lucide-react";
import { adminLoadAll, adminListBookings } from "@/lib/admin.functions";
import { waReminderLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const loadAll = useServerFn(adminLoadAll);
  const listBookings = useServerFn(adminListBookings);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const all = useQuery({ queryKey: ["adminAll"], queryFn: () => loadAll() });
  const upcoming = useQuery({
    queryKey: ["bookings", "upcoming", today, in7],
    queryFn: () => listBookings({ data: { from: today, to: in7 } }),
  });
  const todayList = useQuery({
    queryKey: ["bookings", "today", today],
    queryFn: () => listBookings({ data: { from: today, to: today } }),
  });
  const tomorrowList = useQuery({
    queryKey: ["bookings", "tomorrow", tomorrow],
    queryFn: () => listBookings({ data: { from: tomorrow, to: tomorrow, status: "confirmed" } }),
  });

  const revenue = (upcoming.data ?? [])
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + Number(b.total_price ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={CalendarDays} label="Agendamentos hoje" value={todayList.data?.length ?? "—"} />
        <Stat icon={CalendarDays} label="Próximos 7 dias" value={upcoming.data?.length ?? "—"} />
        <Stat
          icon={DollarSign}
          label="Receita prevista (7d)"
          value={`R$ ${revenue.toFixed(2)}`}
        />
        <Stat icon={Users} label="Profissionais ativos" value={(all.data?.professionals ?? []).filter((p) => p.active).length} />
      </div>

      <section className="rounded-xl border border-border/60 bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground">Hoje</h2>
          <span className="text-xs text-muted-foreground">{todayList.data?.length ?? 0} compromissos</span>
        </div>
        {(todayList.data?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum agendamento para hoje.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {todayList.data!.map((b: any) => (
              <li key={b.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">{b.client?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.service?.name} · {b.professional?.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono">{b.start_time?.slice(0, 5)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{b.status}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground inline-flex items-center gap-2">
            <Bell className="h-4 w-4 text-gold" /> Lembretes para amanhã
          </h2>
          <span className="text-xs text-muted-foreground">{tomorrowList.data?.length ?? 0} cliente(s)</span>
        </div>
        {(tomorrowList.data?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lembrete pendente.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {tomorrowList.data!.map((b: any) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{b.client?.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {b.service?.name} · {b.professional?.name} · <span className="font-mono">{b.start_time?.slice(0, 5)}</span>
                  </div>
                </div>
                <a
                  href={waReminderLink(b)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-gold px-3 py-1.5 text-xs text-white"
                >
                  <MessageCircle className="h-3 w-3" /> Enviar
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SummaryCard title="Serviços" icon={Scissors} count={(all.data?.services ?? []).length} />
        <SummaryCard title="Categorias" icon={Scissors} count={(all.data?.categories ?? []).length} />
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-gold" /> {label}
      </div>
      <div className="mt-2 font-display text-2xl text-foreground">{value}</div>
    </div>
  );
}

function SummaryCard({ title, icon: Icon, count }: { title: string; icon: any; count: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-gold" /> {title}
      </div>
      <div className="mt-2 font-display text-3xl text-foreground">{count}</div>
    </div>
  );
}
