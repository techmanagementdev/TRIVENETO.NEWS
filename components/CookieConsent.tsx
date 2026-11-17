"use client";
import { useEffect, useState } from "react";

const KEY = "tn_consent";

function loadGa(id: string) {
  if (document.getElementById("ga4")) return;
  const s = document.createElement("script");
  s.id = "ga4";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () { w.dataLayer.push(arguments); };
  w.gtag("js", new Date());
  w.gtag("config", id, { anonymize_ip: true });
}

export default function CookieConsent({ gaId }: { gaId?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!gaId) return;
    let v: string | null = null;
    try { v = localStorage.getItem(KEY); } catch {}
    if (v === "si") loadGa(gaId);
    else if (v !== "no") setShow(true);
  }, [gaId]);
  if (!show || !gaId) return null;
  const choose = (v: "si" | "no") => {
    try { localStorage.setItem(KEY, v); } catch {}
    if (v === "si") loadGa(gaId);
    setShow(false);
  };
  return (
    <div className="cookie" role="dialog" aria-label="Consenso cookie">
      Usiamo cookie tecnici e, solo con il tuo consenso, cookie statistici di Google Analytics per capire quali articoli vengono letti.{" "}
      <a href="/privacy" style={{ textDecoration: "underline" }}>Informativa</a>
      <div className="row">
        <button onClick={() => choose("si")}>Accetta</button>
        <button className="secondary" onClick={() => choose("no")}>Solo necessari</button>
      </div>
    </div>
  );
}
