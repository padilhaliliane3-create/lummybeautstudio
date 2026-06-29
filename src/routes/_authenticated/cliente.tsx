import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeProvider";
import { getMyClient } from "@/lib/client-area.functions";
import { getMyUnreadCount } from "@/lib/cliente360.functions";
import {
  LayoutDashboard,
  CalendarCheck,
  Sparkles,
  UserCircle2,
  LogOut,
  FileText,
  Image as ImageIcon,
  Bell,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente")({
  component: ClienteLayout,
});

const nav = [
  { to: "/cliente", label: "Início", icon: LayoutDashboard, exact: true },
  { to: "/cliente/agendamentos", label: "Agendamentos", icon: CalendarCheck },
  { to: "/cliente/cronograma", label: "Cronograma", icon: Sparkles },
  { to: "/cliente/evolucao", label: "Evolução", icon: ImageIcon },
  { to: "/cliente/anamnese", label: "Anamnese", icon: FileText },
  { to: "/cliente/notificacoes", label: "Avisos", icon: Bell },
  { to: "/cliente/perfil", label: "Perfil", icon: UserCircle2 },
];

function ClienteLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const getMine = useServerFn(getMyClient);
  const me = useQuery({ queryKey: ["myClient"], queryFn: () => getMine() });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (me.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  // me.data sempre existirá (auto-criado no backend), mas mantemos guarda silenciosa
  if (!me.data) return null;


  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/60 bg-background/90 px-4 backdrop-blur md:px-6">
        <Link to="/cliente" className="flex items-center gap-2">
          <Logo size={32} />
          <div>
            <div className="font-display text-base leading-none text-gold">LUMMY</div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Cliente</div>
          </div>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Link to="/" className="text-xs text-muted-foreground hover:text-gold">↗ Site</Link>
          <button onClick={signOut} className="text-xs text-muted-foreground hover:text-destructive">
            <LogOut className="inline h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </header>

      <NavBar path={path} />


      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavBar({ path }: { path: string }) {
  const getUnread = useServerFn(getMyUnreadCount);
  const { data: unread = 0 } = useQuery({
    queryKey: ["myUnread"],
    queryFn: () => getUnread(),
    refetchInterval: 60_000,
  });
  return (
    <nav className="sticky top-14 z-30 flex gap-1 overflow-x-auto border-b border-border/60 bg-background/80 px-4 py-2 backdrop-blur md:px-6">
      {nav.map((item) => {
        const active = item.exact ? path === item.to : path.startsWith(item.to);
        const Icon = item.icon;
        const showBadge = item.to === "/cliente/notificacoes" && unread > 0;
        return (
          <Link
            key={item.to}
            to={item.to as any}
            className={`relative inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
              active ? "bg-gradient-gold text-white shadow-soft" : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
            {showBadge && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}


