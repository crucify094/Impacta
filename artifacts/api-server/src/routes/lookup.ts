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
  | "crypto_eth"
  | "crypto_btc"
  | "crypto_sol"
  | "discord_id"
  | "discord_invite"
  | "url"
  | "image_url"
  | "headers"
  | "unknown";

interface SourceResult {
  source: string;
  ok: boolean;
  status?: number;
  data?: unknown;
  error?: string;
  durationMs: number;
}

// ---------- Detection ----------

const IMG_EXT = /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|svg|avif)(\?.*)?$/i;

function detectKind(raw: string): LookupKind {
  const v = raw.trim();
  if (!v) return "unknown";

  // Multi-line input: probably raw HTTP headers
  if (v.includes("\n")) {
    const lines = v.split(/\r?\n/).filter(Boolean);
    const headerish = lines.filter((l) => /^[A-Za-z][A-Za-z0-9-]{1,40}:\s/.test(l));
    if (headerish.length >= 2) return "headers";
  }

  // Discord invite (check BEFORE generic URL)
  if (/^(?:https?:\/\/)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/[a-zA-Z0-9-]+\/?$/i.test(v))
    return "discord_invite";

  // URLs
  if (/^https?:\/\//i.test(v)) {
    if (IMG_EXT.test(v)) return "image_url";
    return "url";
  }

  // Crypto wallets (check before generic patterns)
  if (/^0x[a-fA-F0-9]{40}$/.test(v)) return "crypto_eth";
  if (/^(bc1[ac-hj-np-z02-9]{8,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,39})$/.test(v))
    return "crypto_btc";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v) && !/^[0-9]+$/.test(v) && !/^[a-zA-Z0-9_.-]{2,32}$/.test(v.toLowerCase()))
    return "crypto_sol";

  // IP
  const ipv4 =
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/;
  if (ipv4.test(v)) return "ip";
  if (v.includes(":") && /^[\da-fA-F:]+$/.test(v) && v.length >= 3) return "ip";

  // Coordinates
  if (/^\s*-?\d{1,2}(?:\.\d+)?\s*[, ]\s*-?\d{1,3}(?:\.\d+)?\s*$/.test(v))
    return "coordinates";

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "email";

  // Hash (32/40/64 hex)
  if (/^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/.test(v))
    return "hash";

  // Discord snowflake (pure 17-20 digits)
  if (/^\d{17,20}$/.test(v)) return "discord_id";

  // Phone
  if (
    /^\+?[\d][\d\s\-().]{6,18}$/.test(v) &&
    /\d{7,}/.test(v.replace(/\D/g, ""))
  )
    return "phone";

  // Domain
  if (/^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(v)) return "domain";

  // Username (allow leading @)
  if (/^@?[a-zA-Z0-9_.-]{2,64}$/.test(v)) return "username";

  return "unknown";
}

// ---------- Networking ----------

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

// ---------- Paid breach providers ----------

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
    { headers: { "X-API-Key": key, Accept: "application/json" } },
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

// ---------- Free enrichment ----------

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
  const result: Record<string, unknown> = { email, domain, formatValid: true };
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

// ---------- Crypto adapters ----------

async function ethAddress(addr: string) {
  // Ethplorer freekey is a public read-only key.
  return fetchJson(
    `https://api.ethplorer.io/getAddressInfo/${encodeURIComponent(addr)}?apiKey=freekey`,
  );
}

async function btcAddress(addr: string) {
  return fetchJson(`https://blockstream.info/api/address/${encodeURIComponent(addr)}`);
}

async function solAddress(addr: string) {
  // Solana JSON-RPC public endpoint
  return fetchJson("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [addr, { encoding: "base64" }],
    }),
  });
}

// ---------- Discord ----------

async function discordUser(id: string) {
  return fetchJson(`https://discordlookup.mesalytic.moe/v1/user/${encodeURIComponent(id)}`);
}

