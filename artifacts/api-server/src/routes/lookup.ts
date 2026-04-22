import { Router, type IRouter } from "express";
import { promises as dns } from "node:dns";

const router: IRouter = Router();

type LookupKind =
  | "ip"
  | "coordinates"
  | "email"
  | "username"
  | "phone"
  | "domain"
  | "hash"
  | "unknown";

interface SourceResult {
  source: string;
  ok: boolean;
  status?: number;
  data?: unknown;
  error?: string;
  durationMs: number;
}

function detectKind(raw: string): LookupKind {
  const v = raw.trim();
  if (!v) return "unknown";

  const ipv4 =
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/;
  if (ipv4.test(v)) return "ip";
  if (v.includes(":") && /^[\da-fA-F:]+$/.test(v) && v.length >= 3) return "ip";

  const coord = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;
  if (coord.test(v)) return "coordinates";

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "email";

  if (/^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/.test(v))
    return "hash";

  if (/^\+?[\d][\d\s\-().]{6,18}$/.test(v) && /\d{7,}/.test(v.replace(/\D/g, "")))
    return "phone";

  if (/^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(v) && v.includes("."))
    return "domain";

  if (/^[a-zA-Z0-9_.-]{2,64}$/.test(v)) return "username";

  return "unknown";
}

async function fetchJson(
  url: string,
  init: (RequestInit & { timeoutMs?: number }) = {},
): Promise<{ status: number; data: unknown }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), init.timeoutMs ?? 12000);
  try {
    const res = await fetch(url, { ...init, signal: ac.signal });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // keep as text
    }
    if (!res.ok) {
      const msg =
        typeof data === "object" && data !== null && "message" in data
          ? String((data as Record<string, unknown>)["message"])
          : typeof data === "string" && data.length < 300
            ? data
            : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

async function callSource(
  source: string,
  fn: () => Promise<{ status?: number; data: unknown }>,
): Promise<SourceResult> {
  const start = Date.now();
  try {
    const r = await fn();
    return {
      source,
      ok: true,
      status: r.status,
      data: r.data,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      source,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

// ---------- Source adapters ----------

async function snusbase(query: string, kind: LookupKind) {
  const key = process.env["SNUSBASE_API_KEY"];
  if (!key) throw new Error("SNUSBASE_API_KEY not configured");
  const types: string[] = [];
  if (kind === "email") types.push("email");
  else if (kind === "username") types.push("username");
  else if (kind === "ip") types.push("lastip");
  else if (kind === "hash") types.push("hash");
  else if (kind === "phone") types.push("phone");
  else if (kind === "domain") types.push("_domain");
  else types.push("email", "username");
  return fetchJson("https://api.snusbase.com/data/search", {
    method: "POST",
    headers: { Auth: key, "Content-Type": "application/json" },
    body: JSON.stringify({ terms: [query], types, wildcard: false }),
    timeoutMs: 18000,
  });
}

async function leakcheck(query: string, kind: LookupKind) {
  const key = process.env["LEAKCHECK_API_KEY"];
  if (!key) throw new Error("LEAKCHECK_API_KEY not configured");
  // 40-char hex keys are LeakCheck v1 (public). Other formats use v2.
  const isV1 = /^[a-f0-9]{40}$/i.test(key);
  let typeParam = "auto";
  if (kind === "email") typeParam = "email";
  else if (kind === "username") typeParam = "login";
  else if (kind === "phone") typeParam = "phone";
  else if (kind === "hash") typeParam = "hash";
  else if (kind === "ip") typeParam = "ip";
  else if (kind === "domain") typeParam = "domain";

  if (isV1) {
    return fetchJson(
      `https://leakcheck.io/api/?key=${encodeURIComponent(key)}&check=${encodeURIComponent(query)}&type=${typeParam}`,
    );
  }
  return fetchJson(
    `https://leakcheck.io/api/v2/query/${encodeURIComponent(query)}?type=${typeParam}`,
    {
      headers: { "X-API-Key": key, Accept: "application/json" },
    },
  );
}

async function seon(query: string, kind: LookupKind) {
  const key = process.env["SEON_API_KEY"];
  if (!key) throw new Error("SEON_API_KEY not configured");
  let url = "";
  if (kind === "email")
    url = `https://api.seon.io/SeonRestService/email-api/v3/${encodeURIComponent(query)}`;
  else if (kind === "ip")
    url = `https://api.seon.io/SeonRestService/ip-api/v1/${encodeURIComponent(query)}`;
  else if (kind === "phone")
    url = `https://api.seon.io/SeonRestService/phone-api/v2/${encodeURIComponent(query)}`;
  else throw new Error(`SEON does not support ${kind}`);
  return fetchJson(url, { headers: { "X-API-KEY": key } });
}

async function intelvault(query: string) {
  const key = process.env["INTELVAULT_API_KEY"];
  if (!key) throw new Error("INTELVAULT_API_KEY not configured");
  return fetchJson(
    `https://api.intelvault.io/v1/search?query=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${key}` } },
  );
}

async function osintcat(query: string) {
  const key = process.env["OSINTCAT_API_KEY"];
  if (!key) throw new Error("OSINTCAT_API_KEY not configured");
  return fetchJson(
    `https://api.osint.cat/v2/search?query=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${key}` } },
  );
}

