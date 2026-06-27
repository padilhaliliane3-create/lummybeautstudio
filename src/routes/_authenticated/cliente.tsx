import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeProvider";
import { getMyClient } from "@/lib/client-area.functions";
import { LayoutDashboard, CalendarCheck, Sparkles, UserCircle2, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente")({
  component: ClienteLayout,
});


export const Route = createFileRoute("/_authenticated/cliente")({
  component: ClienteLayout,
});

const nav = [
  { to: "/cliente", label: "Início", icon: LayoutDashboard, exact: true },
  { to: "/cliente/agendamentos", label: "Meus agendamentos", icon: CalendarCheck },
  { to: "/cliente/cronograma", label: "Cronograma capilar", icon: Sparkles },
  { to: "/cliente/perfil", label: "Meu perfil", icon: UserCircle2 },
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

      <nav className="sticky top-14 z-30 flex gap-1 overflow-x-auto border-b border-border/60 bg-background/80 px-4 py-2 backdrop-blur md:px-6">
        {nav.map((item) => {
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to as any}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
                active ? "bg-gradient-gold text-white shadow-soft" : "text-foreground/70 hover:bg-secondary"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

function ClaimAccount({ onDone, onSignOut }: { onDone: () => void; onSignOut: () => void }) {
  const claim = useServerFn(claimMyClient);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      // Backend espera só dígitos no whatsapp; vamos limpar
      const onlyDigits = whatsapp.replace(/\D/g, "");
      const e164 = onlyDigits.startsWith("55") ? onlyDigits : `55${onlyDigits}`;
      await claim({ data: { whatsapp: e164, cpf: cpf.replace(/\D/g, ""), name } });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao vincular cadastro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Logo size={56} className="mx-auto" />
          <CardTitle className="font-display text-2xl">Bem-vinda à sua área!</CardTitle>
          <p className="text-sm text-muted-foreground">
            Confirme seus dados para vincular seu histórico ao seu acesso.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Nome completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input
              value={whatsapp}
              placeholder="(42) 99999-9999"
              onChange={(e) => setWhatsapp(maskBrPhoneInput(e.target.value))}
            />
          </div>
          <div>
            <Label>CPF (se cadastrou no salão)</Label>
            <Input
              value={cpf}
              placeholder="000.000.000-00"
              onChange={(e) => setCpf(maskCpfInput(e.target.value))}
            />
          </div>
          {error && <p className="rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          <Button className="w-full" onClick={submit} disabled={loading || !whatsapp}>
            {loading ? "Vinculando…" : "Vincular meu cadastro"}
          </Button>
          <button onClick={onSignOut} className="block w-full text-xs text-muted-foreground hover:text-gold">
            Sair
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
