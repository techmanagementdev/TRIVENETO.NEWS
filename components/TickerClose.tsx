"use client";
import { useEffect } from "react";

// Pulsante per chiudere la banda in fondo (ricordato per la sessione di navigazione)
export default function TickerClose() {
  useEffect(() => {
    try { if (sessionStorage.getItem("tn_tk_closed")) document.documentElement.classList.add("tk-closed"); } catch {}
  }, []);
  return (
    <button
      type="button"
      className="tk-close"
      aria-label="Chiudi la banda Ultim'ora"
      onClick={() => {
        document.documentElement.classList.add("tk-closed");
        try { sessionStorage.setItem("tn_tk_closed", "1"); } catch {}
      }}
    >×</button>
  );
}