async function swatted(query: string, kind: LookupKind) {
  const tiers = [
    ["heist", process.env["SWATTED_HEIST_KEY"]],
    ["ultimate", process.env["SWATTED_ULTIMATE_KEY"]],
    ["plus", process.env["SWATTED_PLUS_KEY"]],
    ["og", process.env["SWATTED_OG_KEY"]],
  ].filter(([, k]) => Boolean(k)) as Array<[string, string]>;
  if (tiers.length === 0) throw new Error("Swatted keys not configured");
  let lastErr: unknown;
  for (const [, key] of tiers) {
    try {
      return await fetchJson(
        `https://api.swatted.wtf/v1/search?q=${encodeURIComponent(query)}&type=${kind}`,
        { headers: { Authorization: `Bearer ${key}` } },
      );
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Swatted: all tiers failed");
}

async function breachhub(query: string) {
  const key = process.env["BREACHHUB_API_KEY"];
  if (!key) throw new Error("BREACHHUB_API_KEY not configured");
  return fetchJson(
    `https://api.breachhub.io/search?q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${key}` } },
  );
}

async function luperly(query: string) {
  const key = process.env["LUPERLY_API_KEY"];
  if (!key) throw new Error("LUPERLY_API_KEY not configured");
  return fetchJson(
    `https://luperly.vercel.app/api/search?q=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}`,
  );
}

// ---------- Free / built-in enrichment ----------

async function ipApi(ip: string) {
  const fields =
    "status,message,continent,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query";
  const r = await fetchJson(
    `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`,
  );
  if (
    typeof r.data === "object" &&
    r.data &&
    (r.data as Record<string, unknown>)["status"] !== "success"
  ) {
    throw new Error(
      String((r.data as Record<string, unknown>)["message"] ?? "ip-api error"),
    );
  }
  return r;
}

async function reverseGeocode(lat: number, lon: number) {
  return fetchJson(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
  );
}

async function emailDns(email: string) {
  const [, domain] = email.split("@");
  if (!domain) throw new Error("Invalid email");
  const result: Record<string, unknown> = {
    email,
    domain,
    formatValid: true,
  };
  try {
    const mx = await dns.resolveMx(domain);
    mx.sort((a, b) => a.priority - b.priority);
    result["mxRecords"] = mx;
    result["mailHandledBy"] = mx[0]?.exchange ?? null;
    result["deliverable"] = mx.length > 0;
  } catch {
    result["mxRecords"] = [];
    result["deliverable"] = false;
  }
  const disposable = [
    "mailinator.com",
    "guerrillamail.com",
    "tempmail.com",
    "10minutemail.com",
    "trashmail.com",
    "yopmail.com",
    "throwaway.email",
  ];
  result["likelyDisposable"] = disposable.some((d) =>
    domain.toLowerCase().endsWith(d),
  );
  const free = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
    "aol.com",
    "live.com",
    "msn.com",
  ];
  result["freeProvider"] = free.includes(domain.toLowerCase());
  return { status: 200, data: result };
}

