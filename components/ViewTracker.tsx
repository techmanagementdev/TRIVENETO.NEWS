"use client";
import { useEffect } from "react";

// Conteggio letture anonimo, senza cookie.
export default function ViewTracker({ id }: { id: number }) {
  useEffect(() => {
    const k = `tn_v_${id}`;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch {}
    const body = JSON.stringify({ id, ref: document.referrer || "" });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/v", new Blob([body], { type: "application/json" }));
    else fetch("/api/v", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }, [id]);
  return null;
}
