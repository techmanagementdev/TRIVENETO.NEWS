import AddSourceForm from "@/components/AddSourceForm";
import { ago } from "@/components/Crm";
import { q } from "@/lib/db";
import { CATEGORIES, TERRITORIES } from "@/lib/taxonomy";
import { updateSource } from "../../actions";

export default async function SourcesPage() {
  const rows = await q<any>(`SELECT * FROM sources ORDER BY active DESC, territory, name`);
  return (
    <>
      <h1>Fonti</h1>
      <div className="panel"><h2>Aggiungi una fonte</h2><AddSourceForm /></div>
      <div className="panel">
        <h2>Fonti configurate ({rows.length})</h2>
        <table className="t">
          <thead><tr><th>Fonte</th><th>Impostazioni</th><th>Ultima scansione</th><th>Notizie</th><th>Errori</th><th></th></tr></thead>
          <tbody>
            {rows.map((s: any) => (
              <tr key={s.id} style={{ opacity: s.active ? 1 : 0.55 }}>
                <td style={{ maxWidth: 280 }}>
                  <b>{s.name}</b> <span className="badge">{s.kind}</span>
                  <div className="small" style={{ wordBreak: "break-all" }}>{s.url.slice(0, 110)}</div>
                </td>
                <td>
                  <form action={updateSource} className="filters" style={{ margin: 0 }}>
                    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="action" value="save" />
                    <input name="name" defaultValue={s.name} style={{ width: 150 }} />
                    <select name="territory" defaultValue={s.territory}>{TERRITORIES.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select>
                    <select name="category" defaultValue={s.category ?? ""}><option value="">auto</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
                    <select name="reliability" defaultValue={s.reliability}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}★</option>)}</select>
                    <label style={{ display: "flex", gap: 4, alignItems: "center", fontWeight: 400 }}><input type="checkbox" name="is_primary" defaultChecked={s.is_primary} style={{ width: "auto" }} />primaria</label>
                    <button className="secondary" type="submit">Salva</button>
                  </form>
                </td>
                <td className="small">{ago(s.last_fetched_at)}{s.last_ok_at && <div>ok {ago(s.last_ok_at)}</div>}</td>
                <td>{s.items_found}</td>
                <td className="small">{s.last_error ? <span className="err-text">{s.error_count}× {s.last_error}</span> : <span className="ok-text">nessuno</span>}</td>
                <td>
                  <div className="actions">
                    <form action={updateSource}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="action" value="toggle" /><button className="secondary" type="submit">{s.active ? "Disattiva" : "Attiva"}</button></form>
                    <form action={updateSource}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="action" value="delete" /><button className="danger" type="submit">Elimina</button></form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
