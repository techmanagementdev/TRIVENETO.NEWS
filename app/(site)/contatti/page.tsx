import type { Metadata } from "next";
import MessageForm from "@/components/MessageForm";
export const metadata: Metadata = { title: "Contatti" };
export default function Page() {
  return (
    <div className="page">
      <h1>Contatti</h1>
      <p>Segnalazioni, comunicati stampa e richieste alla redazione.</p>
      <MessageForm kind="contatto" />
    </div>
  );
}
