import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Save, X } from "lucide-react";
import { adminLoadAll, adminSaveBlock, adminDeleteBlock } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/bloqueios")({
  component: BlocksPage,
});

function BlocksPage() {
  const loadAll = useServerFn(adminLoadAll);
  const save = useServerFn(adminSaveBlock);
  const del = useServerFn(adminDeleteBlock);
  const qc = useQueryClient();

  const all = useQuery({ queryKey: ["adminAll"], queryFn: () => loadAll() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["adminAll"] });
  const mSave = useMutation({ mutationFn: (v: any) => save({ data: v }), onSuccess: refresh });
  const mDel = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: refresh });

  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState({
    professional_id: "",
    block_date: today,
    start_time: "09:00",
    end_time: "19:00",
    reason: "",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Bloqueios e folgas</h2>
        <button
          onClick={() => {
            setV({ ...v, professional_id: all.data?.professionals?.[0]?.id ?? "" });
            setOpen(true);
          }}
          className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-3 py-1.5 text-xs font-medium text-white"
        >
          <Plus className="h-3 w-3" /> Novo bloqueio
        </button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card">
        {(all.data?.blocks?.length ?? 0) === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhum bloqueio cadastrado.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {all.data!.blocks.map((b) => {
              const pro = all.data?.professionals.find((p) => p.id === b.professional_id);
              return (
                <li key={b.id} className="flex items-center gap-3 p-4 text-sm">
                  <div className="font-mono text-base text-gold">{b.block_date}</div>
                  <div className="flex-1">
                    <div className="font-medium">{pro?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.start_time?.slice(0, 5) ?? "00:00"}–{b.end_time?.slice(0, 5) ?? "23:59"}
                      {b.reason && ` · ${b.reason}`}
                    </div>
                  </div>
                  <button
                    onClick={() => confirm("Remover bloqueio?") && mDel.mutate(b.id)}
                    className="rounded p-1 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg">Novo bloqueio</h3>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mSave.mutate(v, { onSuccess: () => setOpen(false) });
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Profissional</label>
                <select required value={v.professional_id} onChange={(e) => setV({ ...v, professional_id: e.target.value })} className={inputCls}>
                  <option value="">Selecione…</option>
                  {(all.data?.professionals ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Data</label>
                <input type="date" required value={v.block_date} onChange={(e) => setV({ ...v, block_date: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-muted-foreground">De</label>
                  <input type="time" required value={v.start_time} onChange={(e) => setV({ ...v, start_time: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Até</label>
                  <input type="time" required value={v.end_time} onChange={(e) => setV({ ...v, end_time: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Motivo</label>
                <input value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} className={inputCls} />
              </div>
              <button disabled={mSave.isPending} className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-4 py-2 text-sm font-medium text-white">
                <Save className="h-3.5 w-3.5" /> Salvar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";
