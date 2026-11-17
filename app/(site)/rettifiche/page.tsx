import type { Metadata } from "next";
import MessageForm from "@/components/MessageForm";
export const metadata: Metadata = { title: "Rettifiche" };
export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const url = (await searchParams).url;
  return (
    <div className="page">
      <h1>Rettifiche</h1>
      <p>Se ritieni che un nostro articolo contenga un errore o un'informazione non corretta, segnalalo qui. La redazione verifica ogni richiesta e, se fondata, corregge l'articolo indicando la modifica.</p>
      <MessageForm kind="rettifica" defaultUrl={url && /^https?:\/\//.test(url) ? url : undefined} />
    </div>
  );
}
