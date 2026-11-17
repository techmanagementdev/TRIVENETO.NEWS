"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveAd, type AdFormState } from "@/app/admin/actions";
import { PLACEMENTS } from "@/lib/ad-placements";

// Caricamento pubblicità semplificato: file + posizione + link. Il resto è facoltativo.
export default function AdForm() {
  const [state, action, pending] = useActionState<AdFormState, FormData>(saveAd, {});
  const [placement, setPlacement] = useState("header");
  const [preview, setPreview] = useState<{ url: string; video: boolean; name: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) { formRef.current?.reset(); setPreview(null); }
  }, [state]);
  const p = PLACEMENTS.find((x) => x.slug === placement);
  return (
    <form ref={formRef} action={action} className="stack ad-simple">
      <input type="hidden" name="active" value="on" />
      <label className="dropzone">
        <input name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? { url: URL.createObjectURL(f), video: f.type.startsWith("video/"), name: f.name } : null);
          }} />
        {preview ? (
          <span className="dz-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview.video ? <video src={preview.url} autoPlay muted loop playsInline /> : <img src={preview.url} alt="" />}
            <span className="small">{preview.name} · clicca per cambiarlo</span>
          </span>
        ) : (
          <span className="dz-empty">
            <b>① Scegli il file</b>
            <span className="small">Logo, banner, GIF o video (MP4) · trascinalo qui o clicca</span>
          </span>
        )}
      </label>

      <label>② Dove mostrarlo
        <select name="placement" value={placement} onChange={(e) => setPlacement(e.target.value)}>
          {PLACEMENTS.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
        </select>
        <span className="small" style={{ fontWeight: 400 }}>Misura consigliata: {p?.size}</span>
      </label>

      <label>③ Link quando si clicca <span className="small" style={{ fontWeight: 400 }}>(facoltativo)</span>
        <input name="link_url" type="url" placeholder="https://www.sito-inserzionista.it" />
      </label>

      <details className="more">
        <summary>Altre opzioni (facoltative)</summary>
        <div className="stack" style={{ marginTop: 10 }}>
          <div className="grid2">
            <label>Nome inserzionista<input name="advertiser" placeholder="Compare accanto a «Pubblicità»" /></label>
            <label>Video YouTube al posto del file<input name="video_url" placeholder="https://www.youtube.com/watch?v=…" /></label>
          </div>
          <div className="grid2">
            <label>Mostra dal<input name="starts_at" type="date" /></label>
            <label>Mostra fino al<input name="ends_at" type="date" /></label>
          </div>
        </div>
      </details>

      {state.error && <div className="err-text">{state.error}</div>}
      {state.ok && <div className="flash">Fatto! L'annuncio è già online.</div>}
      <div><button type="submit" disabled={pending} className="big">{pending ? "Caricamento…" : "Pubblica annuncio"}</button></div>
    </form>
  );
}
