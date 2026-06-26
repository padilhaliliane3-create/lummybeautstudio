import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import {
  Scissors,
  Sparkles,
  Eye,
  Brush,
  Flower2,
  Palette,
  MessageCircle,
  Calendar,
  Clock,
  MapPin,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import heroImg from "@/assets/hero-salon.jpg";
import { SiteShell, WHATSAPP_LINK } from "@/components/SiteShell";
import { getCatalog } from "@/lib/booking.functions";

const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LUMMY Beauty Studio · Beleza, cuidado e bem-estar" },
      {
        name: "description",
        content:
          "Agende cabelo, unhas, cílios, sobrancelhas, estética e maquiagem com profissionais especialistas no LUMMY Beauty Studio.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: HomePage,
});

const ICONS: Record<string, LucideIcon> = {
  Scissors,
  Sparkles,
  Eye,
  Brush,
  Flower2,
  Palette,
};

function HomePage() {
  const { data } = useSuspenseQuery(catalogQuery);
  const { categories, services } = data;

  return (
    <SiteShell>
      <Hero />
      <Categories categories={categories} />
      <FeaturedServices categories={categories} services={services} />
      <About />
      <CtaStrip />
    </SiteShell>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img
          src={heroImg}
          alt=""
          width={1600}
          height={1200}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/85 to-white/40" />
      </div>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:py-28">
        <div className="flex flex-col justify-center">
          <span className="divider-gold">
            <span className="divider-gold-line" />Beauty Studio<span className="divider-gold-line" />
          </span>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] text-foreground md:text-7xl">
            Cuidado <em className="not-italic text-gradient-gold">premium</em> para você se sentir incrível.
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
            Cabelo, unhas, cílios, sobrancelhas, estética e maquiagem. Reserve seu horário em
            poucos cliques e seja recebida por profissionais especialistas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/agendar"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-7 py-3 text-sm font-medium text-white shadow-elegant transition hover:scale-[1.02]"
            >
              <Calendar className="h-4 w-4" /> Agendar agora
            </Link>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/80 px-7 py-3 text-sm font-medium text-cocoa backdrop-blur transition hover:bg-white"
            >
              <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
            </a>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-border/60 pt-6 text-sm">
            {[
              { k: "+8 anos", v: "de experiência" },
              { k: "+1.500", v: "clientes felizes" },
              { k: "5.0 ★", v: "avaliação média" },
            ].map((x) => (
              <div key={x.k}>
                <dt className="font-display text-2xl text-gold">{x.k}</dt>
                <dd className="text-xs text-muted-foreground">{x.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function Categories({ categories }: { categories: { id: string; name: string; slug: string; icon: string | null }[] }) {
  return (
    <section id="servicos" className="border-t border-border/60 bg-secondary/40 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <span className="divider-gold">
            <span className="divider-gold-line" />Nossos cuidados<span className="divider-gold-line" />
          </span>
          <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">Categorias de serviços</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Tudo o que você precisa para se sentir cuidada — em um único lugar.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = ICONS[cat.icon ?? ""] ?? Sparkles;
            return (
              <Link
                key={cat.id}
                to="/agendar"
                search={{ cat: cat.slug }}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-elegant"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold text-white shadow-soft">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-gold opacity-0 transition group-hover:opacity-100">
                    Agendar →
                  </span>
                </div>
                <h3 className="mt-5 font-display text-2xl text-foreground">{cat.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Descubra nossos serviços de {cat.name.toLowerCase()}.
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturedServices({
  categories,
  services,
}: {
  categories: { id: string; name: string; slug: string }[];
  services: { id: string; name: string; price: number; duration_min: number; category_id: string; description: string | null }[];
}) {
  const featured = services.slice(0, 6);
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="divider-gold">
              <span className="divider-gold-line" />Em destaque<span className="divider-gold-line" />
            </span>
            <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">Serviços queridinhos</h2>
          </div>
          <Link
            to="/agendar"
            className="text-sm font-medium text-gold underline-offset-4 hover:underline"
          >
            Ver tudo →
          </Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((s) => (
            <article
              key={s.id}
              className="flex flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="text-xs uppercase tracking-[0.25em] text-gold">{catName(s.category_id)}</div>
              <h3 className="mt-2 font-display text-2xl text-foreground">{s.name}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
              <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duration_min} min</span>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl text-gold">
                    {Number(s.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              </div>
              <Link
                to="/agendar"
                search={{ service: s.id }}
                className="mt-5 inline-flex items-center justify-center rounded-full border border-gold/40 px-4 py-2 text-sm font-medium text-cocoa transition hover:bg-gradient-gold hover:text-white"
              >
                Agendar este serviço
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="sobre" className="border-t border-border/60 bg-secondary/40 py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-2">
        <div>
          <span className="divider-gold">
            <span className="divider-gold-line" />Sobre o studio<span className="divider-gold-line" />
          </span>
          <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl">
            Um espaço pensado em cada detalhe.
          </h2>
          <p className="mt-4 text-muted-foreground">
            No LUMMY Beauty Studio, beleza é cuidado. Nossa equipe é formada por profissionais
            especialistas que combinam técnica, escuta e produtos premium para entregar uma
            experiência inesquecível em cada visita.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Atendimento personalizado e exclusivo",
              "Produtos profissionais de alta performance",
              "Ambiente acolhedor e higienização rigorosa",
              "Confirmação do horário com entrada de apenas 20%",
            ].map((x) => (
              <li key={x} className="flex items-start gap-3">
                <Star className="mt-0.5 h-4 w-4 text-gold" /> <span>{x}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="aspect-[4/5] overflow-hidden rounded-3xl border border-gold/30 shadow-elegant">
            <img src={heroImg} alt="Interior do LUMMY Beauty Studio" className="h-full w-full object-cover" />
          </div>
          <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-gold/30 bg-white p-5 shadow-elegant md:block">
            <div className="text-xs uppercase tracking-[0.25em] text-gold">Aberto hoje</div>
            <div className="mt-1 font-display text-xl text-foreground">09h – 19h</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaStrip() {
  return (
    <section className="bg-gradient-gold py-14 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-5 md:flex-row">
        <div>
          <h2 className="font-display text-3xl md:text-4xl">Pronta para se sentir incrível?</h2>
          <p className="mt-1 text-white/90">Reserve seu horário em menos de 2 minutos.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/agendar"
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-cocoa shadow-soft transition hover:scale-[1.02]"
          >
            <Calendar className="h-4 w-4" /> Agendar agora
          </Link>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/70 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <span className="ml-1 inline-flex items-center gap-2 text-sm text-white/90">
            <MapPin className="h-4 w-4" /> Atendimento com hora marcada
          </span>
        </div>
      </div>
    </section>
  );
}
