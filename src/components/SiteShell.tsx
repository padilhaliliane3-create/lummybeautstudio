import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Instagram, MessageCircle, Facebook, Mail, MapPin } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeProvider";
import { getSiteSettings } from "@/lib/site.functions";
import { useServerFn } from "@tanstack/react-start";
import { toWaDigits, formatBrFromE164 } from "@/lib/phone";

const DEFAULT_WHATSAPP = "5542999870704";

export function useSiteSettings() {
  const get = useServerFn(getSiteSettings);
  return useQuery({
    queryKey: ["siteSettings"],
    queryFn: () => get(),
    staleTime: 60_000,
  });
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background transition-colors">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function Header() {
  const { data: s } = useSiteSettings();
  const wa = toWaDigits(s?.whatsapp ?? DEFAULT_WHATSAPP);
  const name = s?.company_name ?? "LUMMY";
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-3">
          {s?.logo_url ? (
            <img src={s.logo_url} alt={name} className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <Logo size={44} />
          )}
          <div className="hidden sm:block">
            <div className="font-display text-lg leading-none text-gold">{name.split(" ")[0]?.toUpperCase()}</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Beauty Studio
            </div>
          </div>
        </Link>
        <nav className="hidden items-center gap-7 text-sm md:flex">
          <Link to="/" className="text-foreground/80 transition hover:text-gold">Início</Link>
          <a href="/#servicos" className="text-foreground/80 transition hover:text-gold">Serviços</a>
          <a href="/#sobre" className="text-foreground/80 transition hover:text-gold">Sobre</a>
          <a href="/#contato" className="text-foreground/80 transition hover:text-gold">Contato</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/cliente" className="hidden text-xs text-muted-foreground hover:text-gold sm:inline">
            Minha área
          </Link>
          <Link to="/auth" className="hidden text-xs text-muted-foreground hover:text-gold sm:inline">
            Entrar
          </Link>
          <Link
            to="/agendar"
            className="inline-flex items-center rounded-full bg-gradient-gold px-5 py-2 text-sm font-medium text-white shadow-soft transition hover:opacity-95"
          >
            Agendar
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { data: s } = useSiteSettings();
  const waNumber = s?.whatsapp ?? DEFAULT_WHATSAPP;
  const wa = toWaDigits(waNumber);
  const waDisplay = formatBrFromE164(waNumber);
  const link = `https://wa.me/${wa}?text=${encodeURIComponent("Olá! Vim pelo site da LUMMY.")}`;
  const insta = s?.instagram ?? "lummybeautystudio";
  const name = s?.company_name ?? "LUMMY Beauty Studio";

  return (
    <footer id="contato" className="border-t border-border/60 bg-secondary">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            {s?.logo_url ? (
              <img src={s.logo_url} alt={name} className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <Logo size={48} />
            )}
            <div>
              <div className="font-display text-lg leading-none text-gold">{name.split(" ")[0]?.toUpperCase()}</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Beauty Studio
              </div>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Um cuidado completo com você. Beleza, autoestima e bem-estar em um só lugar.
          </p>
          {s?.address && (
            <p className="mt-3 inline-flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 text-gold" /> {s.address}
            </p>
          )}
        </div>

        <div>
          <h3 className="font-display text-lg text-foreground">Horários</h3>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>Segunda a sexta · 09h – 19h</li>
            <li>Sábado · 09h – 17h</li>
            <li>Domingo · fechado</li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-lg text-foreground">Fale com a gente</h3>
          <div className="mt-3 flex flex-col gap-3 text-sm">
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-foreground/80 hover:text-gold">
              <MessageCircle className="h-4 w-4" /> {waDisplay}
            </a>
            {insta && (
              <a href={`https://instagram.com/${insta.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-foreground/80 hover:text-gold">
                <Instagram className="h-4 w-4" /> @{insta.replace(/^@/, "")}
              </a>
            )}
            {s?.facebook && (
              <a href={s.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-foreground/80 hover:text-gold">
                <Facebook className="h-4 w-4" /> Facebook
              </a>
            )}
            {s?.email && (
              <a href={`mailto:${s.email}`} className="inline-flex items-center gap-2 text-foreground/80 hover:text-gold">
                <Mail className="h-4 w-4" /> {s.email}
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {name} · Todos os direitos reservados.
      </div>
    </footer>
  );
}

// Back-compat exports
export const WHATSAPP = DEFAULT_WHATSAPP;
export const WHATSAPP_LINK = `https://wa.me/${DEFAULT_WHATSAPP}?text=${encodeURIComponent("Olá! Vim pelo site da LUMMY.")}`;
