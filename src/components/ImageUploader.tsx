import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  aspect?: "square" | "wide";
};

export function ImageUploader({ value, onChange, folder = "misc", label = "Imagem", aspect = "wide" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter até 5MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagem enviada.");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`relative flex ${aspect === "square" ? "h-32 w-32" : "h-32 w-full"} items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-secondary/40`}
      >
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black"
              aria-label="Remover"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <div className="text-center text-xs text-muted-foreground">
            <Upload className="mx-auto mb-1 h-5 w-5" />
            Arraste ou clique abaixo
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-50"
        >
          {value ? "Trocar imagem" : "Enviar imagem"}
        </button>
        {value && (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            placeholder="ou cole uma URL"
          />
        )}
      </div>
    </div>
  );
}
