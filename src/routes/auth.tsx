import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Entrar · LUMMY Beauty Studio" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) navigate({ to: await landingFor(data.user.id) });
    });
  }, [navigate]);

  async function landingFor(userId: string): Promise<"/admin" | "/cliente"> {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return data ? "/admin" : "/cliente";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/update-password",
        });
        if (error) throw error;
        setInfo("Email de recuperação enviado! Verifique sua caixa de entrada.");
        setMode("login");
        return;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/cliente" },
        });
        if (error) throw error;
        const { error: signinErr, data: signed } = await supabase.auth.signInWithPassword({ email, password });
        if (signinErr || !signed.user) {
          setInfo("Conta criada. Faça login para entrar.");
          setMode("login");
          return;
        }
        navigate({ to: await landingFor(signed.user.id) });
      } else {
        const { error, data: signed } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !signed.user) throw error ?? new Error("Falha no login");
        navigate({ to: await landingFor(signed.user.id) });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-8 shadow-soft">
        <div className="flex flex-col items-center text-center">
          <Logo size={56} />
          <h1 className="mt-3 font-display text-2xl text-foreground">Painel LUMMY</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "login" ? "Entre com sua conta de equipe ou cliente" : mode === "signup" ? "Crie sua conta" : "Recupere sua senha"}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>
          {mode !== "reset" && (
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Senha</label>
                {mode === "login" && (
                  <button type="button" onClick={() => setMode("reset")} className="text-[10px] text-muted-foreground hover:text-gold">
                    Esqueci a senha
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
          )}

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          {info && <p className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar email"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={async () => {
            setError(null);
            const result = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin,
            });
            if (result.error) setError(result.error.message ?? "Falha no Google");
            if (result.redirected) return;
            const { data } = await supabase.auth.getUser();
            if (data.user) navigate({ to: await landingFor(data.user.id) });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 8-21l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.5-5.2l-6.2-5.3A12 12 0 0 1 12.7 28l-6.6 5A20 20 0 0 0 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.5l6.2 5.3C41 35.5 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z"/>
          </svg>
          Entrar com Google
        </button>

        {mode !== "reset" ? (
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setInfo(null);
            }}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-gold"
          >
            {mode === "login" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
          </button>
        ) : (
          <button
            onClick={() => {
              setMode("login");
              setError(null);
              setInfo(null);
            }}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-gold"
          >
            Voltar para o login
          </button>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-gold">
            ← Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}
