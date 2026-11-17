import Link from "next/link";
export default function NotFound() {
  return (
    <div style={{ maxWidth: 600, margin: "15vh auto", textAlign: "center", padding: 20 }}>
      <div className="logo" style={{ fontSize: 34 }}>TRIVENETO<span>.NEWS</span></div>
      <h1 style={{ fontFamily: "Georgia, serif" }}>Pagina non trovata</h1>
      <p>Il contenuto potrebbe essere stato spostato o rimosso.</p>
      <Link className="btn" href="/">Torna alla home</Link>
    </div>
  );
}
