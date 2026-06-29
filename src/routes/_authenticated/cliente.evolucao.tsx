import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPhotos } from "@/lib/cliente360.functions";
import { formatBrDateOnly } from "@/lib/date";

export const Route = createFileRoute("/_authenticated/cliente/evolucao")({
  component: EvolucaoPage,
});

function EvolucaoPage() {
  const get = useServerFn(getMyPhotos);
  const { data, isLoading } = useQuery({ queryKey: ["myPhotos"], queryFn: () => get() });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 font-display text-2xl">Sua evolução</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Veja o registro do antes e depois dos seus atendimentos.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!isLoading && !data?.length && (
        <p className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Ainda não há fotos cadastradas. Peça à sua profissional no próximo atendimento.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {data?.map((p: any) => (
          <div key={p.id} className="overflow-hidden rounded-xl border border-border/60 bg-card">
            {p.url ? (
              <img src={p.url} alt={p.caption ?? ""} className="aspect-square w-full object-cover" />
            ) : (
              <div className="aspect-square w-full bg-secondary" />
            )}
            <div className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide text-gold">{p.tag ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{formatBrDateOnly(p.taken_at)}</span>
              </div>
              {p.caption && <p className="mt-1 text-sm">{p.caption}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
