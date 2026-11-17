"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveAd, type AdFormState } from "@/app/admin/actions";
import { PLACEMENTS } from "@/lib/ad-placements";

export interface AdInitial {
  id?: number; title?: string; advertiser?: string | null; placement?: string; link_url?: string | null; alt?: string | null;
  weight?: number; starts_at?: string | null; ends_at?: string | null; active?: boolean;
}

export default function AdForm({ initial, onDone }: { initial?: AdInitial; onDone?: () => void }) {
  const [state, action, pending] = useActionState<AdFormState, FormData>(saveAd, {});
  const [placement, setPlacement] = useState(initial?.placement ?? "header");
  const [preview, setPreview] = useState<{ url: string; video: boolean } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      if (!initial?.id) { formRef.current?.reset(); setPreview(null); }
      onDone?.();
    }
  }, [state, initial?.id, onDone]);
  const p = PLACEMENTS.find((x) => x.slug === placement);
  return (
    <form ref={formRef} action={action} className="stack">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid2">
        <label>Nome annuncio *<input name="title" required defaultValue={initial?.title} placeholder="Es. Campagna inverno Rossi Srl" /></label>
        <label>Inserzionista<input name="advertiser" defaultValue={initial?.advertiser ?? ""} placeholder="Mostrato accanto a «Pubblicità»" /></label>
      </div>
      <label>Posizione nel sito *
        <select name="placement" value={placement} onChange={(e) => setPlacement(e.target.value)}>
          {PLACEMENTS.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
        </select>
        <span className="small" style={{ fontWeight: 400 }}>{p?.where} · formato consigliato {p?.size}</span>
      </label>
      <div className="grid2">
        <label>{initial?.id ? "Sostituisci file (facoltativo)" : "Logo, immagine, GIF o video"}
          <input name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? { url: URL.createObjectURL(f), video: f.type.startsWith("video/") } : null);
            }} />
          <span className="small" style={{ fontWeight: 400 }}>PNG/JPG/WEBP fino a 5 MB · GIF fino a 8 MB · MP4/WEBM fino a 20 MB</span>
        </label>
        <label>…oppure link video
          <input name="video_url" placeholder="https://www.youtube.com/watch?v=… o https://…/spot.mp4" />
          <span className="small" style={{ fontWeight: 400 }}>I video partono senza audio e in loop</span>
        </label>
      </div>
      {preview && (
        <div className="ad-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview.video ? <video src={preview.url} autoPlay muted loop playsInline /> : <img src={preview.url} alt="Anteprima" />}
        </div>
      )}
      <div className="grid2">
        <label>Link al clic<input name="link_url" type="url" defaultValue={initial?.link_url ?? ""} placeholder="https://www.sito-inserzionista.it" /></label>
        <label>Testo alternativo<input name="alt" defaultValue={initial?.alt ?? ""} placeholder="Descrizione per accessibilità" /></label>
      </div>
      <div className="filters">
        <label>Dal<input name="starts_at" type="date" defaultValue={initial?.starts_at ?? ""} /></label>
        <label>Al<input name="ends_at" type="date" defaultValue={initial?.ends_at ?? ""} /></label>
        <label>Peso nella rotazione
          <select name="weight" defaultValue={initial?.weight ?? 1}>{[1, 2, 3, 4, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600, alignSelf: "end" }}>
          <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} style={{ width: "auto" }} /> Attivo
        </label>
      </div>
      {state.error && <div className="err-text">{state.error}</div>}
      {state.ok && <div className="ok-text">Salvato: l'annuncio è già visibile sul sito{initial?.id ? "" : " (se attivo)"}.</div>}
      <div><button type="submit" disabled={pending}>{pending ? "Caricamento…" : initial?.id ? "Salva modifiche" : "Aggiungi annuncio"}</button></div>
    </form>
  );
}
