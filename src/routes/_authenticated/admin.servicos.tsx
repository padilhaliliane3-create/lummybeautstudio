import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import {
  adminLoadAll,
  adminSaveService,
  adminDeleteService,
  adminSaveCategory,
  adminDeleteCategory,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/servicos")({
  component: ServicesPage,
});

function ServicesPage() {
  const loadAll = useServerFn(adminLoadAll);
  const saveSvc = useServerFn(adminSaveService);
  const delSvc = useServerFn(adminDeleteService);
  const saveCat = useServerFn(adminSaveCategory);
  const delCat = useServerFn(adminDeleteCategory);
  const qc = useQueryClient();

  const all = useQuery({ queryKey: ["adminAll"], queryFn: () => loadAll() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["adminAll"] });

  const mSave = useMutation({ mutationFn: (v: any) => saveSvc({ data: v }), onSuccess: refresh });
  const mDel = useMutation({ mutationFn: (id: string) => delSvc({ data: { id } }), onSuccess: refresh });
  const mSaveCat = useMutation({ mutationFn: (v: any) => saveCat({ data: v }), onSuccess: refresh });
  const mDelCat = useMutation({ mutationFn: (id: string) => delCat({ data: { id } }), onSuccess: refresh });

  const [editing, setEditing] = useState<any>(null);
  const [editingCat, setEditingCat] = useState<any>(null);

  return (
    <div className="space-y-6">
      {/* Categories */}
      <section className="rounded-xl border border-border/60 bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground">Categorias</h2>
          <button
            onClick={() => setEditingCat({ name: "", slug: "", icon: "", sort_order: 0, active: true })}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-3 py-1.5 text-xs font-medium text-white"
          >
            <Plus className="h-3 w-3" /> Nova
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(all.data?.categories ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">/{c.slug} {!c.active && "· inativa"}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditingCat(c)} className="rounded p-1 hover:bg-secondary">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => confirm(`Excluir "${c.name}"?`) && mDelCat.mutate(c.id)}
                  className="rounded p-1 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="rounded-xl border border-border/60 bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground">Serviços</h2>
          <button
            onClick={() =>
              setEditing({
                category_id: all.data?.categories?.[0]?.id ?? "",
                name: "",
                description: "",
                duration_min: 60,
                price: 0,
                active: true,
              })
            }
            className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-3 py-1.5 text-xs font-medium text-white"
          >
            <Plus className="h-3 w-3" /> Novo
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-2 text-left">Serviço</th>
                <th className="py-2 text-left">Categoria</th>
                <th className="py-2 text-right">Duração</th>
                <th className="py-2 text-right">Preço</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {(all.data?.services ?? []).map((s) => {
                const cat = all.data?.categories.find((c) => c.id === s.category_id);
                return (
                  <tr key={s.id} className="border-b border-border/40">
                    <td className="py-2">
                      <div className="font-medium">{s.name}</div>
                      {!s.active && <span className="text-[10px] text-muted-foreground">inativo</span>}
                    </td>
                    <td className="py-2 text-muted-foreground">{cat?.name ?? "—"}</td>
                    <td className="py-2 text-right font-mono">{s.duration_min}min</td>
                    <td className="py-2 text-right font-mono">R$ {Number(s.price).toFixed(2)}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => setEditing(s)} className="rounded p-1 hover:bg-secondary">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => confirm(`Excluir "${s.name}"?`) && mDel.mutate(s.id)}
                        className="rounded p-1 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Editar serviço" : "Novo serviço"}>
          <ServiceForm
            value={editing}
            categories={all.data?.categories ?? []}
            onSubmit={(v) => mSave.mutate(v, { onSuccess: () => setEditing(null) })}
            loading={mSave.isPending}
          />
        </Modal>
      )}
      {editingCat && (
        <Modal onClose={() => setEditingCat(null)} title={editingCat.id ? "Editar categoria" : "Nova categoria"}>
          <CategoryForm
            value={editingCat}
            onSubmit={(v) => mSaveCat.mutate(v, { onSuccess: () => setEditingCat(null) })}
            loading={mSaveCat.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg">{title}</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ServiceForm({ value, categories, onSubmit, loading }: any) {
  const [v, setV] = useState(value);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          id: v.id,
          category_id: v.category_id,
          name: v.name,
          description: v.description || "",
          duration_min: Number(v.duration_min),
          price: Number(v.price),
          active: !!v.active,
        });
      }}
      className="space-y-3 text-sm"
    >
      <Field label="Nome">
        <input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Categoria">
        <select required value={v.category_id} onChange={(e) => setV({ ...v, category_id: e.target.value })} className={inputCls}>
          <option value="">Selecione…</option>
          {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Descrição">
        <textarea rows={2} value={v.description ?? ""} onChange={(e) => setV({ ...v, description: e.target.value })} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duração (min)">
          <input type="number" required min={5} value={v.duration_min} onChange={(e) => setV({ ...v, duration_min: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Preço (R$)">
          <input type="number" required step="0.01" min={0} value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={!!v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} />
        Ativo
      </label>
      <button disabled={loading} className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-4 py-2 text-sm font-medium text-white">
        <Save className="h-3.5 w-3.5" /> Salvar
      </button>
    </form>
  );
}

function CategoryForm({ value, onSubmit, loading }: any) {
  const [v, setV] = useState(value);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          id: v.id,
          name: v.name,
          slug: v.slug || v.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          icon: v.icon || "",
          sort_order: Number(v.sort_order ?? 0),
          active: !!v.active,
        });
      }}
      className="space-y-3 text-sm"
    >
      <Field label="Nome">
        <input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Slug">
        <input value={v.slug ?? ""} onChange={(e) => setV({ ...v, slug: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Ícone (emoji)">
        <input value={v.icon ?? ""} onChange={(e) => setV({ ...v, icon: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Ordem">
        <input type="number" value={v.sort_order ?? 0} onChange={(e) => setV({ ...v, sort_order: e.target.value })} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={!!v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} />
        Ativa
      </label>
      <button disabled={loading} className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-4 py-2 text-sm font-medium text-white">
        <Save className="h-3.5 w-3.5" /> Salvar
      </button>
    </form>
  );
}

const inputCls = "mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";
function Field({ label, children }: any) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