async function domainDns(domain: string) {
  const result: Record<string, unknown> = { domain };
  await Promise.all([
    dns.resolve4(domain).then(
      (a) => (result["a"] = a),
      () => (result["a"] = []),
    ),
    dns.resolve6(domain).then(
      (a) => (result["aaaa"] = a),
      () => (result["aaaa"] = []),
    ),
    dns.resolveMx(domain).then(
      (m) => (result["mx"] = m.sort((a, b) => a.priority - b.priority)),
      () => (result["mx"] = []),
    ),
    dns.resolveNs(domain).then(
      (n) => (result["ns"] = n),
      () => (result["ns"] = []),
    ),
    dns.resolveTxt(domain).then(
      (t) => (result["txt"] = t.map((r) => r.join(""))),
      () => (result["txt"] = []),
    ),
  ]);
  return { status: 200, data: result };
}

// ---------- Normalisation: pull breach rows out of each provider ----------

interface NormalizedBreach {
  source: string;
  database?: string;
  email?: string;
  username?: string;
  password?: string;
  hash?: string;
  ip?: string;
  name?: string;
  phone?: string;
  date?: string;
  raw?: Record<string, unknown>;
}

function pickStr(o: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

function normalizeBreaches(results: SourceResult[]): NormalizedBreach[] {
  const out: NormalizedBreach[] = [];
  for (const r of results) {
    if (!r.ok || !r.data) continue;
    const d = r.data as Record<string, unknown>;

    if (r.source === "snusbase") {
      const groups = d["results"] as Record<string, Array<Record<string, unknown>>> | undefined;
      if (groups) {
        for (const [db, rows] of Object.entries(groups)) {
          for (const row of rows ?? []) {
            out.push({
              source: "snusbase",
              database: db,
              email: pickStr(row, "email"),
              username: pickStr(row, "username"),
              password: pickStr(row, "password"),
              hash: pickStr(row, "hash", "salt"),
              ip: pickStr(row, "lastip", "regip", "ip"),
              name: pickStr(row, "name", "fullname"),
              phone: pickStr(row, "phone"),
              raw: row,
            });
          }
        }
      }
    } else if (r.source === "leakcheck") {
      const rows = (d["result"] as Array<Record<string, unknown>>) ?? [];
      for (const row of rows) {
        out.push({
          source: "leakcheck",
          database: pickStr(row, "source", "name"),
          email: pickStr(row, "email"),
          username: pickStr(row, "username"),
          password: pickStr(row, "password", "line"),
          hash: pickStr(row, "hash"),
          ip: pickStr(row, "ip", "last_ip"),
          name: pickStr(row, "name"),
          phone: pickStr(row, "phone"),
          date: pickStr(row, "last_breach", "date"),
          raw: row,
        });
      }
    } else if (
      r.source === "intelvault" ||
      r.source === "osintcat" ||
      r.source === "swatted" ||
      r.source === "breachhub" ||
      r.source === "luperly"
    ) {
      // Best-effort: many of these return { results: [...] } or [...]
      const rows: Array<Record<string, unknown>> = Array.isArray(d)
        ? (d as Array<Record<string, unknown>>)
        : Array.isArray(d["results"])
          ? (d["results"] as Array<Record<string, unknown>>)
          : Array.isArray(d["data"])
            ? (d["data"] as Array<Record<string, unknown>>)
            : Array.isArray(d["breaches"])
              ? (d["breaches"] as Array<Record<string, unknown>>)
              : [];
      for (const row of rows) {
        out.push({
          source: r.source,
          database: pickStr(row, "database", "source", "breach", "name"),
          email: pickStr(row, "email"),
          username: pickStr(row, "username", "user"),
          password: pickStr(row, "password", "pass", "plaintext"),
          hash: pickStr(row, "hash", "sha1", "md5", "sha256"),
          ip: pickStr(row, "ip", "ip_address"),
          name: pickStr(row, "name", "fullname"),
          phone: pickStr(row, "phone", "phone_number"),
          date: pickStr(row, "date", "breach_date", "last_breach"),
          raw: row,
        });
      }
    }
  }
  return out;
}

router.post("/lookup", async (req, res) => {
  const raw = typeof req.body?.query === "string" ? req.body.query : "";
  const value = raw.trim();
  if (!value) {
    res.status(400).json({ error: "Query required." });
    return;
  }

  const kind = detectKind(value);
  const tasks: Array<[string, () => Promise<{ status?: number; data: unknown }>]> = [];

  if (kind === "ip") {
    tasks.push(["ip-geo", () => ipApi(value)]);
    tasks.push(["seon", () => seon(value, kind)]);
    tasks.push(["snusbase", () => snusbase(value, kind)]);
    tasks.push(["leakcheck", () => leakcheck(value, kind)]);
    tasks.push(["intelvault", () => intelvault(value)]);
    tasks.push(["osintcat", () => osintcat(value)]);
    tasks.push(["luperly", () => luperly(value)]);
  } else if (kind === "coordinates") {
    const [latStr, lonStr] = value.split(/[, ]+/);
    const lat = Number(latStr);
    const lon = Number(lonStr);
    if (
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    ) {
      res.status(400).json({ error: "Coordinates out of range." });
      return;
    }
    tasks.push(["reverse-geocode", () => reverseGeocode(lat, lon)]);
  } else if (kind === "email") {
    tasks.push(["email-dns", () => emailDns(value)]);
    tasks.push(["snusbase", () => snusbase(value, kind)]);
    tasks.push(["leakcheck", () => leakcheck(value, kind)]);
    tasks.push(["seon", () => seon(value, kind)]);
    tasks.push(["intelvault", () => intelvault(value)]);
    tasks.push(["osintcat", () => osintcat(value)]);
    tasks.push(["breachhub", () => breachhub(value)]);
    tasks.push(["luperly", () => luperly(value)]);
    tasks.push(["swatted", () => swatted(value, kind)]);
  } else if (kind === "domain") {
    tasks.push(["domain-dns", () => domainDns(value)]);
    tasks.push(["snusbase", () => snusbase(value, kind)]);
    tasks.push(["leakcheck", () => leakcheck(value, kind)]);
    tasks.push(["intelvault", () => intelvault(value)]);
    tasks.push(["osintcat", () => osintcat(value)]);
    tasks.push(["luperly", () => luperly(value)]);
  } else if (kind === "phone") {
    tasks.push(["seon", () => seon(value, kind)]);
    tasks.push(["snusbase", () => snusbase(value, kind)]);
    tasks.push(["leakcheck", () => leakcheck(value, kind)]);
    tasks.push(["intelvault", () => intelvault(value)]);
    tasks.push(["osintcat", () => osintcat(value)]);
    tasks.push(["breachhub", () => breachhub(value)]);
    tasks.push(["luperly", () => luperly(value)]);
    tasks.push(["swatted", () => swatted(value, kind)]);
  } else if (kind === "username" || kind === "hash") {
    tasks.push(["snusbase", () => snusbase(value, kind)]);
    tasks.push(["leakcheck", () => leakcheck(value, kind)]);
    tasks.push(["intelvault", () => intelvault(value)]);
    tasks.push(["osintcat", () => osintcat(value)]);
    tasks.push(["breachhub", () => breachhub(value)]);
    tasks.push(["luperly", () => luperly(value)]);
    tasks.push(["swatted", () => swatted(value, kind)]);
  } else {
    res.status(400).json({
      error:
        "Unrecognized input. Try an email, username, IP, phone number, hash, domain, or coordinates.",
    });
    return;
  }

  let results: SourceResult[];
  try {
    results = await Promise.all(
      tasks.map(([name, fn]) => callSource(name, fn)),
    );
  } catch (err) {
    req.log.error({ err }, "Lookup unexpectedly threw");
    res.status(500).json({ error: "Internal lookup error" });
    return;
  }

  const breaches = normalizeBreaches(results);
  const sourcesOk = results.filter((r) => r.ok).length;
  const sourcesErr = results.length - sourcesOk;

  // Convenience: pull common enrichment blocks out for the UI
  const ipGeo = results.find((r) => r.source === "ip-geo" && r.ok)?.data ?? null;
  const reverse =
    results.find((r) => r.source === "reverse-geocode" && r.ok)?.data ?? null;
  const emailMeta =
    results.find((r) => r.source === "email-dns" && r.ok)?.data ?? null;
  const domainMeta =
    results.find((r) => r.source === "domain-dns" && r.ok)?.data ?? null;

  res.json({
    kind,
    query: value,
    summary: {
      sourcesQueried: results.length,
      sourcesOk,
      sourcesErr,
      breachCount: breaches.length,
      uniqueDatabases: Array.from(
        new Set(breaches.map((b) => b.database).filter(Boolean) as string[]),
      ).length,
      generatedAt: new Date().toISOString(),
    },
    enrichment: {
      ipGeo,
      reverseGeocode: reverse,
      email: emailMeta,
      domain: domainMeta,
    },
    breaches,
    sources: results,
  });
});

export default router;
