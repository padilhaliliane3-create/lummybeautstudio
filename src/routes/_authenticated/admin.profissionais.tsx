import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import {
  adminLoadAll,
  adminSaveProfessional,
  adminDeleteProfessional,
} from "@/lib/admin.functions";
import { ImageUploader } from "@/components/ImageUploader";

export const Route = createFileRoute("/_authenticated/admin/profissionais")({
  component: ProsPage,
});

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function ProsPage() {
  const loadAll = useServerFn(adminLoadAll);
  const save = useServerFn(adminSaveProfessional);
  const del = useServerFn(adminDeleteProfessional);
  const qc = useQueryClient();

  const all = useQuery({ queryKey: ["adminAll"], queryFn: () => loadAll() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["adminAll"] });
  const mSave = useMutation({ mutationFn: (v: any) => save({ data: v }), onSuccess: refresh });
  const mDel = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: refresh });

  const [editing, setEditing] = useState<any>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Profissionais</h2>
        <button
          onClick={() =>
            setEditing({
              name: "",
              specialty: "",
              bio: "",
              whatsapp: "",
              email: "",
              photo_url: "",
              active: true,
              working_days: [1, 2, 3, 4, 5, 6],
              work_start: "09:00",
              work_end: "19:00",
              slot_minutes: 30,
              serviceIds: [],
            })
          }
          className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-3 py-1.5 text-xs font-medium text-white"
        >
          <Plus className="h-3 w-3" /> Novo
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(all.data?.professionals ?? []).map((p) => {
          const svcIds = (all.data?.links ?? []).filter((l) => l.professional_id === p.id).map((l) => l.service_id);
          return (
            <div key={p.id} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.specialty}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing({ ...p, serviceIds: svcIds })} className="rounded p-1 hover:bg-secondary">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => confirm(`Excluir ${p.name}?`) && mDel.mutate(p.id)}
                    className="rounded p-1 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div>📱 {p.whatsapp}</div>
                <div>⏰ {p.work_start?.slice(0, 5)}–{p.work_end?.slice(0, 5)} · {(p.working_days ?? []).map((d: number) => DAYS[d]).join(" ")}</div>
                <div>✂ {svcIds.length} serviço(s) · {p.active ? "ativo" : "inativo"}</div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Editar profissional" : "Novo profissional"}>
          <ProForm
            value={editing}
            services={all.data?.services ?? []}
            onSubmit={(v: any) => mSave.mutate(v, { onSuccess: () => setEditing(null) })}
            loading={mSave.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

function ProForm({ value, services, onSubmit, loading }: any) {
  const [v, setV] = useState(value);
  const toggleDay = (d: number) => {
    const cur: number[] = v.working_days ?? [];
    setV({ ...v, working_days: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort() });
  };
  const toggleSvc = (id: string) => {
    const cur: string[] = v.serviceIds ?? [];
    setV({ ...v, serviceIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          id: v.id,
          name: v.name,
          specialty: v.specialty || "",
          bio: v.bio || "",
          whatsapp: v.whatsapp,
          email: v.email || "",
          photo_url: v.photo_url || "",
          active: !!v.active,
          working_days: v.working_days,
          work_start: v.work_start,
          work_end: v.work_end,
          slot_minutes: Number(v.slot_minutes ?? 30),
          serviceIds: v.serviceIds ?? [],
        });
      }}
      className="space-y-3 text-sm"
    >
      <Field label="Nome">
        <input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Especialidade">
          <input value={v.specialty ?? ""} onChange={(e) => setV({ ...v, specialty: e.target.value })} className={inputCls} />
        </Field>
        <Field label="WhatsApp">
          <input required value={v.whatsapp ?? ""} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <Field label="Foto (URL)">
        <input value={v.photo_url ?? ""} onChange={(e) => setV({ ...v, photo_url: e.target.value })} className={inputCls} />
      </Field>
      <div>
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Dias de trabalho</label>
        <div className="mt-1 flex flex-wrap gap-1">
          {DAYS.map((d, i) => {
            const on = (v.working_days ?? []).includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`rounded-md border px-2.5 py-1 text-xs ${on ? "border-gold bg-gold/10 text-gold" : "border-input text-muted-foreground"}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Início"><input type="time" value={v.work_start} onChange={(e) => setV({ ...v, work_start: e.target.value })} className={inputCls} /></Field>
        <Field label="Fim"><input type="time" value={v.work_end} onChange={(e) => setV({ ...v, work_end: e.target.value })} className={inputCls} /></Field>
        <Field label="Slot (min)"><input type="number" min={10} max={120} value={v.slot_minutes ?? 30} onChange={(e) => setV({ ...v, slot_minutes: e.target.value })} className={inputCls} /></Field>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Serviços que atende</label>
        <div className="mt-1 max-h-40 space-y-1 overflow-auto rounded-md border border-input p-2 text-xs">
          {services.map((s: any) => (
            <label key={s.id} className="flex items-center gap-2">
              <input type="checkbox" checked={(v.serviceIds ?? []).includes(s.id)} onChange={() => toggleSvc(s.id)} />
              {s.name}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={!!v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> Ativo
      </label>
      <button disabled={loading} className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-4 py-2 text-sm font-medium text-white">
        <Save className="h-3.5 w-3.5" /> Salvar
      </button>
    </form>
  );
}

function Modal({ children, onClose, title }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg">{title}</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
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
