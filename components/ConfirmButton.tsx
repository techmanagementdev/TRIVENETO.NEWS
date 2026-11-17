"use client";
// Pulsante che chiede conferma prima di inviare (azioni irreversibili).
export default function ConfirmButton({ message, className, name, value, children, formAction }: {
  message: string; className?: string; name?: string; value?: string; children: React.ReactNode; formAction?: (f: FormData) => void;
}) {
  return (
    <button type="submit" className={className} name={name} value={value} formAction={formAction as any}
      onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
