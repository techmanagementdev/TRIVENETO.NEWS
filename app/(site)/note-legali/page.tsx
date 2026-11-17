import type { Metadata } from "next";
import PublisherInfo from "@/components/PublisherInfo";
export const metadata: Metadata = { title: "Informazioni legali" };
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <div className="page">
      <h1>Informazioni legali</h1>
      <PublisherInfo />
      <h2>Diritti sui contenuti</h2>
      <p>I testi di TRIVENETO.NEWS sono originali. I fatti riportati provengono dalle fonti citate in ciascun articolo, a cui appartengono i rispettivi diritti. Le immagini sono pubblicate secondo le licenze indicate nelle didascalie.</p>
      <h2>Uso dell'intelligenza artificiale</h2>
      <p>Gli articoli sono elaborati con il supporto dell'intelligenza artificiale secondo la nostra metodologia editoriale; i contenuti sensibili sono sempre sottoposti a revisione umana.</p>
    </div>
  );
}
