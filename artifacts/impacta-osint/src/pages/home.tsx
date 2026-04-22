import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  MapPin,
  Globe,
  Mail,
  Server,
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Download,
  Printer,
  Hash,
  Clock,
  Building2,
  Network,
  Wifi,
  Database,
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  KeyRound,
  User,
  Phone,
  Wallet,
  MessageSquare,
  Image as ImageIcon,
  Archive,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  Lock,
  LockOpen,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

// ---------- Types ----------

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

interface SourceResult {
  source: string;
  ok: boolean;
  status?: number;
  error?: string;
  data?: unknown;
  durationMs: number;
}

interface PivotGroup {
  group: string;
  links: Array<{ label: string; url: string }>;
}

interface LookupResponse {
  kind: LookupKind;
  query: string;
  summary: {
    sourcesQueried: number;
    sourcesOk: number;
    sourcesErr: number;
    breachCount: number;
    uniqueDatabases: number;
    generatedAt: string;
  };
  enrichment: {
    ipGeo: Record<string, unknown> | null;
    reverseGeocode: Record<string, unknown> | null;
    email: Record<string, unknown> | null;
    domain: Record<string, unknown> | null;
    crypto: Record<string, unknown> | null;
    discordUser: Record<string, unknown> | null;
    discordInvite: Record<string, unknown> | null;
    url: Record<string, unknown> | null;
    wayback: Record<string, unknown> | null;
    headers: Record<string, unknown> | null;
  };
  breaches: NormalizedBreach[];
  pivots: PivotGroup[];
  sources: SourceResult[];
}

