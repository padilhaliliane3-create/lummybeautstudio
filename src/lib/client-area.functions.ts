import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Retorna o cadastro de cliente vinculado à conta autenticada (se houver). */
export const getMyClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clients")
      .select("*")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

/** Reivindica um cadastro existente por whatsapp + CPF (ou whatsapp se cliente não tem CPF). */
export const claimMyClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        whatsapp: z.string().trim().min(8),
        cpf: z.string().trim().optional().or(z.literal("")),
        name: z.string().trim().min(2).max(120).optional(),
        email: z.string().trim().email().max(160).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // já vinculado?
    const mine = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (mine.data) return { client: mine.data, created: false };

    // procura por whatsapp
    const existing = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("whatsapp", data.whatsapp)
      .maybeSingle();
    if (existing.error) throw existing.error;

    if (existing.data) {
      if (existing.data.auth_user_id && existing.data.auth_user_id !== context.userId) {
        throw new Error("Este WhatsApp já está vinculado a outra conta.");
      }
      if (existing.data.cpf && data.cpf && existing.data.cpf !== data.cpf) {
        throw new Error("CPF não confere com o cadastro.");
      }
      const upd = await supabaseAdmin
        .from("clients")
        .update({ auth_user_id: context.userId, cpf: data.cpf || existing.data.cpf })
        .eq("id", existing.data.id)
        .select("*")
        .single();
      if (upd.error) throw upd.error;
      return { client: upd.data, created: false };
    }

    // cria novo
    if (!data.name) throw new Error("Informe seu nome para criar o cadastro.");
    const ins = await supabaseAdmin
      .from("clients")
      .insert({
        name: data.name,
        whatsapp: data.whatsapp,
        cpf: data.cpf || null,
        email: data.email || null,
        auth_user_id: context.userId,
      })
      .select("*")
      .single();
    if (ins.error) throw ins.error;
    return { client: ins.data, created: true };
  });

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profileSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { error } = await sb
      .from("clients")
      .update({
        name: data.name,
        email: data.email || null,
        cpf: data.cpf || null,
        birth_date: data.birth_date || null,
        address: data.address || null,
      })
      .eq("auth_user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const getMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const mine = await sb
      .from("clients")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!mine.data) return [];
    const { data, error } = await sb
      .from("bookings")
      .select("*, service:services(name,price,duration_min), professional:professionals(name,specialty,avatar_url)")
      .eq("client_id", mine.data.id)
      .order("scheduled_date", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const cancelMyBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const mine = await sb
      .from("clients")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!mine.data) throw new Error("Cadastro não vinculado");
    const b = await sb
      .from("bookings")
      .select("scheduled_date,start_time,client_id,status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (b.error || !b.data) throw new Error("Agendamento não encontrado");
    if (b.data.client_id !== mine.data.id) throw new Error("Sem permissão");
    const dt = new Date(`${b.data.scheduled_date}T${b.data.start_time}`);
    if (dt.getTime() - Date.now() < 24 * 3600 * 1000) {
      throw new Error("Cancelamento gratuito disponível até 24h antes.");
    }
    const upd = await sb
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", data.bookingId);
    if (upd.error) throw upd.error;
    return { ok: true };
  });

/* ---------- Cronograma capilar ---------- */
const stepSchema = z.enum(["hidratacao", "nutricao", "reconstrucao"]);

export const getMyHairSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const mine = await sb
      .from("clients")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!mine.data) return [];
    const { data, error } = await sb
      .from("hair_schedules")
      .select("*")
      .eq("client_id", mine.data.id)
      .order("scheduled_date", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const saveMyHairStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        step_type: stepSchema,
        scheduled_date: z.string(),
        notes: z.string().max(300).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const mine = await sb
      .from("clients")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!mine.data) throw new Error("Cadastro não vinculado");
    if (data.id) {
      const { error } = await sb
        .from("hair_schedules")
        .update({
          step_type: data.step_type,
          scheduled_date: data.scheduled_date,
          notes: data.notes || null,
        })
        .eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await sb
      .from("hair_schedules")
      .insert({
        client_id: mine.data.id,
        step_type: data.step_type,
        scheduled_date: data.scheduled_date,
        notes: data.notes || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const toggleMyHairStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), done: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("hair_schedules")
      .update({ done: data.done, done_at: data.done ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteMyHairStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("hair_schedules")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const getMyRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const mine = await sb
      .from("clients")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!mine.data) return [];
    const { data, error } = await sb
      .from("client_recommendations")
      .select("*")
      .eq("client_id", mine.data.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
