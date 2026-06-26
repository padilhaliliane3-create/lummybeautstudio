import { createFileRoute, Outlet, Link, useNavigate, useRouterState, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Calendar,
  ListChecks,
  Scissors,
  Users,
  CalendarOff,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UserCircle2,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeProvider";
import { getMyRole, claimFirstAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: any; exact?: boolean };
const nav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/agenda", label: "Agenda", icon: Calendar },
  { to: "/admin/agendamentos", label: "Agendamentos", icon: ListChecks },
  { to: "/admin/clientes", label: "Clientes", icon: UserCircle2 },
  { to: "/admin/servicos", label: "Serviços", icon: Scissors },
  { to: "/admin/profissionais", label: "Profissionais", icon: Users },
  { to: "/admin/bloqueios", label: "Bloqueios", icon: CalendarOff },
  { to: "/admin/usuarios", label: "Usuários", icon: ShieldCheck },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function AdminLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const getRole = useServerFn(getMyRole);
  const claim = useServerFn(claimFirstAdmin);

  const { data: role, isLoading, refetch } = useQuery({
    queryKey: ["myRole"],
    queryFn: () => getRole(),
  });

  useEffect(() => {
    setOpen(false);
  }, [path]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando painel…</div>;
  }

  if (!role?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 text-center shadow-soft">
          <Logo size={56} className="mx-auto" />
          <h1 className="mt-3 font-display text-2xl text-foreground">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta ainda não tem permissão de administrador.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={async () => {
                const r = await claim();
                if (r.granted) refetch();
                else alert("Já existe um administrador. Peça acesso a ele.");
              }}
              className="rounded-full bg-gradient-gold px-5 py-2 text-sm font-medium text-white"
            >
              Sou o primeiro admin · ativar
            </button>
            <button onClick={signOut} className="text-xs text-muted-foreground hover:text-gold">
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-secondary/40">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border/60 bg-card transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border/60 px-5">
          <Link to="/admin" className="flex items-center gap-2">
            <Logo size={36} />
            <div>
              <div className="font-display text-base leading-none text-gold">LUMMY</div>
              <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Admin</div>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {nav.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-gradient-gold text-white shadow-soft"
                    : "text-foreground/70 hover:bg-secondary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-border/60 p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col md:ml-0">
        <header className="flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur md:px-6">
          <button onClick={() => setOpen(true)} className="md:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg text-foreground">Painel administrativo</h1>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:text-gold"
            >
              ↗ Ver site
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export { redirect };
