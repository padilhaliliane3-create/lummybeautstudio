import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const settingsSchema = z.object({
  company_name: z.string().trim().max(120).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
  instagram: z.string().trim().max(80).optional().or(z.literal("")),
  facebook: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().max(160).optional().or(z.literal("")),
  hours_json: z.any().optional(),
  hero_title: z.string().trim().max(200).optional().or(z.literal("")),
  hero_subtitle: z.string().trim().max(400).optional().or(z.literal("")),
  about_text: z.string().trim().max(2000).optional().or(z.literal("")),
  logo_url: z.string().trim().max(500).optional().or(z.literal("")),
  banner_url: z.string().trim().max(500).optional().or(z.literal("")),
});

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("salon_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ context, data }) => {
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      payload[k] = v === "" ? null : v;
    }
    const { error } = await context.supabase
      .from("salon_settings")
      .update(payload)
      .eq("id", 1);
    if (error) throw error;
    return { ok: true };
  });
