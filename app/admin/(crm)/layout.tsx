import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const who = await requireAdmin();
  return (
    <div className="crm">
      <aside>
        <Link href="/admin" className="logo">TRIVENETO<span style={{ color: "#9db7e0" }}>.NEWS</span></Link>
        <nav>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/raccolta">① Raccolta</Link>
          <Link href="/admin/notizie">② Comparazione</Link>
          <Link href="/admin/elaborazione">③ Elaborazione AI</Link>
          <Link href="/admin/articoli">Articoli</Link>
          <Link href="/admin/pubblicita">Pubblicità</Link>
          <Link href="/admin/fonti">Fonti</Link>
          <Link href="/admin/statistiche">Statistiche</Link>
          <Link href="/admin/messaggi">Messaggi</Link>
          <Link href="/admin/impostazioni">Impostazioni</Link>
          <Link href="/" target="_blank">Vedi il sito ↗</Link>
        </nav>
        <form action={logout} style={{ marginTop: 24 }}>
          <div className="small" style={{ color: "#9db7e0", marginBottom: 6, wordBreak: "break-all" }}>{who}</div>
          <button className="secondary" type="submit">Esci</button>
        </form>
      </aside>
      <main>{children}</main>
    </div>
  );
}
