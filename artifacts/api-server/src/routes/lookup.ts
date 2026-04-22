import { Router, type IRouter } from "express";
import { promises as dns } from "node:dns";

const router: IRouter = Router();

type LookupKind = "ip" | "coordinates" | "email" | "unknown";

function detectKind(raw: string): LookupKind {
  const v = raw.trim();
  if (!v) return "unknown";
  const ipv4 =
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  if (ipv4.test(v)) return "ip";
  if (v.includes(":") && ipv6.test(v) && v.length >= 3) return "ip";
  const coord = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;
  if (coord.test(v)) return "coordinates";
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email.test(v)) return "email";
  return "unknown";
}

async function lookupIp(ip: string) {
  const fields =
    "status,message,continent,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query";
  const res = await fetch(
    `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`,
  );
  if (!res.ok) throw new Error(`ip-api responded ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  if (data["status"] !== "success") {
    throw new Error(String(data["message"] ?? "Lookup failed"));
  }
  return data;
}

async function lookupCoordinates(lat: number, lon: number) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`reverse-geocode responded ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

async function lookupEmail(email: string) {
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
    result["error"] = "No MX records found for this domain";
  }
  const disposableHints = [
    "mailinator.com",
    "guerrillamail.com",
    "tempmail.com",
    "10minutemail.com",
    "trashmail.com",
    "yopmail.com",
    "throwaway.email",
  ];
  result["likelyDisposable"] = disposableHints.some((d) =>
    domain.toLowerCase().endsWith(d),
  );
  const freeProviders = [
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
  result["freeProvider"] = freeProviders.includes(domain.toLowerCase());
  return result;
}

router.post("/lookup", async (req, res) => {
  const raw = typeof req.body?.query === "string" ? req.body.query : "";
  const kind = detectKind(raw);
  const value = raw.trim();

  try {
    if (kind === "ip") {
      const data = await lookupIp(value);
      res.json({ kind, query: value, result: data });
      return;
    }
    if (kind === "coordinates") {
      const [latStr, lonStr] = value.split(/[, ]+/);
      const lat = Number(latStr);
      const lon = Number(lonStr);
      if (
        Number.isNaN(lat) ||
        Number.isNaN(lon) ||
        Math.abs(lat) > 90 ||
        Math.abs(lon) > 180
      ) {
        res.status(400).json({ error: "Coordinates out of range" });
        return;
      }
      const data = await lookupCoordinates(lat, lon);
      res.json({
        kind,
        query: value,
        result: { latitude: lat, longitude: lon, ...data },
      });
      return;
    }
    if (kind === "email") {
      const data = await lookupEmail(value);
      res.json({ kind, query: value, result: data });
      return;
    }
    res.status(400).json({
      error:
        "Unrecognized input. Enter an IP address (e.g. 8.8.8.8), coordinates (e.g. 37.4220, -122.0841), or an email address.",
    });
  } catch (err) {
    req.log.error({ err }, "Lookup failed");
    res.status(502).json({
      error: err instanceof Error ? err.message : "Lookup failed",
    });
  }
});

export default router;
