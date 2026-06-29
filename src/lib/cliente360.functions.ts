import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============== ANAMNESE ============== */

const anamnesisSchema = z.object({
  client_id: z.string().uuid(),
  hair_type: z.string().max(120).optional().or(z.literal("")),
  hair_chemistry: z.string().max(300).optional().or(z.literal("")),
  hair_treatments: z.string().max(500).optional().or(z.literal("")),
  scalp_condition: z.string().max(300).optional().or(z.literal("")),
  nail_condition: z.string().max(300).optional().or(z.literal("")),
  allergies: z.string().max(500).optional().or(z.literal("")),
  medications: z.string().max(500).optional().or(z.literal("")),
  health_conditions: z.string().max(500).optional().or(z.literal("")),
  preferences: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

async function assertAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Acesso restrito.");
}

export const adminGetAnamnesis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: row } = await context.supabase
      .from("client_anamnesis")
      .select("*")
      .eq("client_id", data.clientId)
      .maybeSingle();
    return row;
  });

export const adminSaveAnamnesis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => anamnesisSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const payload = {
      client_id: data.client_id,
      hair_type: data.hair_type || null,
      hair_chemistry: data.hair_chemistry || null,
      hair_treatments: data.hair_treatments || null,
      scalp_condition: data.scalp_condition || null,
      nail_condition: data.nail_condition || null,
      allergies: data.allergies || null,
      medications: data.medications || null,
      health_conditions: data.health_conditions || null,
      preferences: data.preferences || null,
      notes: data.notes || null,
    };
    const { error } = await context.supabase
      .from("client_anamnesis")
      .upsert(payload, { onConflict: "client_id" });
    if (error) throw error;
    return { ok: true };
  });

export const getMyAnamnesis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const mine = await sb
      .from("clients")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!mine.data) return null;
    const { data } = await sb
      .from("client_anamnesis")
      .select("*")
      .eq("client_id", mine.data.id)
      .maybeSingle();
    return data;
  });

/* ============== EVOLUÇÃO (fotos) ============== */

async function signPhotos(rows: any[]) {
  if (!rows.length) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return Promise.all(
    rows.map(async (r) => {
      const { data } = await supabaseAdmin.storage
        .from("client-photos")
        .createSignedUrl(r.storage_path, 3600);
      return { ...r, url: data?.signedUrl ?? null };
    }),
  );
}

export const adminListPhotos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("client_evolution_photos")
      .select("*")
      .eq("client_id", data.clientId)
      .order("taken_at", { ascending: false });
    if (error) throw error;
    return signPhotos(rows ?? []);
  });

export const adminAddPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        client_id: z.string().uuid(),
        storage_path: z.string().min(3),
        caption: z.string().max(300).optional().or(z.literal("")),
        taken_at: z.string().optional().or(z.literal("")),
        tag: z.enum(["antes", "depois", "progresso"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("client_evolution_photos").insert({
      client_id: data.client_id,
      storage_path: data.storage_path,
      caption: data.caption || null,
      taken_at: data.taken_at || new Date().toISOString().slice(0, 10),
      tag: data.tag ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const adminDeletePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = await context.supabase
      .from("client_evolution_photos")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row.data?.storage_path) {
      await supabaseAdmin.storage.from("client-photos").remove([row.data.storage_path]);
    }
    const { error } = await context.supabase
      .from("client_evolution_photos")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const getMyPhotos = createServerFn({ method: "GET" })
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
      .from("client_evolution_photos")
      .select("*")
      .eq("client_id", mine.data.id)
      .order("taken_at", { ascending: false });
    if (error) throw error;
    return signPhotos(data ?? []);
  });

/* ============== NOTIFICAÇÕES ============== */

export const adminListNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("client_notifications")
      .select("*")
      .eq("client_id", data.clientId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return rows ?? [];
  });

export const adminCreateNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        client_id: z.string().uuid(),
        title: z.string().min(2).max(160),
        body: z.string().max(2000).optional().or(z.literal("")),
        kind: z.enum(["info", "reminder", "promo", "system"]).optional(),
        link: z.string().max(500).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("client_notifications").insert({
      client_id: data.client_id,
      title: data.title,
      body: data.body || null,
      kind: data.kind ?? "info",
      link: data.link || null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("client_notifications")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const getMyNotifications = createServerFn({ method: "GET" })
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
      .from("client_notifications")
      .select("*")
      .eq("client_id", mine.data.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });

export const getMyUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const mine = await sb
      .from("clients")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!mine.data) return 0;
    const { count } = await sb
      .from("client_notifications")
      .select("id", { count: "exact", head: true })
      .eq("client_id", mine.data.id)
      .is("read_at", null);
    return count ?? 0;
  });

export const markMyNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("client_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const markAllMyNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const mine = await sb
      .from("clients")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!mine.data) return { ok: true };
    await sb
      .from("client_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("client_id", mine.data.id)
      .is("read_at", null);
    return { ok: true };
  });

/* ============== POST ATENDIMENTO (bookings) ============== */

export const adminUpdateBookingPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        products_used: z.string().max(1000).optional().or(z.literal("")),
        post_notes: z.string().max(2000).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("bookings")
      .update({
        products_used: data.products_used || null,
        post_notes: data.post_notes || null,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ============== ADMIN: get client basic ============== */

export const adminGetClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("clients")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    return row;
  });
