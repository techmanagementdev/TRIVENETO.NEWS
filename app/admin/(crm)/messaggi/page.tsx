import { ago } from "@/components/Crm";
import { q } from "@/lib/db";
import { markMessage } from "../../actions";

export default async function MessagesPage() {
  const rows = await q<any>(`SELECT * FROM messages ORDER BY status='nuovo' DESC, created_at DESC LIMIT 200`);
  return (
    <>
      <h1>Messaggi e rettifiche</h1>
      <div className="panel">
        <table className="t">
          <thead><tr><th>Tipo</th><th>Da</th><th>Messaggio</th><th>Ricevuto</th><th></th></tr></thead>
          <tbody>
            {rows.map((m: any) => (
              <tr key={m.id} style={{ opacity: m.status === "nuovo" ? 1 : 0.6 }}>
                <td><span className={`badge ${m.kind === "rettifica" ? "sens" : ""}`}>{m.kind}</span></td>
                <td>{m.name}<div className="small">{m.email}</div></td>
                <td style={{ whiteSpace: "pre-wrap" }}>{m.article_url && <div className="small"><a href={m.article_url} target="_blank" rel="noopener">{m.article_url}</a></div>}{m.body}</td>
                <td className="small">{ago(m.created_at)}</td>
                <td>
                  <form action={markMessage}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value={m.status === "nuovo" ? "gestito" : "nuovo"} />
                    <button className="secondary" type="submit">{m.status === "nuovo" ? "Segna gestito" : "Riapri"}</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="small">Nessun messaggio.</p>}
      </div>
    </>
  );
}
