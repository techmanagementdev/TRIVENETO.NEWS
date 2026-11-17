"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import AdForm, { type AdInitial } from "./AdForm";

export default function AdEdit({ initial }: { initial: AdInitial }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="secondary" onClick={() => setOpen(!open)}>{open ? "Chiudi" : "Modifica"}</button>
      {open && createPortal(
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-box">
            <h2 style={{ marginTop: 0 }}>Modifica annuncio</h2>
            <AdForm initial={initial} onDone={() => setTimeout(() => setOpen(false), 900)} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
