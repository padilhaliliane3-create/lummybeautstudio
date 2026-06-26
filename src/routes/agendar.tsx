import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  Clock,
  CreditCard,
  Loader2,
  MessageCircle,
  Star,
  User as UserIcon,
} from "lucide-react";

import { SiteShell, WHATSAPP_LINK } from "@/components/SiteShell";
import {
  createBooking,
  getCatalog,
  getProfessionalAvailability,
} from "@/lib/booking.functions";

const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
});

const searchSchema = z.object({
  cat: z.string().optional(),
  service: z.string().optional(),
});

export const Route = createFileRoute("/agendar")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Agendar · LUMMY Beauty Studio" },
      { name: "description", content: "Reserve seu horário com nossos profissionais especialistas." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: AgendarPage,
});

type Step = "category" | "service" | "professional" | "datetime" | "client" | "payment" | "done";

type ClientForm = { name: string; whatsapp: string; email: string; cpf: string; birth_date: string; address: string; notes: string };

type CreatedBooking = Awaited<ReturnType<typeof createBooking>>;

function AgendarPage() {
  const { data: catalog } = useSuspenseQuery(catalogQuery);
  const search = Route.useSearch();
  const navigate = useNavigate();

  const initialCategory =
    search.cat ? catalog.categories.find((c) => c.slug === search.cat)?.id ?? null : null;
  const initialService =
    search.service ? catalog.services.find((s) => s.id === search.service)?.id ?? null : null;
  const initialCategoryFromService = initialService
    ? catalog.services.find((s) => s.id === initialService)?.category_id ?? null
    : initialCategory;

  const [step, setStep] = useState<Step>(
    initialService ? "professional" : initialCategoryFromService ? "service" : "category",
  );
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryFromService);
  const [serviceId, setServiceId] = useState<string | null>(initialService);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [client, setClient] = useState<ClientForm>({ name: "", whatsapp: "", email: "", cpf: "", birth_date: "", address: "", notes: "" });
  const [booking, setBooking] = useState<CreatedBooking | null>(null);

  const service = catalog.services.find((s) => s.id === serviceId) ?? null;
  const professional = catalog.professionals.find((p) => p.id === professionalId) ?? null;

  function goTo(next: Step) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setStep("category");
    setCategoryId(null);
    setServiceId(null);
    setProfessionalId(null);
    setDate(null);
    setTime(null);
    setBooking(null);
    navigate({ to: "/agendar", search: {} });
  }

  return (
    <SiteShell>
      <section className="bg-secondary/40 py-10">
        <div className="mx-auto max-w-3xl px-5">
          <div className="text-center">
            <span className="divider-gold">
              <span className="divider-gold-line" />Agendamento<span className="divider-gold-line" />
            </span>
            <h1 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
              {step === "done" ? "Tudo certo!" : "Reserve seu horário"}
            </h1>
            {step !== "done" && (
              <p className="mt-2 text-sm text-muted-foreground">
                Em menos de 2 minutos você garante o seu cuidado.
              </p>
            )}
          </div>
          <Stepper step={step} />
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-3xl px-5">
          {step === "category" && (
            <CategoryStep
              catalog={catalog}
              onSelect={(id) => {
                setCategoryId(id);
                setServiceId(null);
                goTo("service");
              }}
            />
          )}

          {step === "service" && categoryId && (
            <ServiceStep
              catalog={catalog}
              categoryId={categoryId}
              onBack={() => goTo("category")}
              onSelect={(id) => {
                setServiceId(id);
                setProfessionalId(null);
                goTo("professional");
              }}
            />
          )}

          {step === "professional" && service && (
            <ProfessionalStep
              catalog={catalog}
              service={service}
              onBack={() => goTo("service")}
              onSelect={(id) => {
                setProfessionalId(id);
                setDate(null);
                setTime(null);
                goTo("datetime");
              }}
            />
          )}

          {step === "datetime" && professional && service && (
            <DateTimeStep
              professional={professional}
              service={service}
              date={date}
              time={time}
              setDate={(d) => { setDate(d); setTime(null); }}
              setTime={setTime}
              onBack={() => goTo("professional")}
              onNext={() => goTo("client")}
            />
          )}

          {step === "client" && (
            <ClientStep
              client={client}
              setClient={setClient}
              onBack={() => goTo("datetime")}
              onNext={() => goTo("payment")}
            />
          )}

          {step === "payment" && service && professional && date && time && (
            <PaymentStep
              service={service}
              professional={professional}
              date={date}
              time={time}
              client={client}
              onBack={() => goTo("client")}
              onConfirmed={(b) => { setBooking(b); goTo("done"); }}
            />
          )}

          {step === "done" && booking && (
            <DoneStep booking={booking} onReset={reset} />
          )}
        </div>
      </section>
    </SiteShell>
  );
}

