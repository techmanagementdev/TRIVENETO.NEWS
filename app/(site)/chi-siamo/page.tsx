import type { Metadata } from "next";
import Link from "next/link";
import PublisherInfo from "@/components/PublisherInfo";
export const metadata: Metadata = { title: "Chi siamo" };
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <div className="page">
      <h1>Chi siamo</h1>
      <p>TRIVENETO.NEWS è un quotidiano digitale dedicato al Nord-Est italiano: Trentino-Alto Adige, Veneto, Friuli-Venezia Giulia ed Emilia-Romagna. Seguiamo politica, economia, attualità, sostenibilità, tecnologia e innovazione, insieme alle notizie europee e internazionali che hanno conseguenze concrete sul territorio.</p>
      <p>Il nostro metodo unisce un sistema di monitoraggio continuo delle fonti, l'intelligenza artificiale per la sintesi e il controllo umano sui temi delicati. Ogni articolo indica le fonti da cui nasce. <Link href="/metodologia" style={{ textDecoration: "underline" }}>Leggi la metodologia</Link>.</p>
      <h2>Editore e responsabilità</h2>
      <PublisherInfo />
      <h2>Contatti</h2>
      <p>Per segnalazioni e richieste: <Link href="/contatti" style={{ textDecoration: "underline" }}>pagina contatti</Link>. Per correggere un articolo: <Link href="/rettifiche" style={{ textDecoration: "underline" }}>rettifiche</Link>.</p>
    </div>
  );
}
