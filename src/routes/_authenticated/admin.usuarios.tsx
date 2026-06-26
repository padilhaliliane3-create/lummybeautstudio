import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Shield, ShieldOff, UserCheck } from "lucide-react";
import { adminListUsers, adminPromote, adminDemote } from "@/lib/users.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListUsers);
  const promote = useServerFn(adminPromote);
  const demote = useServerFn(adminDemote);

  const { data, isLoading } = useQuery({ queryKey: ["adminUsers"], queryFn: () => list() });

  async function onPromote(userId: string) {
    try {
      await promote({ data: { userId } });
      toast.success("Usuário promovido a administrador.");
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao promover.");
    }
  }
  async function onDemote(userId: string) {
    if (!confirm("Remover permissão de administrador?")) return;
    try {
      await demote({ data: { userId } });
      toast.success("Permissão removida.");
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao remover.");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="font-display text-2xl text-foreground">Usuários e permissões</h2>
        <p className="text-sm text-muted-foreground">
          Promova ou remova administradores. Apenas administradores acessam esta área.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Permissão</th>
              <th className="px-4 py-3">Último acesso</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Carregando…</td></tr>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Nenhum usuário.</td></tr>
            )}
            {data?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{u.email}</div>
                  <div className="text-[11px] text-muted-foreground">{u.id.slice(0, 8)}…</div>
                </td>
                <td className="px-4 py-3">
                  {u.isAdmin ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-2.5 py-0.5 text-xs text-white">
                      <Shield className="h-3 w-3" /> Administrador
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-foreground/70">
                      <UserCheck className="h-3 w-3" /> Usuário
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.isAdmin ? (
                    <button
                      onClick={() => onDemote(u.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary"
                    >
                      <ShieldOff className="h-3 w-3" /> Remover admin
                    </button>
                  ) : (
                    <button
                      onClick={() => onPromote(u.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-3 py-1 text-xs text-white"
                    >
                      <Shield className="h-3 w-3" /> Tornar admin
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