/* ============================================================
 *  STEPPER
 * ============================================================ */
const STEPS: { key: Step; label: string }[] = [
  { key: "category", label: "Categoria" },
  { key: "service", label: "Serviço" },
  { key: "professional", label: "Profissional" },
  { key: "datetime", label: "Data" },
  { key: "client", label: "Você" },
  { key: "payment", label: "Pagamento" },
];

function Stepper({ step }: { step: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === step);
  const visible = step === "done" ? STEPS.length : currentIdx;
  return (
    <ol className="mx-auto mt-8 flex max-w-2xl items-center justify-between gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
      {STEPS.map((s, i) => {
        const done = i < visible || step === "done";
        const active = i === currentIdx && step !== "done";
        return (
          <li key={s.key} className="flex flex-1 items-center gap-1">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition ${
                done
                  ? "border-transparent bg-gradient-gold text-white"
                  : active
                    ? "border-gold text-gold"
                    : "border-border text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={`hidden sm:inline ${active ? "text-gold" : ""}`}>{s.label}</span>
            {i < STEPS.length - 1 && (
              <span className={`h-px flex-1 ${done ? "bg-gold/60" : "bg-border"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function NavRow({ onBack, onNext, nextLabel = "Continuar", canNext = true }: {
  onBack?: () => void; onNext?: () => void; nextLabel?: string; canNext?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      {onBack ? (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      ) : <span />}
      {onNext && (
        <button
          disabled={!canNext}
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-medium text-white shadow-soft transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {nextLabel} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ============================================================
 *  STEPS
 * ============================================================ */
function CategoryStep({
  catalog,
  onSelect,
}: {
  catalog: Awaited<ReturnType<typeof getCatalog>>;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-foreground">Escolha uma categoria</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {catalog.categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-elegant"
          >
            <div>
              <div className="font-display text-xl text-foreground">{c.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {catalog.services.filter((s) => s.category_id === c.id).length} serviços
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gold transition group-hover:translate-x-1" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ServiceStep({
  catalog,
  categoryId,
  onBack,
  onSelect,
}: {
  catalog: Awaited<ReturnType<typeof getCatalog>>;
  categoryId: string;
  onBack: () => void;
  onSelect: (id: string) => void;
}) {
  const services = catalog.services.filter((s) => s.category_id === categoryId);
  const category = catalog.categories.find((c) => c.id === categoryId);
  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h2 className="font-display text-2xl text-foreground">Serviços · {category?.name}</h2>
      <div className="mt-6 space-y-3">
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="group block w-full rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-elegant"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-display text-xl text-foreground">{s.name}</div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {s.duration_min} min
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-2xl text-gold">
                  {Number(s.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-gold opacity-0 transition group-hover:opacity-100">
                  Escolher <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfessionalStep({
  catalog,
  service,
  onBack,
  onSelect,
}: {
  catalog: Awaited<ReturnType<typeof getCatalog>>;
  service: NonNullable<Awaited<ReturnType<typeof getCatalog>>["services"][number]>;
  onBack: () => void;
  onSelect: (id: string) => void;
}) {
  const pros = catalog.professionals.filter((p) =>
    catalog.links.some((l) => l.service_id === service.id && l.professional_id === p.id),
  );
  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <SummaryCard service={service} />
      <h2 className="mt-6 font-display text-2xl text-foreground">Escolha o profissional</h2>
      {pros.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          Nenhum profissional disponível para este serviço.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {pros.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-elegant"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-gold font-display text-xl text-white">
                {p.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg text-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.specialty}</div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 text-gold">
                    <Star className="h-3.5 w-3.5 fill-current" /> {Number(p.rating).toFixed(1)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {p.slot_minutes} min
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateTimeStep({
  professional,
  service,
  date,
  time,
  setDate,
  setTime,
  onBack,
  onNext,
}: {
  professional: NonNullable<Awaited<ReturnType<typeof getCatalog>>["professionals"][number]>;
  service: NonNullable<Awaited<ReturnType<typeof getCatalog>>["services"][number]>;
  date: string | null;
  time: string | null;
  setDate: (d: string) => void;
  setTime: (t: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const days = useMemo(() => buildNextDays(30, professional.working_days), [professional.working_days]);
  // pré-seleciona o primeiro dia
  useEffect(() => {
    if (!date && days[0]) setDate(days[0].iso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length]);

  const fetchAvailability = useServerFn(getProfessionalAvailability);
  const avail = useQuery({
    queryKey: ["availability", professional.id, date],
    enabled: !!date,
    queryFn: () => fetchAvailability({ data: { professionalId: professional.id, date: date! } }),
  });

  const slots = useMemo(() => {
    if (!date) return [];
    return buildSlots({
      workStart: professional.work_start,
      workEnd: professional.work_end,
      slotMinutes: professional.slot_minutes,
      serviceMinutes: service.duration_min,
      taken: (avail.data?.bookings ?? []).map((b) => ({ start: b.start_time, end: b.end_time })),
      blocks: (avail.data?.blocks ?? []).map((b) => ({
        start: b.start_time ?? "00:00",
        end: b.end_time ?? "23:59",
      })),
    });
  }, [date, professional, service, avail.data]);

  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <SummaryCard service={service} professional={professional} />
      <h2 className="mt-6 font-display text-2xl text-foreground">Escolha a data</h2>
      <div className="mt-4 -mx-2 flex gap-2 overflow-x-auto px-2 pb-2">
        {days.map((d) => {
          const active = d.iso === date;
          return (
            <button
              key={d.iso}
              onClick={() => setDate(d.iso)}
              className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border px-3 py-3 text-center transition ${
                active
                  ? "border-transparent bg-gradient-gold text-white shadow-soft"
                  : "border-border bg-card text-foreground hover:border-gold/60"
              }`}
            >
              <span className="text-[10px] uppercase tracking-widest opacity-80">{d.weekday}</span>
              <span className="font-display text-xl">{d.day}</span>
              <span className="text-[10px] opacity-80">{d.month}</span>
            </button>
          );
        })}
      </div>

      <h2 className="mt-8 font-display text-2xl text-foreground">Horários disponíveis</h2>
      {avail.isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Buscando horários…
        </div>
      ) : slots.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          Nenhum horário disponível neste dia. Tente outra data.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {slots.map((s) => (
            <button
              key={s.time}
              disabled={!s.available}
              onClick={() => setTime(s.time)}
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                time === s.time
                  ? "border-transparent bg-gradient-gold text-white shadow-soft"
                  : s.available
                    ? "border-border bg-card text-foreground hover:border-gold/60"
                    : "border-border bg-muted/40 text-muted-foreground/60 line-through"
              }`}
            >
              {s.time}
            </button>
          ))}
        </div>
      )}
      <NavRow onBack={onBack} onNext={onNext} canNext={!!date && !!time} />
    </div>
  );
}

function ClientStep({
  client,
  setClient,
  onBack,
  onNext,
}: {
  client: ClientForm;
  setClient: (c: ClientForm) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const valid =
    client.name.trim().length >= 2 &&
    client.whatsapp.replace(/\D/g, "").length >= 10;
  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h2 className="font-display text-2xl text-foreground">Seus dados</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Usamos para te enviar a confirmação e lembretes do agendamento.
      </p>
      <div className="mt-6 grid gap-4">
        <Field label="Nome completo *">
          <input
            value={client.name}
            onChange={(e) => setClient({ ...client, name: e.target.value })}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            placeholder="Como você gostaria de ser chamada"
            maxLength={120}
          />
        </Field>
        <Field label="WhatsApp *">
          <input
            value={client.whatsapp}
            onChange={(e) => setClient({ ...client, whatsapp: e.target.value })}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            placeholder="(42) 99999-9999"
            maxLength={20}
            inputMode="tel"
          />
        </Field>
        <Field label="E-mail">
          <input
            value={client.email}
            onChange={(e) => setClient({ ...client, email: e.target.value })}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            placeholder="seu@email.com"
            maxLength={160}
            inputMode="email"
          />
        </Field>
        <Field label="Observações">
          <textarea
            value={client.notes}
            onChange={(e) => setClient({ ...client, notes: e.target.value })}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            placeholder="Algo que possamos saber antes do seu horário"
            maxLength={500}
            rows={3}
          />
        </Field>
      </div>
      <NavRow onBack={onBack} onNext={onNext} canNext={valid} nextLabel="Ir para pagamento" />
    </div>
  );
}

function PaymentStep({
  service,
  professional,
  date,
  time,
  client,
  onBack,
  onConfirmed,
}: {
  service: NonNullable<Awaited<ReturnType<typeof getCatalog>>["services"][number]>;
  professional: NonNullable<Awaited<ReturnType<typeof getCatalog>>["professionals"][number]>;
  date: string;
  time: string;
  client: ClientForm;
  onBack: () => void;
  onConfirmed: (b: CreatedBooking) => void;
}) {
  const total = Number(service.price);
  const deposit = Math.round(total * 0.2 * 100) / 100;
  const remaining = Math.round((total - deposit) * 100) / 100;

  const create = useServerFn(createBooking);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          professionalId: professional.id,
          serviceId: service.id,
          date,
          startTime: time,
          client: {
            name: client.name,
            whatsapp: client.whatsapp.replace(/\D/g, ""),
            email: client.email,
            notes: client.notes,
          },
        },
      }),
    onSuccess: (b) => onConfirmed(b),
    onError: (e: Error) => setError(e.message),
  });

  // simulação de QR Pix
  const pixPayload = `LUMMY|${professional.pix_key ?? "lummy@pix"}|${deposit.toFixed(2)}|${time}`;

  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h2 className="font-display text-2xl text-foreground">Confirme e pague a entrada</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="text-xs uppercase tracking-[0.25em] text-gold">Resumo</div>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Serviço" value={service.name} />
            <Row label="Profissional" value={professional.name} />
            <Row label="Data" value={formatDateLong(date)} />
            <Row label="Horário" value={time} />
            <Row label="Duração" value={`${service.duration_min} min`} />
          </div>
          <hr className="my-5 border-border" />
          <div className="space-y-2 text-sm">
            <Row label="Valor total" value={brl(total)} />
            <Row label="Entrada (20%)" value={<span className="font-semibold text-gold">{brl(deposit)}</span>} />
            <Row label="Restante no dia" value={brl(remaining)} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <div className="text-xs uppercase tracking-[0.25em] text-gold">Pix · Entrada</div>
          <div className="mt-2 font-display text-2xl text-foreground">{brl(deposit)}</div>
          <div className="mx-auto mt-4 w-fit rounded-xl border border-border bg-white p-4">
            <QRCodeSVG value={pixPayload} size={170} fgColor="#7a5b1f" />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Chave Pix: <span className="font-medium text-foreground">{professional.pix_key}</span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Pagamento simulado — clicar em <em>Confirmar pagamento</em> reserva o horário.
          </p>
          {error && (
            <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-white shadow-elegant transition disabled:opacity-60"
          >
            {mutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Confirmando…</>
            ) : (
              <><CreditCard className="h-4 w-4" /> Confirmar pagamento</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function DoneStep({ booking, onReset }: { booking: CreatedBooking; onReset: () => void }) {
  const { booking: b, professional, service } = booking;
  const dateLabel = formatDateLong(b.scheduled_date);
  const proWa = `https://wa.me/${professional.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Olá ${professional.name}! Acabei de agendar pelo site da LUMMY.\n\nServiço: ${service.name}\nData: ${dateLabel} às ${b.start_time}\nCódigo: ${b.code}`,
  )}`;
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold text-white shadow-elegant">
        <Check className="h-8 w-8" />
      </div>
      <h2 className="mt-5 font-display text-3xl text-foreground">Seu horário está reservado</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enviamos os detalhes para o seu WhatsApp (em breve, quando a integração for ativada).
      </p>

      <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-gold/40 bg-card p-6 text-left shadow-elegant">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.25em] text-gold">Código</div>
          <div className="font-display text-2xl text-gold">{b.code}</div>
        </div>
        <hr className="my-4 border-border" />
        <dl className="space-y-2 text-sm">
          <Row label="Serviço" value={service.name} />
          <Row label="Profissional" value={professional.name} />
          <Row label="Data" value={dateLabel} />
          <Row label="Horário" value={`${b.start_time} – ${b.end_time}`} />
          <Row label="Valor pago (entrada)" value={<span className="font-semibold text-gold">{brl(Number(b.deposit_amount))}</span>} />
          <Row label="Restante no dia" value={brl(Number(b.remaining_amount))} />
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a
          href={proWa}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-medium text-white shadow-soft"
        >
          <MessageCircle className="h-4 w-4" /> Conversar com o profissional
        </a>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-6 py-2.5 text-sm font-medium text-cocoa hover:bg-accent"
        >
          <MessageCircle className="h-4 w-4" /> Falar com o salão
        </a>
      </div>
      <div className="mt-8 flex justify-center gap-3 text-sm">
        <button onClick={onReset} className="text-muted-foreground hover:text-gold">
          Fazer outro agendamento
        </button>
        <span className="text-muted-foreground">·</span>
        <Link to="/" className="text-muted-foreground hover:text-gold">Voltar ao início</Link>
      </div>
    </div>
  );
}

/* ============================================================
 *  Pequenos componentes
 * ============================================================ */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  );
}

function SummaryCard({
  service,
  professional,
}: {
  service: { name: string; price: number; duration_min: number };
  professional?: { name: string; specialty: string | null };
}) {
  return (
    <div className="rounded-2xl border border-gold/30 bg-accent/30 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        <span className="inline-flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5 text-gold" /> {service.name}</span>
        <span>·</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-gold" /> {service.duration_min} min</span>
        <span>·</span>
        <span className="font-medium text-gold">{brl(Number(service.price))}</span>
        {professional && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-1"><UserIcon className="h-3.5 w-3.5 text-gold" /> {professional.name}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 *  Helpers
 * ============================================================ */
function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function buildNextDays(count: number, workingDays: number[]) {
  const out: { iso: string; weekday: string; day: string; month: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let i = 0;
  while (out.length < count && i < count * 3) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (workingDays.includes(d.getDay())) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({
        iso,
        weekday: WEEKDAYS_SHORT[d.getDay()],
        day: String(d.getDate()).padStart(2, "0"),
        month: MONTHS_SHORT[d.getMonth()],
      });
    }
    i++;
  }
  return out;
}

function buildSlots(args: {
  workStart: string;
  workEnd: string;
  slotMinutes: number;
  serviceMinutes: number;
  taken: { start: string; end: string }[];
  blocks: { start: string; end: string }[];
}) {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const toStr = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const startM = toMin(args.workStart);
  const endM = toMin(args.workEnd);
  const slots: { time: string; available: boolean }[] = [];
  for (let t = startM; t + args.serviceMinutes <= endM; t += args.slotMinutes) {
    const slotEnd = t + args.serviceMinutes;
    const startStr = toStr(t);
    const endStr = toStr(slotEnd);
    const conflict =
      args.taken.some((b) => !(endStr <= b.start || startStr >= b.end)) ||
      args.blocks.some((b) => !(endStr <= b.start || startStr >= b.end));
    slots.push({ time: startStr, available: !conflict });
  }
  return slots;
}

function formatDateLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
