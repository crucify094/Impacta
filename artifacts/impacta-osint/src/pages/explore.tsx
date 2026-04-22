import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft,
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
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

type LookupKind = "ip" | "coordinates" | "email";

interface LookupResponse {
  kind: LookupKind;
  query: string;
  result: Record<string, unknown>;
}

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
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2.5 text-white">
          {icon}
          <h3 className="text-[11px] font-bold uppercase tracking-[0.25em]">
            {title}
          </h3>
        </div>
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

function ReportHeader({
  kind,
  query,
  badges,
  facts,
  onCopy,
  onDownload,
  onPrint,
  copied,
}: {
  kind: LookupKind;
  query: string;
  badges: ReactNode;
  facts: { label: string; value: string }[];
  onCopy: () => void;
  onDownload: () => void;
  onPrint: () => void;
  copied: boolean;
}) {
  const generated = useMemo(() => new Date(), [query, kind]);
  const id = useMemo(() => shortId(`${kind}:${query}`), [kind, query]);

  const kindLabel = {
    ip: "IP Intelligence Report",
    coordinates: "Geolocation Report",
    email: "Email Validation Report",
  }[kind];

  return (
    <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent border border-white/15 overflow-hidden mb-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 px-6 py-5 border-b border-white/10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-2">
            <span>IMPACTA OSINT</span>
            <span className="text-white/20">·</span>
            <span>{kindLabel}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-mono break-all">
            {query}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-3">{badges}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
            Export
          </button>
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 transition-colors"
            title="Print"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {facts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-white/10">
          {facts.map((f) => (
            <KeyFact key={f.label} label={f.label} value={f.value} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
        <div className="flex items-center gap-1.5">
          <Hash className="w-3 h-3" />
          {id}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {generated.toISOString().replace("T", " ").slice(0, 19)} UTC
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3" />
          Public sources
        </div>
      </div>
    </div>
  );
}

function IpReport({ result, query }: { result: Record<string, unknown>; query: string }) {
  const lat = result["lat"] as number | undefined;
  const lon = result["lon"] as number | undefined;
  const city = (result["city"] as string) ?? "";
  const region = (result["regionName"] as string) ?? "";
  const country = (result["country"] as string) ?? "";
  const isp = (result["isp"] as string) ?? "";
  const isProxy = Boolean(result["proxy"]);
  const isHosting = Boolean(result["hosting"]);
  const isMobile = Boolean(result["mobile"]);
  const locationLabel = [city, region, country].filter(Boolean).join(", ");
  const mapsUrl =
    lat !== undefined && lon !== undefined
      ? `https://www.google.com/maps?q=${lat},${lon}&z=10`
      : null;

  const badges = (
    <>
      <Badge tone="neutral" icon={<Globe className="w-3 h-3" />}>
        {country || "Unknown"}
      </Badge>
      {isProxy && (
        <Badge tone="alert" icon={<ShieldAlert className="w-3 h-3" />}>
          Proxy / VPN
        </Badge>
      )}
      {isHosting && (
        <Badge tone="warn" icon={<Server className="w-3 h-3" />}>
          Hosting / Datacenter
        </Badge>
      )}
      {isMobile && (
        <Badge tone="warn" icon={<Wifi className="w-3 h-3" />}>
          Mobile Carrier
        </Badge>
      )}
      {!isProxy && !isHosting && (
        <Badge tone="ok" icon={<CheckCircle2 className="w-3 h-3" />}>
          Residential
        </Badge>
      )}
    </>
  );

  const facts = [
    { label: "Location", value: locationLabel },
    { label: "ISP", value: isp },
    { label: "ASN", value: (result["as"] as string) ?? "" },
    { label: "Timezone", value: (result["timezone"] as string) ?? "" },
  ];

  return (
    <div>
      <ReportHeader
        kind="ip"
        query={query}
        badges={badges}
        facts={facts}
        onCopy={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
        onDownload={() => downloadJson(result, `ip-${query}.json`)}
        onPrint={() => window.print()}
        copied={false}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card icon={<Network className="w-4 h-4" />} title="Network">
          <ResultRow label="IP" value={result["query"]} />
          <ResultRow label="ISP" value={result["isp"]} />
          <ResultRow label="Organization" value={result["org"]} />
          <ResultRow label="ASN" value={result["as"]} />
          <ResultRow label="Reverse DNS" value={result["reverse"]} />
          <ResultRow label="Hosting" value={result["hosting"]} />
          <ResultRow label="Proxy / VPN" value={result["proxy"]} />
          <ResultRow label="Mobile" value={result["mobile"]} />
        </Card>

        <Card icon={<MapPin className="w-4 h-4" />} title="Geography">
          <ResultRow label="City" value={result["city"]} />
          <ResultRow label="Region" value={result["regionName"]} />
          <ResultRow label="Country" value={result["country"]} />
          <ResultRow label="Postal" value={result["zip"]} />
          <ResultRow label="Timezone" value={result["timezone"]} />
          <ResultRow label="Latitude" value={result["lat"]} />
          <ResultRow label="Longitude" value={result["lon"]} />
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-white/90 transition-all"
            >
              <MapPin className="w-3.5 h-3.5" />
              View Approximate Area
            </a>
          )}
          <p className="mt-4 text-[11px] text-white/40 leading-relaxed font-mono">
            IP geolocation typically resolves to the carrier or city level — never to a
            specific street address.
          </p>
        </Card>
      </div>
    </div>
  );
}

function CoordinatesReport({
  result,
  query,
}: {
  result: Record<string, unknown>;
  query: string;
}) {
  const lat = result["latitude"] as number;
  const lon = result["longitude"] as number;
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}&z=14`;
  const country = (result["countryName"] as string) ?? "";
  const locality = (result["locality"] as string) ?? "";
  const subdivision = (result["principalSubdivision"] as string) ?? "";

  const badges = (
    <>
      <Badge tone="neutral" icon={<Globe className="w-3 h-3" />}>
        {country || "Unknown"}
      </Badge>
      <Badge tone="ok" icon={<CheckCircle2 className="w-3 h-3" />}>
        Reverse geocoded
      </Badge>
    </>
  );

  const facts = [
    { label: "Locality", value: locality },
    { label: "Subdivision", value: subdivision },
    { label: "Country", value: country },
    { label: "Continent", value: (result["continent"] as string) ?? "" },
  ];

  return (
    <div>
      <ReportHeader
        kind="coordinates"
        query={query}
        badges={badges}
        facts={facts}
        onCopy={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
        onDownload={() => downloadJson(result, `coords-${lat}-${lon}.json`)}
        onPrint={() => window.print()}
        copied={false}
      />
      <Card icon={<MapPin className="w-4 h-4" />} title="Reverse Geocode">
        <ResultRow label="Latitude" value={lat} />
        <ResultRow label="Longitude" value={lon} />
        <ResultRow label="Locality" value={result["locality"]} />
        <ResultRow label="City" value={result["city"]} />
        <ResultRow label="Subdivision" value={result["principalSubdivision"]} />
        <ResultRow label="Country" value={result["countryName"]} />
        <ResultRow label="Country Code" value={result["countryCode"]} />
        <ResultRow label="Continent" value={result["continent"]} />
        <ResultRow label="Plus Code" value={result["plusCode"]} />
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-white/90 transition-all"
        >
          <MapPin className="w-3.5 h-3.5" />
          Open in Google Maps
        </a>
      </Card>
    </div>
  );
}

function EmailReport({ result, query }: { result: Record<string, unknown>; query: string }) {
  const mx = (result["mxRecords"] as Array<{ exchange: string; priority: number }>) ?? [];
  const formatValid = Boolean(result["formatValid"]);
  const deliverable = Boolean(result["deliverable"]);
  const free = Boolean(result["freeProvider"]);
  const disposable = Boolean(result["likelyDisposable"]);

  const badges = (
    <>
      <Badge
        tone={formatValid ? "ok" : "alert"}
        icon={formatValid ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      >
        {formatValid ? "Valid format" : "Invalid format"}
      </Badge>
      <Badge
        tone={deliverable ? "ok" : "alert"}
        icon={deliverable ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      >
        {deliverable ? "Deliverable" : "Undeliverable"}
      </Badge>
      {disposable && (
        <Badge tone="alert" icon={<ShieldAlert className="w-3 h-3" />}>
          Disposable
        </Badge>
      )}
      {free && <Badge tone="warn">Free provider</Badge>}
    </>
  );

  const facts = [
    { label: "Domain", value: (result["domain"] as string) ?? "" },
    { label: "Mail Provider", value: (result["mailHandledBy"] as string) ?? "" },
    { label: "MX Records", value: String(mx.length) },
    { label: "Status", value: deliverable ? "Active" : "Inactive" },
  ];

  return (
    <div>
      <ReportHeader
        kind="email"
        query={query}
        badges={badges}
        facts={facts}
        onCopy={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
        onDownload={() => downloadJson(result, `email-${query}.json`)}
        onPrint={() => window.print()}
        copied={false}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card icon={<Mail className="w-4 h-4" />} title="Address">
          <ResultRow label="Email" value={result["email"]} />
          <ResultRow label="Domain" value={result["domain"]} />
          <ResultRow label="Format Valid" value={result["formatValid"]} />
          <ResultRow label="Deliverable" value={result["deliverable"]} />
          <ResultRow label="Free Provider" value={result["freeProvider"]} />
          <ResultRow label="Likely Disposable" value={result["likelyDisposable"]} />
          <ResultRow label="Mail Handled By" value={result["mailHandledBy"]} />
        </Card>
        <Card icon={<Building2 className="w-4 h-4" />} title="MX Records">
          {mx.length === 0 ? (
            <p className="text-sm text-white/50 font-mono">No MX records resolved.</p>
          ) : (
            mx.map((m, i) => (
              <ResultRow key={i} label={`Priority ${m.priority}`} value={m.exchange} />
            ))
          )}
          <p className="mt-4 text-[11px] text-white/40 leading-relaxed font-mono">
            Deliverability and reputation check only — no inbox enumeration, no person-level
            data.
          </p>
        </Card>
      </div>
    </div>
  );
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LookupResponse | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
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

  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      <Navbar />
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-white/50 hover:text-white transition-colors mb-12"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-black tracking-tighter mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50"
        >
          Generate a full intelligence report.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-white/50 text-sm md:text-base mb-10"
        >
          Accepts an IP address, coordinates (lat, lon), or an email. One field, one query.
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onSubmit={onSubmit}
          className="relative mb-10"
        >
          <div className="absolute inset-0 -m-px rounded-2xl bg-gradient-to-r from-white/20 via-white/5 to-white/20 opacity-50 blur-sm" />
          <div className="relative flex items-center gap-3 px-5 py-4 rounded-2xl bg-black border border-white/10 focus-within:border-white/30 transition-colors">
            <Search className="w-5 h-5 text-white/40 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="8.8.8.8  ·  37.4220, -122.0841  ·  someone@example.com"
              className="flex-1 bg-transparent outline-none text-white placeholder:text-white/30 font-mono text-sm md:text-base"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-xs font-bold tracking-widest uppercase disabled:opacity-40 hover:bg-white/90 transition-all"
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
          <p className="mt-3 text-[11px] text-white/30 font-mono tracking-wider">
            Press Enter to run. Reports are aggregated from public infrastructure data only.
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
                  Aggregating public sources…
                </span>
              </div>
              <div className="mt-6 space-y-3">
                {[0, 1, 2, 3].map((i) => (
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
              transition={{ duration: 0.5 }}
            >
              {data.kind === "ip" && <IpReport result={data.result} query={data.query} />}
              {data.kind === "coordinates" && (
                <CoordinatesReport result={data.result} query={data.query} />
              )}
              {data.kind === "email" && (
                <EmailReport result={data.result} query={data.query} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
