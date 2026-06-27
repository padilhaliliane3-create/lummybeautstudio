import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------------- role ---------------- */

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw error;
    const roles = (data ?? []).map((r) => r.role);
    return { userId: context.userId, roles, isAdmin: roles.includes("admin") };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_first_admin");
    if (error) throw error;
    return { granted: data === true };
  });

/* ---------------- admin data load ---------------- */

export const adminLoadAll = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [cats, services, pros, links, blocks, settings] = await Promise.all([
      sb.from("categories").select("*").order("sort_order"),
      sb.from("services").select("*").order("name"),
      sb.from("professionals").select("*").order("name"),
      sb.from("professional_services").select("*"),
      sb.from("schedule_blocks").select("*").order("block_date", { ascending: false }),
      sb.from("salon_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    for (const r of [cats, services, pros, links, blocks]) if (r.error) throw r.error;
    return {
      categories: cats.data ?? [],
      services: services.data ?? [],
      professionals: pros.data ?? [],
      links: links.data ?? [],
      blocks: blocks.data ?? [],
      settings: settings.data ?? null,
    };
  });

const bookingStatusEnum = z.enum([
  "pending_payment",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);
type BookingStatus = z.infer<typeof bookingStatusEnum>;

export const adminListBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
        professionalId: z.string().uuid().optional(),
        status: bookingStatusEnum.optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("bookings")
      .select(
        "*, professional:professionals(id,name), service:services(id,name,price,duration_min), client:clients(id,name,whatsapp,email)",
      )
      .order("scheduled_date", { ascending: false })
      .order("start_time", { ascending: true })
      .limit(500);
    if (data.from) q = q.gte("scheduled_date", data.from);
    if (data.to) q = q.lte("scheduled_date", data.to);
    if (data.professionalId) q = q.eq("professional_id", data.professionalId);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const adminUpdateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: bookingStatusEnum }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("bookings")
      .update({ status: data.status satisfies BookingStatus })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ---------------- categories ---------------- */

const catSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80),
  icon: z.string().trim().max(80).optional().or(z.literal("")),
  sort_order: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => catSchema.parse(d))
  .handler(async ({ context, data }) => {
    const payload = {
      name: data.name,
      slug: data.slug,
      icon: data.icon || null,
      sort_order: data.sort_order ?? 0,
      active: data.active ?? true,
    };
    const sb = context.supabase;
    if (data.id) {
      const { error } = await sb.from("categories").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("categories").insert(payload).select("id").single();
    if (error) throw error;
    return { id: row.id };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ---------------- services ---------------- */

const svcSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  duration_min: z.number().int().min(5).max(600),
  price: z.number().min(0).max(99999),
  active: z.boolean().optional(),
});

export const adminSaveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => svcSchema.parse(d))
  .handler(async ({ context, data }) => {
    const payload = {
      category_id: data.category_id,
      name: data.name,
      description: data.description || null,
      duration_min: data.duration_min,
      price: data.price,
      active: data.active ?? true,
    };
    const sb = context.supabase;
    if (data.id) {
      const { error } = await sb.from("services").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("services").insert(payload).select("id").single();
    if (error) throw error;
    return { id: row.id };
  });

export const adminDeleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("services").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ---------------- professionals ---------------- */

const proSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  specialty: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(800).optional().or(z.literal("")),
  whatsapp: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  photo_url: z.string().trim().max(500).optional().or(z.literal("")),
  active: z.boolean().optional(),
  working_days: z.array(z.number().int().min(0).max(6)).optional(),
  work_start: z.string().regex(/^\d{2}:\d{2}/).optional(),
  work_end: z.string().regex(/^\d{2}:\d{2}/).optional(),
  slot_minutes: z.number().int().min(10).max(120).optional(),
  serviceIds: z.array(z.string().uuid()).optional(),
});

export const adminSaveProfessional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => proSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const payload = {
      name: data.name,
      specialty: data.specialty || null,
      bio: data.bio || null,
      whatsapp: data.whatsapp,
      email: data.email || null,
      photo_url: data.photo_url || null,
      active: data.active ?? true,
      working_days: data.working_days ?? [1, 2, 3, 4, 5, 6],
      work_start: data.work_start ?? "09:00",
      work_end: data.work_end ?? "19:00",
      slot_minutes: data.slot_minutes ?? 30,
    };
    let proId = data.id;
    if (proId) {
      const { error } = await sb.from("professionals").update(payload).eq("id", proId);
      if (error) throw error;
    } else {
      const { data: row, error } = await sb
        .from("professionals")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      proId = row.id;
    }
    if (data.serviceIds) {
      await sb.from("professional_services").delete().eq("professional_id", proId);
      if (data.serviceIds.length) {
        const rows = data.serviceIds.map((sid) => ({
          professional_id: proId!,
          service_id: sid,
        }));
        const { error } = await sb.from("professional_services").insert(rows);
        if (error) throw error;
      }
    }
    return { id: proId };
  });

export const adminDeleteProfessional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("professionals").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ---------------- schedule blocks ---------------- */

const blockSchema = z.object({
  id: z.string().uuid().optional(),
  professional_id: z.string().uuid(),
  block_date: z.string(),
  start_time: z.string().regex(/^\d{2}:\d{2}/),
  end_time: z.string().regex(/^\d{2}:\d{2}/),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export const adminSaveBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => blockSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const payload = {
      professional_id: data.professional_id,
      block_date: data.block_date,
      start_time: data.start_time,
      end_time: data.end_time,
      reason: data.reason || null,
    };
    if (data.id) {
      const { error } = await sb.from("schedule_blocks").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await sb
      .from("schedule_blocks")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const adminDeleteBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("schedule_blocks").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ---------------- client maintenances ---------------- */

export const adminListClientMaintenances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ clientId: z.string().uuid() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("client_maintenances")
      .select("*, booking:bookings(id,scheduled_date,start_time,status)")
      .eq("client_id", data.clientId)
      .order("scheduled_date", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

const maintenanceSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  type: z.enum(["hair", "nails", "other"]),
  procedure_name: z.string().min(2).max(100),
  scheduled_date: z.string(),
  suggested_time: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["pending", "confirmed", "refused", "done"]).optional(),
});

export const adminSaveClientMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => maintenanceSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const payload = {
      client_id: data.client_id,
      type: data.type,
      procedure_name: data.procedure_name,
      scheduled_date: data.scheduled_date,
      suggested_time: data.suggested_time || null,
      notes: data.notes || null,
      status: data.status || "pending",
    };
    if (data.id) {
      const { error } = await sb
        .from("client_maintenances")
        .update(payload)
        .eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await sb
      .from("client_maintenances")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const adminDeleteClientMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("client_maintenances")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
