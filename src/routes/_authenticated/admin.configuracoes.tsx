import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { adminGetSettings, adminSaveSettings } from "@/lib/settings.functions";
import { maskBrPhone, toE164BR, formatBrFromE164, isValidBrPhone } from "@/lib/phone";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const get = useServerFn(adminGetSettings);
  const save = useServerFn(adminSaveSettings);

  const { data, isLoading } = useQuery({ queryKey: ["adminSettings"], queryFn: () => get() });

  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      company_name: data.company_name ?? "",
      address: data.address ?? "",
      phone: data.phone ? formatBrFromE164(data.phone) : "",
      whatsapp: data.whatsapp ? formatBrFromE164(data.whatsapp) : "",
      instagram: data.instagram ?? "",
      facebook: data.facebook ?? "",
      email: data.email ?? "",
      hero_title: data.hero_title ?? "",
      hero_subtitle: data.hero_subtitle ?? "",
      about_text: data.about_text ?? "",
      logo_url: data.logo_url ?? "",
      banner_url: data.banner_url ?? "",
    });
  }, [data]);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.whatsapp && !isValidBrPhone(form.whatsapp)) {
      toast.error("WhatsApp inválido.");
      return;
    }
    if (form.phone && !isValidBrPhone(form.phone)) {
      toast.error("Telefone inválido.");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          ...form,
          whatsapp: form.whatsapp ? toE164BR(form.whatsapp) : "",
          phone: form.phone ? toE164BR(form.phone) : "",
        },
      });
      toast.success("Configurações salvas.");
      qc.invalidateQueries({ queryKey: ["adminSettings"] });
      qc.invalidateQueries({ queryKey: ["siteSettings"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <form onSubmit={submit} className="space-y-6">
      <header>
        <h2 className="font-display text-2xl text-foreground">Configurações do site</h2>
        <p className="text-sm text-muted-foreground">
          Estes dados aparecem automaticamente no header, footer e seções da home.
        </p>
      </header>

      <Section title="Identidade">
        <Field label="Nome da empresa">
          <input value={form.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} className="input" />
        </Field>
        <Field label="URL do logo (PNG/SVG)">
          <input value={form.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} className="input" placeholder="https://…/logo.png" />
        </Field>
        <Field label="URL do banner principal">
          <input value={form.banner_url ?? ""} onChange={(e) => set("banner_url", e.target.value)} className="input" placeholder="https://…/banner.jpg" />
        </Field>
      </Section>

      <Section title="Contato">
        <Field label="WhatsApp">
          <input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", maskBrPhone(e.target.value))} className="input font-mono" placeholder="(42) 99999-9999" />
        </Field>
        <Field label="Telefone">
          <input value={form.phone ?? ""} onChange={(e) => set("phone", maskBrPhone(e.target.value))} className="input font-mono" placeholder="(42) 3333-3333" />
        </Field>
        <Field label="E-mail">
          <input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} className="input" />
        </Field>
        <Field label="Endereço">
          <input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} className="input" />
        </Field>
        <Field label="Instagram (usuário)">
          <input value={form.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} className="input" placeholder="lummybeautystudio" />
        </Field>
        <Field label="Facebook (URL)">
          <input value={form.facebook ?? ""} onChange={(e) => set("facebook", e.target.value)} className="input" />
        </Field>
      </Section>

      <Section title="Textos institucionais">
        <div className="md:col-span-2">
          <Field label="Título do hero">
            <input value={form.hero_title ?? ""} onChange={(e) => set("hero_title", e.target.value)} className="input" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Subtítulo do hero">
            <textarea rows={2} value={form.hero_subtitle ?? ""} onChange={(e) => set("hero_subtitle", e.target.value)} className="input" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Texto da seção Sobre">
            <textarea rows={4} value={form.about_text ?? ""} onChange={(e) => set("about_text", e.target.value)} className="input" />
          </Field>
        </div>
      </Section>

      <div className="flex justify-end">
        <button disabled={saving} type="submit" className="rounded-full bg-gradient-gold px-6 py-2.5 text-sm text-white disabled:opacity-50">
          {saving ? "Salvando…" : "Salvar configurações"}
        </button>
      </div>

      <style>{`.input { width:100%; border:1px solid hsl(var(--input)); background:transparent; border-radius:0.375rem; padding:0.5rem 0.75rem; font-size:0.875rem; border-color: var(--color-input); }`}</style>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card p-5">
      <h3 className="font-display text-lg text-foreground">{title}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
