import type { Metadata } from "next";
export const metadata: Metadata = { title: "Metodologia editoriale" };
export default function Page() {
  return (
    <div className="page">
      <h1>Metodologia editoriale</h1>
      <h2>1. Monitoraggio delle fonti</h2>
      <p>Ogni 15 minuti un sistema automatico consulta feed RSS pubblici, fonti istituzionali e servizi di indicizzazione aperti (come GDELT). Rispettiamo i file robots.txt, i limiti di accesso e le condizioni d'uso dei siti; non aggiriamo paywall né sistemi di protezione. Il nostro programma si identifica come <code>TrivenetoNewsBot</code>.</p>
      <h2>2. Più fonti per ogni notizia</h2>
      <p>Le notizie che parlano dello stesso fatto vengono raggruppate in un unico evento. Le testate che riprendono lo stesso comunicato o lo stesso lancio d'agenzia non vengono considerate fonti indipendenti. Di norma pubblichiamo solo eventi confermati da almeno due fonti indipendenti o da una fonte istituzionale primaria.</p>
      <h2>3. Sintesi con intelligenza artificiale</h2>
      <p>Gli articoli sono scritti con il supporto dell'intelligenza artificiale (Claude, di Anthropic) partendo dai fatti confermati. Il sistema separa i fatti dalle ipotesi, segnala le discrepanze tra fonti e non può aggiungere dati, dichiarazioni o interpretazioni assenti nelle fonti. Un controllo automatico verifica che il testo non riprenda le formulazioni degli articoli di origine. Ogni articolo elenca le fonti utilizzate con il collegamento agli originali.</p>
      <h2>4. Revisione umana</h2>
      <p>Indagini, vicende giudiziarie, accuse, cronaca nera e ogni contenuto sensibile non vengono mai pubblicati automaticamente: richiedono la revisione di una persona della redazione. Lo stesso vale per gli articoli con discrepanze tra fonti.</p>
      <h2>5. Immagini</h2>
      <p>Usiamo solo immagini con licenza che ne consente il riuso (ad esempio da Wikimedia Commons, con autore e licenza indicati) oppure grafiche neutre realizzate da noi. Le foto di repertorio sono indicate come tali. Non usiamo immagini generate artificialmente che simulino fotografie di eventi reali.</p>
      <h2>6. Aggiornamenti e rettifiche</h2>
      <p>Quando emergono nuovi elementi aggiorniamo l'articolo esistente e lo segnaliamo. Chiunque può chiedere una rettifica dalla pagina dedicata: le richieste vengono esaminate dalla redazione.</p>
    </div>
  );
}