// ---------- Helpers ----------

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function shortId(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h) ^ seed.charCodeAt(i);
  const hex = (h >>> 0).toString(16).padStart(8, "0").toUpperCase();
  return `IMP-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const KIND_LABEL: Record<LookupKind, string> = {
  ip: "IP Intelligence",
  coordinates: "Geolocation",
  email: "Email Intelligence",
  username: "Username Intelligence",
  phone: "Phone Intelligence",
  domain: "Domain Intelligence",
  hash: "Hash Intelligence",
  crypto_eth: "Ethereum Wallet",
  crypto_btc: "Bitcoin Wallet",
  crypto_sol: "Solana Wallet",
  discord_id: "Discord User",
  discord_invite: "Discord Invite",
  url: "URL Intelligence",
  image_url: "Image Analysis",
  headers: "Header Analysis",
  unknown: "Unknown Selector",
};

// ---------- Atoms ----------

function ResultRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-4 py-2.5 border-b border-white/5 last:border-b-0">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 pt-0.5">
        {label}
      </div>
      <div className="text-sm text-white/90 font-mono break-all leading-relaxed">
        {fmt(value)}
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
  className = "",
  right,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 overflow-hidden print:bg-white print:border-black/20 ${className}`}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02] print:bg-black/[0.02] print:border-black/10">
        <div className="flex items-center gap-2.5 text-white print:text-black">
          {icon}
          <h3 className="text-[11px] font-bold uppercase tracking-[0.25em]">
            {title}
          </h3>
        </div>
        {right}
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: "neutral" | "ok" | "warn" | "alert";
  icon?: ReactNode;
  children: ReactNode;
}) {
  const styles = {
    neutral: "bg-white/5 text-white/70 border-white/15",
    ok: "bg-white text-black border-white",
    warn: "bg-white/10 text-white border-white/40",
    alert: "bg-black text-white border-white/60 ring-1 ring-white/30",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] ${styles}`}
    >
      {icon}
      {children}
    </span>
  );
}

function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 border-r border-white/10 last:border-r-0 min-w-0">
      <div className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/40">
        {label}
      </div>
      <div className="text-sm font-bold text-white truncate" title={value}>
        {value || "—"}
      </div>
    </div>
  );
}

// ---------- Report header ----------

function ReportHeader({
  data,
  onCopy,
  onDownload,
  onPrint,
  copied,
}: {
  data: LookupResponse;
  onCopy: () => void;
  onDownload: () => void;
  onPrint: () => void;
  copied: boolean;
}) {
  const generated = useMemo(
    () => new Date(data.summary.generatedAt),
    [data.summary.generatedAt],
  );
  const id = useMemo(
    () => shortId(`${data.kind}:${data.query}`),
    [data.kind, data.query],
  );
  const breachToneClass =
    data.summary.breachCount > 0
      ? "bg-black text-white border-white/60 ring-1 ring-white/30"
      : "bg-white text-black border-white";

  const facts = [
    { label: "Type", value: KIND_LABEL[data.kind] },
    { label: "Sources", value: `${data.summary.sourcesOk}/${data.summary.sourcesQueried}` },
    { label: "Records", value: String(data.summary.breachCount) },
    { label: "Databases", value: String(data.summary.uniqueDatabases) },
  ];

  return (
    <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent border border-white/15 overflow-hidden mb-6 print:bg-white print:border-black/20">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 px-6 py-5 border-b border-white/10 print:border-black/10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-2">
            <span>IMPACTA OSINT</span>
            <span className="text-white/20">·</span>
            <span>{KIND_LABEL[data.kind]} Report</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-mono break-all print:text-black">
            {data.query.length > 200 ? data.query.slice(0, 200) + "…" : data.query}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] ${breachToneClass}`}
            >
              {data.summary.breachCount > 0 ? (
                <>
                  <ShieldAlert className="w-3 h-3" />
                  {data.summary.breachCount} record
                  {data.summary.breachCount === 1 ? "" : "s"} found
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  No exposures
                </>
              )}
            </span>
            <Badge tone="neutral" icon={<Database className="w-3 h-3" />}>
              {data.summary.uniqueDatabases} database
              {data.summary.uniqueDatabases === 1 ? "" : "s"}
            </Badge>
            <Badge tone="neutral" icon={<Network className="w-3 h-3" />}>
              {data.summary.sourcesOk}/{data.summary.sourcesQueried} providers
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 print:hidden">
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 transition-colors"
            title="Copy JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 transition-colors"
            title="Download JSON"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-black hover:bg-white/90 border border-white text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
            title="Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-white/10 print:border-black/10">
        {facts.map((f) => (
          <KeyFact key={f.label} label={f.label} value={f.value} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
        <div className="flex items-center gap-1.5">
          <Hash className="w-3 h-3" /> {id}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {generated.toISOString().replace("T", " ").slice(0, 19)} UTC
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3" /> Aggregated multi-source
        </div>
      </div>
    </div>
  );
}

// ---------- Breach table ----------

function BreachTable({ breaches }: { breaches: NormalizedBreach[] }) {
  const [reveal, setReveal] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (breaches.length === 0) {
    return (
      <Card icon={<ShieldAlert className="w-4 h-4" />} title="Breach Records">
        <div className="flex items-center gap-3 text-sm text-white/60 font-mono">
          <CheckCircle2 className="w-4 h-4 text-white" />
          No breach records returned by any provider.
        </div>
      </Card>
    );
  }

  const mask = (s?: string) => {
    if (!s) return "—";
    if (reveal) return s;
    if (s.length <= 4) return "•".repeat(s.length);
    return s.slice(0, 2) + "•".repeat(Math.min(8, s.length - 4)) + s.slice(-2);
  };

  return (
    <Card
      icon={<Database className="w-4 h-4" />}
      title={`Breach Records (${breaches.length})`}
      right={
        <button
          onClick={() => setReveal((r) => !r)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70 transition-colors print:hidden"
        >
          {reveal ? (
            <>
              <EyeOff className="w-3 h-3" /> Mask
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" /> Reveal
            </>
          )}
        </button>
      }
    >
      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-[12px] font-mono">
          <thead>
            <tr className="text-left text-white/40 text-[9px] uppercase tracking-[0.25em] border-b border-white/10">
              <th className="px-6 py-3 font-medium">Source</th>
              <th className="px-3 py-3 font-medium">Database</th>
              <th className="px-3 py-3 font-medium">Email</th>
              <th className="px-3 py-3 font-medium">Username</th>
              <th className="px-3 py-3 font-medium">Password</th>
              <th className="px-3 py-3 font-medium">IP</th>
              <th className="px-6 py-3 font-medium text-right">More</th>
            </tr>
          </thead>
          <tbody>
            {breaches.map((b, i) => {
              const isOpen = openIdx === i;
              return (
                <>
                  <tr
                    key={i}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-3 text-white/80 capitalize">{b.source}</td>
                    <td className="px-3 py-3 text-white/70">{b.database ?? "—"}</td>
                    <td className="px-3 py-3 text-white/80 break-all">{b.email ?? "—"}</td>
                    <td className="px-3 py-3 text-white/80 break-all">{b.username ?? "—"}</td>
                    <td className="px-3 py-3 text-white break-all">{mask(b.password)}</td>
                    <td className="px-3 py-3 text-white/70">{b.ip ?? "—"}</td>
                    <td className="px-6 py-3 text-right print:hidden">
                      {b.raw ? (
                        <button
                          onClick={() => setOpenIdx(isOpen ? null : i)}
                          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white"
                        >
                          {isOpen ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          Raw
                        </button>
                      ) : null}
                    </td>
                  </tr>
                  {isOpen && b.raw ? (
                    <tr className="bg-white/[0.02] print:hidden">
                      <td colSpan={7} className="px-6 py-3">
                        <pre className="text-[10px] text-white/70 whitespace-pre-wrap break-all leading-relaxed">
                          {JSON.stringify(b.raw, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ) : null}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------- Enrichment cards ----------

function IpEnrichment({ result }: { result: Record<string, unknown> }) {
  const lat = result["lat"] as number | undefined;
  const lon = result["lon"] as number | undefined;
  const mapsUrl =
    lat !== undefined && lon !== undefined
      ? `https://www.google.com/maps?q=${lat},${lon}&z=10`
      : null;
  const isProxy = Boolean(result["proxy"]);
  const isHosting = Boolean(result["hosting"]);
  const isMobile = Boolean(result["mobile"]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card icon={<Network className="w-4 h-4" />} title="Network">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {isProxy && (
            <Badge tone="alert" icon={<ShieldAlert className="w-3 h-3" />}>
              Proxy / VPN
            </Badge>
          )}
          {isHosting && (
            <Badge tone="warn" icon={<Server className="w-3 h-3" />}>
              Hosting
            </Badge>
          )}
          {isMobile && (
            <Badge tone="warn" icon={<Wifi className="w-3 h-3" />}>
              Mobile
            </Badge>
          )}
          {!isProxy && !isHosting && (
            <Badge tone="ok" icon={<CheckCircle2 className="w-3 h-3" />}>
              Residential
            </Badge>
          )}
        </div>
        <ResultRow label="IP" value={result["query"]} />
        <ResultRow label="ISP" value={result["isp"]} />
        <ResultRow label="Organization" value={result["org"]} />
        <ResultRow label="ASN" value={result["as"]} />
        <ResultRow label="Reverse DNS" value={result["reverse"]} />
      </Card>
      <Card icon={<MapPin className="w-4 h-4" />} title="Geography">
        <ResultRow label="City" value={result["city"]} />
        <ResultRow label="Region" value={result["regionName"]} />
        <ResultRow label="Country" value={result["country"]} />
        <ResultRow label="Postal" value={result["zip"]} />
        <ResultRow label="Timezone" value={result["timezone"]} />
        <ResultRow label="Lat / Lon" value={`${result["lat"] ?? ""}, ${result["lon"] ?? ""}`} />
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-white/90 print:hidden"
          >
            <MapPin className="w-3.5 h-3.5" /> Open Map
          </a>
        ) : null}
      </Card>
    </div>
  );
}

function EmailEnrichment({ result }: { result: Record<string, unknown> }) {
  const mx =
    (result["mxRecords"] as Array<{ exchange: string; priority: number }>) ?? [];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card icon={<Mail className="w-4 h-4" />} title="Address">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge
            tone={result["deliverable"] ? "ok" : "alert"}
            icon={
              result["deliverable"] ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )
            }
          >
            {result["deliverable"] ? "Deliverable" : "Undeliverable"}
          </Badge>
          {Boolean(result["likelyDisposable"]) && (
            <Badge tone="alert" icon={<ShieldAlert className="w-3 h-3" />}>
              Disposable
            </Badge>
          )}
          {Boolean(result["freeProvider"]) && (
            <Badge tone="warn">Free provider</Badge>
          )}
        </div>
        <ResultRow label="Email" value={result["email"]} />
        <ResultRow label="Domain" value={result["domain"]} />
        <ResultRow label="Mail Handled By" value={result["mailHandledBy"]} />
      </Card>
      <Card icon={<Building2 className="w-4 h-4" />} title="MX Records">
        {mx.length === 0 ? (
          <p className="text-sm text-white/50 font-mono">No MX records.</p>
        ) : (
          mx.map((m, i) => (
            <ResultRow key={i} label={`Priority ${m.priority}`} value={m.exchange} />
          ))
        )}
      </Card>
    </div>
  );
}

function DomainEnrichment({ result }: { result: Record<string, unknown> }) {
  const a = (result["a"] as string[]) ?? [];
  const aaaa = (result["aaaa"] as string[]) ?? [];
  const mx =
    (result["mx"] as Array<{ exchange: string; priority: number }>) ?? [];
  const ns = (result["ns"] as string[]) ?? [];
  const txt = (result["txt"] as string[]) ?? [];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card icon={<Globe className="w-4 h-4" />} title="DNS">
        <ResultRow label="Domain" value={result["domain"]} />
        <ResultRow label="A" value={a.join(", ")} />
        <ResultRow label="AAAA" value={aaaa.join(", ")} />
        <ResultRow label="NS" value={ns.join(", ")} />
      </Card>
      <Card icon={<Building2 className="w-4 h-4" />} title="Mail / TXT">
        {mx.map((m, i) => (
          <ResultRow key={i} label={`MX ${m.priority}`} value={m.exchange} />
        ))}
        {txt.map((t, i) => (
          <ResultRow key={i} label={`TXT ${i + 1}`} value={t} />
        ))}
        {mx.length === 0 && txt.length === 0 ? (
          <p className="text-sm text-white/50 font-mono">No mail or TXT records.</p>
        ) : null}
      </Card>
    </div>
  );
}

function ReverseGeocode({ result }: { result: Record<string, unknown> }) {
  const lat = result["latitude"] as number;
  const lon = result["longitude"] as number;
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}&z=14`;
  return (
    <Card icon={<MapPin className="w-4 h-4" />} title="Reverse Geocode">
      <ResultRow label="Latitude" value={lat} />
      <ResultRow label="Longitude" value={lon} />
      <ResultRow label="Locality" value={result["locality"]} />
      <ResultRow label="City" value={result["city"]} />
      <ResultRow label="Subdivision" value={result["principalSubdivision"]} />
      <ResultRow label="Country" value={result["countryName"]} />
      <ResultRow label="Continent" value={result["continent"]} />
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-white/90 print:hidden"
      >
        <MapPin className="w-3.5 h-3.5" /> Open Map
      </a>
    </Card>
  );
}

function CryptoEnrichment({
  kind,
  result,
}: {
  kind: LookupKind;
  result: Record<string, unknown>;
}) {
  if (kind === "crypto_eth") {
    const eth = result as {
      address?: string;
      ETH?: { balance?: number; price?: { rate?: number } };
      countTxs?: number;
      tokens?: Array<{
        tokenInfo?: { symbol?: string; name?: string; decimals?: string | number };
        balance?: number;
      }>;
    };
    const balance = eth.ETH?.balance ?? 0;
    const usd = eth.ETH?.price?.rate ? balance * eth.ETH.price.rate : null;
    const tokens = eth.tokens ?? [];
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card icon={<Wallet className="w-4 h-4" />} title="Ethereum Wallet">
          <ResultRow label="Address" value={eth.address} />
          <ResultRow label="ETH Balance" value={balance} />
          <ResultRow label="USD Value" value={usd !== null ? `$${usd.toFixed(2)}` : "—"} />
          <ResultRow label="Tx Count" value={eth.countTxs ?? "—"} />
        </Card>
        <Card icon={<Database className="w-4 h-4" />} title={`Tokens (${tokens.length})`}>
          {tokens.length === 0 ? (
            <p className="text-sm text-white/50 font-mono">No ERC-20 tokens held.</p>
          ) : (
            tokens.slice(0, 12).map((t, i) => {
              const dec = Number(t.tokenInfo?.decimals ?? 18) || 18;
              const bal = t.balance ? t.balance / Math.pow(10, dec) : 0;
              return (
                <ResultRow
                  key={i}
                  label={t.tokenInfo?.symbol ?? `#${i}`}
                  value={`${bal.toFixed(4)} (${t.tokenInfo?.name ?? "?"})`}
                />
              );
            })
          )}
        </Card>
      </div>
    );
  }
  if (kind === "crypto_btc") {
    const btc = result as {
      address?: string;
      chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number; tx_count?: number };
      mempool_stats?: { tx_count?: number };
    };
    const funded = btc.chain_stats?.funded_txo_sum ?? 0;
    const spent = btc.chain_stats?.spent_txo_sum ?? 0;
    const balanceSat = funded - spent;
    return (
      <Card icon={<Wallet className="w-4 h-4" />} title="Bitcoin Wallet">
        <ResultRow label="Address" value={btc.address} />
        <ResultRow label="Balance (BTC)" value={(balanceSat / 1e8).toFixed(8)} />
        <ResultRow label="Total Received (BTC)" value={(funded / 1e8).toFixed(8)} />
        <ResultRow label="Total Sent (BTC)" value={(spent / 1e8).toFixed(8)} />
        <ResultRow label="Confirmed Tx Count" value={btc.chain_stats?.tx_count ?? 0} />
        <ResultRow label="Pending Tx Count" value={btc.mempool_stats?.tx_count ?? 0} />
      </Card>
    );
  }
  if (kind === "crypto_sol") {
    const sol = result as { result?: { value?: { lamports?: number; owner?: string; executable?: boolean } } };
    const lamports = sol.result?.value?.lamports ?? 0;
    return (
      <Card icon={<Wallet className="w-4 h-4" />} title="Solana Account">
        <ResultRow label="Balance (SOL)" value={(lamports / 1e9).toFixed(9)} />
        <ResultRow label="Owner Program" value={sol.result?.value?.owner} />
        <ResultRow label="Executable" value={sol.result?.value?.executable} />
      </Card>
    );
  }
  return null;
}

