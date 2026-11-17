// Sessione firmata (compatibile con middleware Edge): nessuna dipendenza Node.
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "tn_session";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET mancante o troppo corta");
  return new TextEncoder().encode(s);
}

export async function createSessionToken(email: string) {
  return new SignJWT({ sub: email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.role === "admin" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
