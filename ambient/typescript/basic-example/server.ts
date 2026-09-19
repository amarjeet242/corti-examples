/**
 * Server boundary for the Ambient Scribe prototype.
 *
 * Client credentials are kept here. The browser receives only a short-lived,
 * streams-scoped token after an interaction has been created.
 */
import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { CortiAuth, CortiClient, type Corti } from "@corti/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TENANT_NAME = process.env.CORTI_TENANT_NAME ?? "YOUR_TENANT_NAME";
const CLIENT_ID = process.env.CORTI_CLIENT_ID ?? "YOUR_CLIENT_ID";
const CLIENT_SECRET = process.env.CORTI_CLIENT_SECRET ?? "YOUR_CLIENT_SECRET";
const CORTI_ENV = process.env.CORTI_ENVIRONMENT ?? "eu";
const parsedPort = Number(process.env.PORT ?? 3000);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 3000;
const MAX_FACTS = 100;
const MAX_FACT_LENGTH = 4000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isConfigured = ![TENANT_NAME, CLIENT_ID, CLIENT_SECRET].some(function (value) {
  return value.startsWith("YOUR_");
});

const client = new CortiClient({
  environment: CORTI_ENV,
  tenantName: TENANT_NAME,
  auth: { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET },
  analytics: { examples_repo: "ambient/typescript/basic-example" },
});

function rejectIfUnconfigured(res: Response) {
  if (isConfigured) return false;
  res.status(503).json({ error: "Corti credentials have not been configured on the server." });
  return true;
}

function validInteractionId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function safeText(value: unknown, maximum: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maximum);
}

function reviewedFacts(value: unknown): Corti.FactsContext[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_FACTS).map(function (fact) {
    var input = fact && typeof fact === "object" ? fact as { text?: unknown; group?: unknown } : {};
    var text = safeText(input.text, MAX_FACT_LENGTH);
    var group = safeText(input.group, 80).replace(/[^a-z0-9_-]/gi, "-").toLowerCase() || "other";
    return { text: text, group: group, source: "user" } as Corti.FactsContext;
  }).filter(function (fact) { return Boolean(fact.text); });
}

async function createInteraction() {
  return client.interactions.create({
    encounter: { identifier: randomUUID(), status: "planned", type: "first_consultation" },
  });
}

async function getScopedStreamToken() {
  const auth = new CortiAuth({ environment: CORTI_ENV, tenantName: TENANT_NAME });
  return auth.getToken({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, scopes: ["streams"] });
}

const app = express();
app.disable("x-powered-by");
app.use(function (_req, res, next) {
  res.set({
    "Content-Security-Policy": "default-src 'self'; connect-src 'self' https://*.corti.app wss://*.corti.app; img-src 'self' data:; media-src 'self' blob:; style-src 'self'; script-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=(self)",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  next();
});
app.use(express.json({ limit: "64kb" }));
// tsx runs this file from the project directory; the compiled server lives in
// dist/. Resolve the static root correctly for both modes.
const publicDirectory = path.basename(__dirname) === "dist" ? path.join(__dirname, "..") : __dirname;
app.use(express.static(publicDirectory, { index: "index.html" }));

app.post("/api/start-session", async function (_req, res) {
  if (rejectIfUnconfigured(res)) return;
  try {
    const interaction = await createInteraction();
    const streamToken = await getScopedStreamToken();
    // No client secret or full-scope access token is included in the response.
    res.json({ interactionId: interaction.interactionId, tenantName: TENANT_NAME, environment: CORTI_ENV, accessToken: streamToken.accessToken });
  } catch (_error) {
    // Do not return provider errors, request payloads, or credentials to the browser.
    console.error("Unable to create a Corti streaming session.");
    res.status(502).json({ error: "Could not start the Corti streaming session." });
  }
});

app.post("/api/create-document", async function (req, res) {
  if (rejectIfUnconfigured(res)) return;
  const interactionId = req.body && req.body.interactionId;
  if (!validInteractionId(interactionId)) {
    res.status(400).json({ error: "A valid consultation session is required." });
    return;
  }
  try {
    let factsContext = reviewedFacts(req.body.facts);
    if (!factsContext.length) {
      const result = await client.facts.list(interactionId);
      factsContext = result.facts.map(function (fact) {
        return { text: fact.text, group: fact.group, source: fact.source } as Corti.FactsContext;
      }).filter(function (fact) { return Boolean(fact.text); });
    }
    if (!factsContext.length) {
      res.status(422).json({ error: "At least one fact is required to generate a document." });
      return;
    }
    const document = await client.documents.classic.create(interactionId, {
      context: [{ type: "facts", data: factsContext }],
      // Template selection is intentionally kept server-owned until its workflow is planned.
      template: { sections: [{ key: "corti-hpi" }, { key: "corti-allergies" }, { key: "corti-social-history" }, { key: "corti-plan" }] },
      outputLanguage: "en",
      name: "Consultation Document",
      documentationMode: "routed_parallel",
    });
    res.json({ document: document });
  } catch (_error) {
    console.error("Unable to generate a Corti document.");
    res.status(502).json({ error: "Could not generate the consultation document." });
  }
});

app.use(function (error: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) {
  if (error.type === "entity.too.large") {
    res.status(413).json({ error: "Request data is too large." });
    return;
  }
  console.error("Unexpected request processing error.");
  res.status(400).json({ error: "The request could not be processed." });
});

app.listen(PORT, function () {
  console.log(`Ambient Scribe listening on http://localhost:${PORT}`);
  if (!isConfigured) console.warn("Corti credentials are missing; recording and document generation will remain unavailable.");
});