async function discordInvite(inviteOrUrl: string) {
  const code = inviteOrUrl
    .replace(/^https?:\/\//i, "")
    .replace(/^discord(?:app)?\.com\/invite\//i, "")
    .replace(/^discord\.gg\//i, "")
    .trim();
  return fetchJson(
    `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=true`,
  );
}

// ---------- URL / image / archive / headers ----------

async function urlMeta(url: string) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 10000);
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ac.signal });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headers[k] = v;
    });
    return {
      status: res.status,
      data: {
        url,
        finalUrl: res.url,
        status: res.status,
        contentType: res.headers.get("content-type"),
        contentLength: res.headers.get("content-length"),
        server: res.headers.get("server"),
        lastModified: res.headers.get("last-modified"),
        etag: res.headers.get("etag"),
        headers,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function wayback(url: string) {
  return fetchJson(
    `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
  );
}

function parseHeaders(raw: string) {
  const lines = raw.split(/\r?\n/);
  const headers: Record<string, string> = {};
  let statusLine: string | null = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (!statusLine && /^(?:HTTP\/[\d.]+\s|GET\s|POST\s|PUT\s|DELETE\s|HEAD\s|PATCH\s|OPTIONS\s)/i.test(line)) {
      statusLine = line.trim();
      continue;
    }
    const m = /^([A-Za-z][A-Za-z0-9-]{1,60}):\s*(.*)$/.exec(line);
    if (m) {
      const k = m[1]!.toLowerCase();
      headers[k] = headers[k] ? `${headers[k]}, ${m[2]}` : m[2]!;
    }
  }
  const securityHeaders = [
    "strict-transport-security",
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "cross-origin-opener-policy",
    "cross-origin-embedder-policy",
    "cross-origin-resource-policy",
  ];
  const present = securityHeaders.filter((h) => headers[h]);
  const missing = securityHeaders.filter((h) => !headers[h]);
  return {
    status: 200,
    data: {
      statusLine,
      server: headers["server"] ?? null,
      contentType: headers["content-type"] ?? null,
      setCookieCount: (headers["set-cookie"]?.split(",").length ?? 0),
      poweredBy: headers["x-powered-by"] ?? null,
      securityHeaders: { present, missing },
      headers,
    },
  };
}

// ---------- Pivot links / Google dorks (Instagram, Facebook, etc) ----------

interface PivotGroup {
  group: string;
  links: Array<{ label: string; url: string }>;
}

function googleDork(q: string, extra = ""): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`"${q}" ${extra}`.trim())}`;
}

function pivots(value: string, kind: LookupKind): PivotGroup[] {
  const enc = encodeURIComponent(value);
  const handle = value.replace(/^@/, "");
  const out: PivotGroup[] = [];

  out.push({
    group: "Google Dorks",
    links: [
      { label: "Mention anywhere", url: googleDork(value) },
      { label: "Documents (pdf/doc)", url: googleDork(value, "filetype:pdf OR filetype:doc OR filetype:docx") },
      { label: "Spreadsheets / data", url: googleDork(value, "filetype:csv OR filetype:xls OR filetype:xlsx OR filetype:sql") },
      { label: "Pastes", url: googleDork(value, "site:pastebin.com OR site:ghostbin.com OR site:rentry.co OR site:justpaste.it") },
      { label: "Code / leaks", url: googleDork(value, "site:github.com OR site:gitlab.com OR site:bitbucket.org") },
      { label: "Forums / boards", url: googleDork(value, "site:reddit.com OR site:4chan.org OR site:kiwifarms.net") },
    ],
  });

  out.push({
    group: "Social Discovery",
    links: [
      { label: "Instagram (search)", url: `https://www.instagram.com/web/search/topsearch/?query=${enc}` },
      { label: "Instagram (profile)", url: `https://www.instagram.com/${encodeURIComponent(handle)}/` },
      { label: "Facebook (search)", url: `https://www.facebook.com/search/top?q=${enc}` },
      { label: "Facebook (profile)", url: `https://www.facebook.com/${encodeURIComponent(handle)}` },
      { label: "X / Twitter", url: `https://twitter.com/${encodeURIComponent(handle)}` },
      { label: "TikTok", url: `https://www.tiktok.com/@${encodeURIComponent(handle)}` },
      { label: "GitHub", url: `https://github.com/${encodeURIComponent(handle)}` },
      { label: "Reddit user", url: `https://www.reddit.com/user/${encodeURIComponent(handle)}` },
      { label: "LinkedIn (search)", url: `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${value}"`)}` },
      { label: "Sherlock-style sweep", url: `https://whatsmyname.app/?q=${enc}` },
    ],
  });

  out.push({
    group: "Smart Dorks",
    links: [
      { label: "Resumes / CV", url: googleDork(value, "(resume OR cv) (filetype:pdf OR filetype:doc)") },
      { label: "Login / credentials", url: googleDork(value, "intext:password OR intext:passwd OR intext:credentials") },
      { label: "Buckets & indexes", url: googleDork(value, 'intitle:"index of" OR site:s3.amazonaws.com') },
      { label: "Email lists", url: googleDork(value, '"@gmail.com" OR "@outlook.com" OR "@yahoo.com"') },
      { label: "Court / public records", url: googleDork(value, "site:courtlistener.com OR site:pacer.gov OR site:justia.com") },
      { label: "Breach mentions", url: googleDork(value, '"breach" OR "leaked" OR "dump"') },
    ],
  });

  if (kind === "crypto_eth") {
    out.push({
      group: "Crypto Explorers",
      links: [
        { label: "Etherscan", url: `https://etherscan.io/address/${enc}` },
        { label: "Blockchair", url: `https://blockchair.com/ethereum/address/${enc}` },
        { label: "Arkham", url: `https://platform.arkhamintelligence.com/explorer/address/${enc}` },
        { label: "DeBank", url: `https://debank.com/profile/${enc}` },
      ],
    });
  } else if (kind === "crypto_btc") {
    out.push({
      group: "Crypto Explorers",
      links: [
        { label: "Mempool.space", url: `https://mempool.space/address/${enc}` },
        { label: "Blockstream", url: `https://blockstream.info/address/${enc}` },
        { label: "Blockchair", url: `https://blockchair.com/bitcoin/address/${enc}` },
      ],
    });
  } else if (kind === "crypto_sol") {
    out.push({
      group: "Crypto Explorers",
      links: [
        { label: "Solscan", url: `https://solscan.io/account/${enc}` },
        { label: "SolanaFM", url: `https://solana.fm/address/${enc}` },
      ],
    });
  } else if (kind === "ip") {
    out.push({
      group: "IP Pivots",
      links: [
        { label: "Shodan", url: `https://www.shodan.io/host/${enc}` },
        { label: "Censys", url: `https://search.censys.io/hosts/${enc}` },
        { label: "AbuseIPDB", url: `https://www.abuseipdb.com/check/${enc}` },
        { label: "VirusTotal", url: `https://www.virustotal.com/gui/ip-address/${enc}` },
      ],
    });
  } else if (kind === "domain" || kind === "url") {
    const host = kind === "url" ? new URL(value).hostname : value;
    const henc = encodeURIComponent(host);
    out.push({
      group: "Domain Pivots",
      links: [
        { label: "crt.sh certificates", url: `https://crt.sh/?q=${henc}` },
        { label: "VirusTotal", url: `https://www.virustotal.com/gui/domain/${henc}` },
        { label: "URLScan", url: `https://urlscan.io/search/#domain%3A${henc}` },
        { label: "SecurityTrails", url: `https://securitytrails.com/domain/${henc}` },
        { label: "Wayback Machine", url: `https://web.archive.org/web/*/${henc}/*` },
      ],
    });
  } else if (kind === "email") {
    const [, dom = ""] = value.split("@");
    out.push({
      group: "Email Pivots",
      links: [
        { label: "HaveIBeenPwned", url: `https://haveibeenpwned.com/account/${enc}` },
        { label: "Hunter.io domain", url: `https://hunter.io/search/${encodeURIComponent(dom)}` },
        { label: "Gravatar profile", url: `https://en.gravatar.com/${enc}` },
        { label: "Epieos", url: `https://tools.epieos.com/email.php?email=${enc}` },
      ],
    });
  } else if (kind === "phone") {
    out.push({
      group: "Phone Pivots",
      links: [
        { label: "Truecaller (web)", url: `https://www.truecaller.com/search/us/${enc}` },
        { label: "OSINT Industries", url: `https://osint.industries/phone-search?q=${enc}` },
      ],
    });
  } else if (kind === "discord_id" || kind === "discord_invite") {
    out.push({
      group: "Discord Pivots",
      links: [
        { label: "Mesalytic Lookup", url: `https://discordlookup.com/user/${enc}` },
        { label: "Disboard", url: `https://disboard.org/search?keyword=${enc}` },
      ],
    });
  } else if (kind === "image_url") {
    out.push({
      group: "Image Reverse Search",
      links: [
        { label: "Google Lens", url: `https://lens.google.com/uploadbyurl?url=${enc}` },
        { label: "Yandex", url: `https://yandex.com/images/search?rpt=imageview&url=${enc}` },
        { label: "TinEye", url: `https://www.tineye.com/search?url=${enc}` },
        { label: "Bing Visual", url: `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&q=imgurl:${enc}` },
      ],
    });
  }

  return out;
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

// ---------- Route ----------

router.post("/lookup", async (req, res) => {
  const raw = typeof req.body?.query === "string" ? req.body.query : "";
  const value = raw.trim();
  if (!value) {
    res.status(400).json({ error: "Query required." });
    return;
  }

  const kind = detectKind(value);
  const tasks: Array<[string, () => Promise<{ status?: number; data: unknown }>]> = [];

  // Strip leading @ for lookups when treated as username
  const usernameValue = kind === "username" ? value.replace(/^@/, "") : value;

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
    tasks.push(["wayback", () => wayback(`http://${value}`)]);
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
    tasks.push(["snusbase", () => snusbase(usernameValue, kind)]);
    tasks.push(["leakcheck", () => leakcheck(usernameValue, kind)]);
    tasks.push(["intelvault", () => intelvault(usernameValue)]);
    tasks.push(["osintcat", () => osintcat(usernameValue)]);
    tasks.push(["breachhub", () => breachhub(usernameValue)]);
    tasks.push(["luperly", () => luperly(usernameValue)]);
    tasks.push(["swatted", () => swatted(usernameValue, kind)]);
  } else if (kind === "crypto_eth") {
    tasks.push(["ethplorer", () => ethAddress(value)]);
  } else if (kind === "crypto_btc") {
    tasks.push(["blockstream", () => btcAddress(value)]);
  } else if (kind === "crypto_sol") {
    tasks.push(["solana-rpc", () => solAddress(value)]);
  } else if (kind === "discord_id") {
    tasks.push(["discord-user", () => discordUser(value)]);
  } else if (kind === "discord_invite") {
    tasks.push(["discord-invite", () => discordInvite(value)]);
  } else if (kind === "url") {
    tasks.push(["url-meta", () => urlMeta(value)]);
    tasks.push(["wayback", () => wayback(value)]);
  } else if (kind === "image_url") {
    tasks.push(["url-meta", () => urlMeta(value)]);
  } else if (kind === "headers") {
    tasks.push(["header-analysis", async () => parseHeaders(value)]);
  } else {
    res.status(400).json({
      error:
        "Unrecognized input. Try email, username, IP, phone, hash, domain, URL, image URL, raw HTTP headers, or a wallet (ETH/BTC/SOL).",
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

  // Pull common enrichment blocks for the UI
  const find = (name: string) =>
    results.find((r) => r.source === name && r.ok)?.data ?? null;

  let pivotKind = kind;
  if (kind === "username") {
    // pivots() needs the bare handle for social URLs
  }
  const pivotLinks = pivots(usernameValue, pivotKind);

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
      ipGeo: find("ip-geo"),
      reverseGeocode: find("reverse-geocode"),
      email: find("email-dns"),
      domain: find("domain-dns"),
      crypto:
        find("ethplorer") ?? find("blockstream") ?? find("solana-rpc"),
      discordUser: find("discord-user"),
      discordInvite: find("discord-invite"),
      url: find("url-meta"),
      wayback: find("wayback"),
      headers: find("header-analysis"),
    },
    breaches,
    pivots: pivotLinks,
    sources: results,
  });
});

export default router;
