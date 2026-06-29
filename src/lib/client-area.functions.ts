import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Retorna o cadastro de cliente vinculado à conta autenticada,
 *  criando automaticamente se ainda não existir. */
export const getMyClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // já vinculado?
    const mine = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (mine.data) return mine.data;

    // tenta vincular por email (cliente cadastrado antes via agendamento)
    const email = (context.claims as any)?.email as string | undefined;
    const meta = ((context.claims as any)?.user_metadata ?? {}) as Record<string, any>;
    const fallbackName =
      meta.full_name || meta.name || (email ? email.split("@")[0] : "Cliente");

    if (email) {
      const byEmail = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("email", email)
        .is("auth_user_id", null)
        .maybeSingle();
      if (byEmail.data) {
        const upd = await supabaseAdmin
          .from("clients")
          .update({ auth_user_id: context.userId })
          .eq("id", byEmail.data.id)
          .select("*")
          .single();
        if (!upd.error && upd.data) return upd.data;
      }
    }

    // cria registro mínimo — usuário completa no /cliente/perfil
    const ins = await supabaseAdmin
      .from("clients")
      .insert({
        name: fallbackName,
        whatsapp: `pendente-${context.userId.slice(0, 8)}`,
        email: email ?? null,
        auth_user_id: context.userId,
      })
      .select("*")
      .single();
    if (ins.error) throw ins.error;
    return ins.data;
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
      .select("*, service:services(name,price,duration_min), professional:professionals(name,specialty,photo_url)")
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

/* ---------- Cronograma Geral (Manutenções) ---------- */

export const getMyMaintenances = createServerFn({ method: "GET" })
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
      .from("client_maintenances")
      .select("*, booking:bookings(id,status)")
      .eq("client_id", mine.data.id)
      .order("scheduled_date", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const replyMyMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["confirmed", "refused"]) }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    
    // Validate ownership
    const mine = await sb
      .from("clients")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!mine.data) throw new Error("Cadastro não vinculado");

    const maint = await sb.from("client_maintenances").select("*").eq("id", data.id).single();
    if (maint.error || !maint.data) throw new Error("Manutenção não encontrada");
    if (maint.data.client_id !== mine.data.id) throw new Error("Sem permissão");
    
    let bookingId = maint.data.booking_id;
    if (data.status === "confirmed" && !bookingId) {
       // auto create booking using arbitrary service/professional to fulfill existing flow
       const s = await sb.from("services").select("id, price").limit(1).single();
       const p = await sb.from("professionals").select("id").limit(1).single();
       if (s.data && p.data) {
           let start = maint.data.suggested_time;
           if (!start) start = "09:00:00";
           // Ensure start time is in HH:mm format for booking
           const startTimeStr = start.substring(0, 5);
           
           // calculate end time (e.g. + 1 hour)
           let endH = parseInt(startTimeStr.split(":")[0]) + 1;
           const endM = startTimeStr.split(":")[1];
           const endTimeStr = `${endH.toString().padStart(2, '0')}:${endM}`;

           const bData = {
               client_id: maint.data.client_id,
               service_id: s.data.id,
               professional_id: p.data.id,
               scheduled_date: maint.data.scheduled_date,
               start_time: startTimeStr,
               end_time: endTimeStr,
               status: "confirmed" as const,
               code: Math.random().toString(36).substring(2, 8).toUpperCase(),
               total_price: s.data.price,
               deposit_amount: 0,
               remaining_amount: s.data.price,
               deposit_paid: false,
               notes: "Auto-gerado a partir do cronograma: " + maint.data.procedure_name
           };
           const bIns = await sb.from("bookings").insert(bData).select("id").single();
           if (bIns.data) {
               bookingId = bIns.data.id;
               console.log("NOTIFICAÇÃO: WhatsApp/Email enviado para confirmação do agendamento", bIns.data.id);
           }
       }
    } else if (data.status === "refused") {
       console.log("NOTIFICAÇÃO: Administrador avisado sobre recusa de manutenção", maint.data.id);
    }
    
    const { error } = await sb.from("client_maintenances").update({ 
       status: data.status,
       booking_id: bookingId 
    }).eq("id", data.id);
    if (error) throw error;
    
    return { ok: true };
  });