function DiscordUserCard({ result }: { result: Record<string, unknown> }) {
  const u = result as {
    id?: string;
    username?: string;
    global_name?: string;
    discriminator?: string;
    avatar?: { id?: string; link?: string };
    banner?: { link?: string };
    badges?: string[];
    created_at?: string;
  };
  return (
    <Card icon={<MessageSquare className="w-4 h-4" />} title="Discord User">
      <div className="flex items-start gap-4">
        {u.avatar?.link ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={u.avatar.link}
            alt="avatar"
            className="w-16 h-16 rounded-2xl border border-white/10"
          />
        ) : null}
        <div className="flex-1 min-w-0">
          <ResultRow label="ID" value={u.id} />
          <ResultRow label="Username" value={u.username} />
          <ResultRow label="Display Name" value={u.global_name} />
          <ResultRow label="Created" value={u.created_at} />
          <ResultRow label="Badges" value={(u.badges ?? []).join(", ") || "—"} />
        </div>
      </div>
    </Card>
  );
}

function DiscordInviteCard({ result }: { result: Record<string, unknown> }) {
  const i = result as {
    code?: string;
    expires_at?: string | null;
    approximate_member_count?: number;
    approximate_presence_count?: number;
    guild?: { id?: string; name?: string; description?: string; icon?: string };
    inviter?: { username?: string; id?: string };
  };
  return (
    <Card icon={<MessageSquare className="w-4 h-4" />} title="Discord Invite">
      <ResultRow label="Code" value={i.code} />
      <ResultRow label="Server" value={i.guild?.name} />
      <ResultRow label="Server ID" value={i.guild?.id} />
      <ResultRow label="Description" value={i.guild?.description} />
      <ResultRow label="Members" value={i.approximate_member_count} />
      <ResultRow label="Online" value={i.approximate_presence_count} />
      <ResultRow label="Inviter" value={i.inviter?.username} />
      <ResultRow label="Expires" value={i.expires_at ?? "Never"} />
    </Card>
  );
}

