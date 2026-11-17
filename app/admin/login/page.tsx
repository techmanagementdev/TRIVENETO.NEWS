"use client";
import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <div style={{ background: "var(--bg-soft)", minHeight: "100vh", padding: 16 }}>
      <form action={action} className="login stack">
        <div className="logo" style={{ fontSize: 26, textAlign: "center" }}>TRIVENETO<span>.NEWS</span></div>
        <p className="small" style={{ textAlign: "center", margin: 0 }}>Area redazione</p>
        <label>Email<input name="email" type="email" autoComplete="username" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        {state?.error && <div className="err-text">{state.error}</div>}
        <button type="submit" disabled={pending}>{pending ? "Accesso…" : "Entra"}</button>
      </form>
    </div>
  );
}
