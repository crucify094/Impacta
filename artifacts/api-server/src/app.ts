import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Lightweight root healthcheck for Railway (and any other PaaS) — responds
// immediately without touching the API stack so deploys go healthy fast.
app.get("/healthz", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

// In production, serve the built frontend (impacta-osint) as static files
// with SPA fallback so the same service hosts both the site and the API.
const candidates = [
  path.resolve(process.cwd(), "artifacts/impacta-osint/dist/public"),
  path.resolve(__dirname, "../../impacta-osint/dist/public"),
  path.resolve(__dirname, "../../../impacta-osint/dist/public"),
];
const staticDir = candidates.find((p) => fs.existsSync(path.join(p, "index.html")));

if (staticDir) {
  logger.info({ staticDir }, "Serving frontend static files");
  app.use(
    express.static(staticDir, {
      index: false,
      maxAge: "1h",
      setHeaders: (res, filePath) => {
        if (/\.(js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/i.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
} else {
  logger.warn("No frontend build found — serving API only");
}

export default app;
