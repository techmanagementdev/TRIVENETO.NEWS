import dns from "node:dns/promises";
import net from "node:net";
import robotsParser from "robots-parser";

export const USER_AGENT = "TrivenetoNewsBot/1.0 (+https://triveneto.news/metodologia)";
const BOT_TOKEN = "TrivenetoNewsBot";

// ---------- Protezione SSRF ----------

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}
const PRIVATE_V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const n = ipv4ToInt(ip);
    return PRIVATE_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    if (x === "::1" || x === "::") return true;
    if (x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80")) return true;
    const mapped = x.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  return true;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("URL non valido");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Protocollo non consentito");
  if (u.username || u.password) throw new Error("Credenziali nell'URL non consentite");
  if (u.port && !["80", "443", ""].includes(u.port)) throw new Error("Porta non consentita");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|.*\.railway\.internal)$/i.test(host)) throw new Error("Host non consentito");
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("Indirizzo di rete non consentito");
  return u;
}

// ---------- Limite di frequenza per dominio ----------

const lastHit = new Map<string, number>();
async function politeWait(host: string, minGapMs: number) {
  const now = Date.now();
  const prev = lastHit.get(host) ?? 0;
  const wait = prev + minGapMs - now;
  lastHit.set(host, Math.max(now, prev + minGapMs));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

// ---------- Fetch sicuro ----------

export interface SafeFetchOpts {
  timeoutMs?: number;
  maxBytes?: number;
  accept?: string;
  minGapMs?: number;
}

export async function safeFetchText(raw: string, opts: SafeFetchOpts = {}): Promise<{ url: string; status: number; text: string; contentType: string }> {
  const { timeoutMs = 15000, maxBytes = 3_000_000, accept = "*/*", minGapMs = 1500 } = opts;
  let current = raw;
  for (let hop = 0; hop < 4; hop++) {
    const u = await assertPublicUrl(current);
    await politeWait(u.hostname, minGapMs);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(u, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "User-Agent": USER_AGENT, Accept: accept, "Accept-Language": "it-IT,it;q=0.9,en;q=0.6" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        current = new URL(res.headers.get("location")!, u).toString();
        continue;
      }
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) {
            ctrl.abort();
            throw new Error("Risposta troppo grande");
          }
          chunks.push(value);
        }
      }
      const text = Buffer.concat(chunks).toString("utf8");
      return { url: u.toString(), status: res.status, text, contentType: res.headers.get("content-type") ?? "" };
    } finally {
      clearTimeout(t);
    }
  }
  throw new Error("Troppi reindirizzamenti");
}

// ---------- robots.txt ----------

const robotsCache = new Map<string, { at: number; robots: ReturnType<typeof robotsParser> | null }>();

export async function robotsAllowed(raw: string): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  const key = u.origin;
  const cached = robotsCache.get(key);
  let robots = cached && Date.now() - cached.at < 6 * 3600_000 ? cached.robots : undefined;
  if (robots === undefined) {
    const robotsUrl = `${u.origin}/robots.txt`;
    try {
      const r = await safeFetchText(robotsUrl, { timeoutMs: 8000, maxBytes: 500_000, minGapMs: 500 });
      robots = r.status >= 200 && r.status < 300 ? robotsParser(robotsUrl, r.text) : r.status >= 500 ? null : robotsParser(robotsUrl, "");
    } catch {
      robots = null; // robots irraggiungibile: per prudenza non scarichiamo
    }
    robotsCache.set(key, { at: Date.now(), robots });
  }
  if (robots === null) return false;
  return robots.isAllowed(raw, BOT_TOKEN) !== false;
}
