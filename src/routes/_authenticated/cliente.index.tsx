import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyBookings,
  getMyHairSchedule,
  getMyRecommendations,
} from "@/lib/client-area.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Sparkles, Bell, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente/")({
  component: ClienteHome,
});

const STEP_LABEL: Record<string, string> = {
  hidratacao: "Hidratação",
  nutricao: "Nutrição",
  reconstrucao: "Reconstrução",
};

function ClienteHome() {
  const gb = useServerFn(getMyBookings);
  const gh = useServerFn(getMyHairSchedule);
  const gr = useServerFn(getMyRecommendations);

  const bookings = useQuery({ queryKey: ["myBookings"], queryFn: () => gb() });
  const schedule = useQuery({ queryKey: ["myHair"], queryFn: () => gh() });
  const recs = useQuery({ queryKey: ["myRecs"], queryFn: () => gr() });

  const todayISO = new Date().toISOString().slice(0, 10);
  const nextBooking = (bookings.data ?? [])
    .filter((b: any) => b.scheduled_date >= todayISO && b.status !== "cancelled")
    .sort((a: any, b: any) =>
      `${a.scheduled_date}${a.start_time}`.localeCompare(`${b.scheduled_date}${b.start_time}`),
    )[0];

  const nextStep = (schedule.data ?? [])
    .filter((s: any) => !s.done && s.scheduled_date >= todayISO)
    .sort((a: any, b: any) => a.scheduled_date.localeCompare(b.scheduled_date))[0];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-display text-2xl">Olá, bem-vinda 💛</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="h-4 w-4 text-gold" /> Próximo agendamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextBooking ? (
              <div>
                <div className="font-medium">{nextBooking.service?.name}</div>
                <div className="text-sm text-muted-foreground">
                  com {nextBooking.professional?.name}
                </div>
                <div className="mt-2 text-sm">
                  {nextBooking.scheduled_date.split("-").reverse().join("/")} ·{" "}
                  {nextBooking.start_time.slice(0, 5)}
                </div>
                <Link
                  to="/cliente/agendamentos"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-gold hover:underline"
                >
                  Ver detalhes <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Você não tem agendamentos futuros.</p>
                <Link
                  to="/agendar"
                  className="inline-flex items-center rounded-full bg-gradient-gold px-4 py-1.5 text-xs font-medium text-white"
                >
                  Agendar agora
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-gold" /> Cronograma capilar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextStep ? (
              <div>
                <div className="font-medium">Próxima etapa: {STEP_LABEL[nextStep.step_type]}</div>
                <div className="text-sm text-muted-foreground">
                  prevista para {nextStep.scheduled_date.split("-").reverse().join("/")}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Configure seu cronograma e receba lembretes de hidratação, nutrição e reconstrução.
              </p>
            )}
            <Link
              to="/cliente/cronograma"
              className="mt-3 inline-flex items-center gap-1 text-xs text-gold hover:underline"
            >
              Abrir cronograma <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-gold" /> Recomendações para você
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recs.data?.length ? (
            <ul className="space-y-3">
              {recs.data.map((r: any) => (
                <li key={r.id} className="rounded-lg border border-border/60 p-3">
                  <div className="font-medium">{r.title}</div>
                  {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Quando sua profissional registrar dicas para o seu cabelo, elas aparecem aqui.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
