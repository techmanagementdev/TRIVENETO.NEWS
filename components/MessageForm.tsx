"use client";
import { useActionState } from "react";
import { submitMessage, type FormState } from "@/app/(site)/actions";

export default function MessageForm({ kind, defaultUrl }: { kind: "contatto" | "rettifica"; defaultUrl?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitMessage, {});
  if (state.ok) return <div className="flash">Grazie, il messaggio è stato ricevuto dalla redazione.</div>;
  return (
    <form action={action} className="stack">
      <input type="hidden" name="kind" value={kind} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ display: "none" }} aria-hidden="true" />
      <label>Nome<input name="name" autoComplete="name" /></label>
      <label>Email *<input name="email" type="email" required autoComplete="email" /></label>
      {kind === "rettifica" && <label>Link dell'articolo *<input name="article_url" type="url" required defaultValue={defaultUrl} /></label>}
      <label>{kind === "rettifica" ? "Cosa va corretto e perché *" : "Messaggio *"}<textarea name="body" required /></label>
      {state.error && <div className="err-text">{state.error}</div>}
      <div><button type="submit" disabled={pending}>{pending ? "Invio…" : "Invia"}</button></div>
      <p className="small">I dati sono usati solo per rispondere alla richiesta. Vedi l'<a href="/privacy">informativa privacy</a>.</p>
    </form>
  );
}
