import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Search, Loader2, MapPin, Globe, Mail, Server } from "lucide-react";
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

function ResultRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-white/5 last:border-b-0">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
        {label}
      </div>
      <div className="col-span-2 text-sm text-white/90 font-mono break-all">
        {fmt(value)}
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
  const locationLabel = [city, region, country].filter(Boolean).join(", ");
  const mapsUrl =
    lat !== undefined && lon !== undefined
      ? `https://www.google.com/maps?q=${lat},${lon}&z=8`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-white/60">
        <Server className="w-4 h-4" />
        <span className="text-[10px] font-mono uppercase tracking-[0.25em]">
          IP Address Report · {query}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Network</h3>
          <ResultRow label="IP" value={result["query"]} />
          <ResultRow label="ISP" value={result["isp"]} />
          <ResultRow label="Organization" value={result["org"]} />
          <ResultRow label="ASN" value={result["as"]} />
          <ResultRow label="Reverse DNS" value={result["reverse"]} />
          <ResultRow label="Hosting" value={result["hosting"]} />
          <ResultRow label="Proxy / VPN" value={result["proxy"]} />
          <ResultRow label="Mobile" value={result["mobile"]} />
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Geography</h3>
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
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-xs font-bold tracking-widest uppercase hover:bg-white/90 transition-all"
            >
              <MapPin className="w-3.5 h-3.5" />
              View Approximate Area on Maps
            </a>
          )}
          <p className="mt-4 text-[11px] text-white/40 leading-relaxed">
            Note: IP geolocation typically resolves to the carrier or city level only — not a
            specific address.
          </p>
        </div>
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
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-white/60">
        <MapPin className="w-4 h-4" />
        <span className="text-[10px] font-mono uppercase tracking-[0.25em]">
          Coordinate Report · {query}
        </span>
      </div>
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
        <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Reverse Geocode</h3>
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
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-xs font-bold tracking-widest uppercase hover:bg-white/90 transition-all"
        >
          <MapPin className="w-3.5 h-3.5" />
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}

function EmailReport({ result, query }: { result: Record<string, unknown>; query: string }) {
  const mx = (result["mxRecords"] as Array<{ exchange: string; priority: number }>) ?? [];
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-white/60">
        <Mail className="w-4 h-4" />
        <span className="text-[10px] font-mono uppercase tracking-[0.25em]">
          Email Validation · {query}
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Address</h3>
          <ResultRow label="Email" value={result["email"]} />
          <ResultRow label="Domain" value={result["domain"]} />
          <ResultRow label="Format Valid" value={result["formatValid"]} />
          <ResultRow label="Deliverable" value={result["deliverable"]} />
          <ResultRow label="Free Provider" value={result["freeProvider"]} />
          <ResultRow label="Likely Disposable" value={result["likelyDisposable"]} />
          <ResultRow label="Mail Handled By" value={result["mailHandledBy"]} />
        </div>
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4">MX Records</h3>
          {mx.length === 0 ? (
            <p className="text-sm text-white/50">No MX records resolved.</p>
          ) : (
            mx.map((m, i) => (
              <ResultRow key={i} label={`Priority ${m.priority}`} value={m.exchange} />
            ))
          )}
          <p className="mt-4 text-[11px] text-white/40 leading-relaxed">
            This is a deliverability and reputation check only — no inbox enumeration, no
            person-level data.
          </p>
        </div>
      </div>
    </div>
  );
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
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-24">
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
          Enter for a full report on whatever you need.
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
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-sm text-white/70"
            >
              {error}
            </motion.div>
          )}
          {data && (
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
