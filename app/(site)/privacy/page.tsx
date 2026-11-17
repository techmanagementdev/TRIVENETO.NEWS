import type { Metadata } from "next";
import PublisherInfo from "@/components/PublisherInfo";
export const metadata: Metadata = { title: "Privacy e cookie" };
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <div className="page">
      <h1>Privacy e cookie</h1>
      <p className="notice">Testo informativo di base: va verificato e completato da un consulente privacy prima della pubblicazione definitiva.</p>
      <h2>Titolare del trattamento</h2>
      <PublisherInfo />
      <h2>Dati raccolti</h2>
      <p>Navigando il sito registriamo in forma anonima e aggregata il numero di letture di ogni articolo, senza cookie e senza identificare i lettori. Se scrivi alla redazione tramite i moduli, trattiamo nome, email e messaggio solo per rispondere alla richiesta.</p>
      <h2>Cookie</h2>
      <p>Il sito usa solo cookie tecnici necessari al funzionamento. Se è attivo Google Analytics 4, i relativi cookie statistici vengono installati solo dopo il tuo consenso, che puoi revocare cancellando i dati del sito dal browser.</p>
      <h2>Diritti</h2>
      <p>Puoi chiedere accesso, rettifica o cancellazione dei tuoi dati scrivendo dalla pagina contatti.</p>
    </div>
  );
}
