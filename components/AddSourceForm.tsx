"use client";
import { useActionState } from "react";
import { addSource } from "@/app/admin/actions";
import { CATEGORIES, TERRITORIES } from "@/lib/taxonomy";

export default function AddSourceForm() {
  const [state, action, pending] = useActionState(addSource, {});
  return (
    <form action={action} className="stack">
      <div className="grid2">
        <label>Nome<input name="name" placeholder="Es. Corriere del Veneto" /></label>
        <label>URL del feed RSS o della query GDELT *<input name="url" type="url" required /></label>
      </div>
      <div className="filters">
        <select name="kind" defaultValue="rss"><option value="rss">RSS / Atom</option><option value="gdelt">GDELT</option></select>
        <select name="territory" defaultValue="italia">{TERRITORIES.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select>
        <select name="category" defaultValue=""><option value="">Categoria: automatica</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
        <select name="reliability" defaultValue="3">{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Affidabilità {n}</option>)}</select>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 400 }}><input type="checkbox" name="is_primary" style={{ width: "auto" }} /> Fonte istituzionale primaria</label>
      </div>
      {state.error && <div className="err-text">{state.error}</div>}
      {state.ok && <div className="ok-text">Fonte aggiunta: sarà consultata al prossimo controllo.</div>}
      <div><button type="submit" disabled={pending}>Aggiungi fonte</button></div>
    </form>
  );
}