function UrlCard({ result, isImage }: { result: Record<string, unknown>; isImage: boolean }) {
  const u = result as {
    url?: string;
    finalUrl?: string;
    status?: number;
    contentType?: string;
    contentLength?: string;
    server?: string;
    lastModified?: string;
    etag?: string;
  };
  return (
    <Card
      icon={isImage ? <ImageIcon className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
      title={isImage ? "Image Metadata" : "URL Metadata"}
    >
      {isImage && u.url ? (
        <div className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-black/40 max-h-[320px] flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u.url} alt="preview" className="max-w-full max-h-[320px] object-contain" />
        </div>
      ) : null}
      <ResultRow label="URL" value={u.url} />
      {u.finalUrl && u.finalUrl !== u.url ? (
        <ResultRow label="Final URL" value={u.finalUrl} />
      ) : null}
      <ResultRow label="Status" value={u.status} />
      <ResultRow label="Content-Type" value={u.contentType} />
      <ResultRow label="Content-Length" value={u.contentLength} />
      <ResultRow label="Server" value={u.server} />
      <ResultRow label="Last-Modified" value={u.lastModified} />
      <ResultRow label="ETag" value={u.etag} />
    </Card>
  );
}

function WaybackCard({ result }: { result: Record<string, unknown> }) {
  const w = result as {
    archived_snapshots?: { closest?: { url?: string; timestamp?: string; available?: boolean } };
  };
  const snap = w.archived_snapshots?.closest;
  if (!snap?.available) {
    return (
      <Card icon={<Archive className="w-4 h-4" />} title="Internet Archive">
        <p className="text-sm text-white/50 font-mono">No archived snapshot found.</p>
      </Card>
    );
  }
  return (
    <Card icon={<Archive className="w-4 h-4" />} title="Internet Archive">
      <ResultRow label="Snapshot" value={snap.timestamp} />
      <ResultRow label="URL" value={snap.url} />
      {snap.url ? (
        <a
          href={snap.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-white/90 print:hidden"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open Snapshot
        </a>
      ) : null}
    </Card>
  );
}

function HeadersCard({ result }: { result: Record<string, unknown> }) {
  const h = result as {
    statusLine?: string;
    server?: string;
    contentType?: string;
    poweredBy?: string;
    setCookieCount?: number;
    securityHeaders?: { present?: string[]; missing?: string[] };
    headers?: Record<string, string>;
  };
  const present = h.securityHeaders?.present ?? [];
  const missing = h.securityHeaders?.missing ?? [];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card icon={<FileText className="w-4 h-4" />} title="Header Summary">
        <ResultRow label="Status Line" value={h.statusLine} />
        <ResultRow label="Server" value={h.server} />
        <ResultRow label="Content-Type" value={h.contentType} />
        <ResultRow label="X-Powered-By" value={h.poweredBy} />
        <ResultRow label="Set-Cookie Count" value={h.setCookieCount} />
      </Card>
      <Card icon={<Shield className="w-4 h-4" />} title="Security Headers">
        <div className="flex flex-col gap-2">
          {present.map((p) => (
            <div key={p} className="flex items-center gap-2 text-xs font-mono text-white/80">
              <Lock className="w-3 h-3" /> {p}
            </div>
          ))}
          {missing.map((m) => (
            <div key={m} className="flex items-center gap-2 text-xs font-mono text-white/40">
              <LockOpen className="w-3 h-3" /> {m}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ---------- Pivot links / dorks section ----------

function PivotsCard({ groups }: { groups: PivotGroup[] }) {
  if (!groups || groups.length === 0) return null;
  return (
    <Card icon={<Search className="w-4 h-4" />} title="Pivot Links & Dorks">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-3">
              {g.group}
            </div>
            <ul className="space-y-1.5">
              {g.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-2 text-xs text-white/80 hover:text-white font-mono break-all"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0 text-white/40 group-hover:text-white" />
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- Sources panel ----------

function SourcesPanel({ sources }: { sources: SourceResult[] }) {
  return (
    <Card icon={<Network className="w-4 h-4" />} title="Provider Status">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((s) => (
          <div
            key={s.source}
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5"
          >
            <div className="flex items-center gap-2 min-w-0">
              {s.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-white/50 shrink-0" />
              )}
              <span className="text-[12px] font-mono text-white/80 capitalize truncate">
                {s.source}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-white/40">
                {s.durationMs}ms
              </span>
              {!s.ok && s.error ? (
                <span
                  className="text-[10px] font-mono text-white/40 truncate max-w-[140px]"
                  title={s.error}
                >
                  {s.error}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- Auto-resizing textarea ----------

function AutoTextarea({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 240) + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      autoFocus
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (!disabled) onSubmit();
        }
      }}
      placeholder={placeholder}
      className="flex-1 bg-transparent outline-none text-white placeholder:text-white/30 font-mono text-sm md:text-base resize-none leading-snug py-1"
    />
  );
}

// ---------- Page ----------

const HINTS: Array<{ icon: ReactNode; label: string }> = [
  { icon: <Mail className="w-3 h-3" />, label: "email" },
  { icon: <User className="w-3 h-3" />, label: "username" },
  { icon: <Network className="w-3 h-3" />, label: "ip" },
  { icon: <Phone className="w-3 h-3" />, label: "phone" },
  { icon: <KeyRound className="w-3 h-3" />, label: "hash" },
  { icon: <Globe className="w-3 h-3" />, label: "domain" },
  { icon: <LinkIcon className="w-3 h-3" />, label: "url" },
  { icon: <Wallet className="w-3 h-3" />, label: "wallet" },
  { icon: <MessageSquare className="w-3 h-3" />, label: "discord" },
  { icon: <ImageIcon className="w-3 h-3" />, label: "image" },
  { icon: <FileText className="w-3 h-3" />, label: "headers" },
  { icon: <Archive className="w-3 h-3" />, label: "archive" },
  { icon: <MapPin className="w-3 h-3" />, label: "coordinates" },
];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LookupResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setCopied(false);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Lookup failed");
      } else {
        setData(json as LookupResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const onCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const onDownload = () => {
    if (!data) return;
    downloadJson(data, `impacta-${data.kind}-${data.query.slice(0, 32)}.json`);
  };

  const onPrint = () => window.print();

  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden selection:bg-white selection:text-black print:bg-white print:text-black">
      <Navbar />
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-16 print:pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 print:hidden"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono tracking-[0.2em] text-white/60 uppercase">
            <span className="w-1 h-1 rounded-full bg-white/80" />
            One field. Every source.
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
            Generate a full intelligence report.
          </h1>
          <p className="text-white/50 text-sm md:text-base max-w-2xl">
            Paste anything — email, username, IP, phone, hash, domain, URL,
            crypto wallet, Discord ID/invite, image link, raw HTTP headers, or
            coordinates. The platform auto-detects the selector and fans out to
            every relevant breach, blockchain, and pivot source in parallel.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onSubmit={onSubmit}
          className="relative mb-8 print:hidden"
        >
          <div className="absolute inset-0 -m-px rounded-2xl bg-gradient-to-r from-white/20 via-white/5 to-white/20 opacity-50 blur-sm" />
          <div className="relative flex items-start gap-3 px-5 py-4 rounded-2xl bg-black border border-white/10 focus-within:border-white/30 transition-colors">
            <Search className="w-5 h-5 text-white/40 shrink-0 mt-1" />
            <AutoTextarea
              value={query}
              onChange={setQuery}
              onSubmit={submit}
              disabled={loading || !query.trim()}
              placeholder="someone@example.com  ·  jdoe  ·  8.8.8.8  ·  0xabc…  ·  https://example.com/photo.jpg  ·  paste raw headers…"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-xs font-bold tracking-widest uppercase disabled:opacity-40 hover:bg-white/90 transition-all shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Running
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  Run
                </>
              )}
            </button>
          </div>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/30 font-mono tracking-wider">
            {HINTS.map((h) => (
              <span key={h.label} className="inline-flex items-center gap-1.5">
                {h.icon} {h.label}
              </span>
            ))}
          </p>
        </motion.form>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-8"
            >
              <div className="flex items-center gap-3 text-white/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[11px] font-mono uppercase tracking-[0.25em]">
                  Detecting selector & querying every connected provider…
                </span>
              </div>
              <div className="mt-6 space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-3 rounded-full bg-gradient-to-r from-white/10 via-white/[0.03] to-white/10 animate-pulse"
                    style={{ width: `${100 - i * 12}%` }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-3 p-5 rounded-2xl bg-white/[0.03] border border-white/15 text-sm text-white/80"
            >
              <XCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/50 mb-1">
                  Lookup failed
                </div>
                {error}
              </div>
            </motion.div>
          )}

          {data && !loading && (
            <motion.div
              key={data.query + data.kind}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <ReportHeader
                data={data}
                onCopy={onCopy}
                onDownload={onDownload}
                onPrint={onPrint}
                copied={copied}
              />

              {(data.kind === "email" ||
                data.kind === "username" ||
                data.kind === "phone" ||
                data.kind === "domain" ||
                data.kind === "hash" ||
                data.kind === "ip") && <BreachTable breaches={data.breaches} />}

              {data.enrichment.ipGeo ? (
                <IpEnrichment
                  result={data.enrichment.ipGeo as Record<string, unknown>}
                />
              ) : null}
              {data.enrichment.email ? (
                <EmailEnrichment
                  result={data.enrichment.email as Record<string, unknown>}
                />
              ) : null}
              {data.enrichment.domain ? (
                <DomainEnrichment
                  result={data.enrichment.domain as Record<string, unknown>}
                />
              ) : null}
              {data.enrichment.reverseGeocode ? (
                <ReverseGeocode
                  result={
                    data.enrichment.reverseGeocode as Record<string, unknown>
                  }
                />
              ) : null}
              {data.enrichment.crypto ? (
                <CryptoEnrichment
                  kind={data.kind}
                  result={data.enrichment.crypto as Record<string, unknown>}
                />
              ) : null}
              {data.enrichment.discordUser ? (
                <DiscordUserCard
                  result={data.enrichment.discordUser as Record<string, unknown>}
                />
              ) : null}
              {data.enrichment.discordInvite ? (
                <DiscordInviteCard
                  result={
                    data.enrichment.discordInvite as Record<string, unknown>
                  }
                />
              ) : null}
              {data.enrichment.url ? (
                <UrlCard
                  result={data.enrichment.url as Record<string, unknown>}
                  isImage={data.kind === "image_url"}
                />
              ) : null}
              {data.enrichment.wayback ? (
                <WaybackCard
                  result={data.enrichment.wayback as Record<string, unknown>}
                />
              ) : null}
              {data.enrichment.headers ? (
                <HeadersCard
                  result={data.enrichment.headers as Record<string, unknown>}
                />
              ) : null}

              <PivotsCard groups={data.pivots} />

              <SourcesPanel sources={data.sources} />

              <p className="text-[10px] text-white/30 font-mono tracking-wider px-1 print:text-black/50">
                Generated by IMPACTA OSINT — aggregated from third-party providers
                and public infrastructure data. For lawful investigative use only.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
