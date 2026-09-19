# Ambient Scribe — single-workspace prototype

This local Corti ambient-consultation prototype combines recording, live transcription, fact review/editing, and document generation in one responsive workspace.

It is a prototype only. Do not use it for real patient care or enter patient-identifiable information without completing your organisation's privacy, security, clinical-safety, and data-governance review.

## What works

- Start and end a single-microphone Corti Stream session.
- Display live transcript events and extracted facts.
- Review, add, remove, and edit local facts before document generation.
- Generate a document from the reviewed facts.
- Copy or download the resulting local note.

The Template and Settings controls are visual placeholders. Saving to a patient record is intentionally disabled.

## Run locally

Requires Node.js 18+ and Corti credentials with access to the Stream, Facts, and Documents APIs.

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Set these values in `.env` (which is ignored by Git):

```dotenv
CORTI_TENANT_NAME=your_tenant_name
CORTI_CLIENT_ID=your_client_id
CORTI_CLIENT_SECRET=your_client_secret
CORTI_ENVIRONMENT=eu
PORT=3000
```

Visit `http://localhost:3000`. If credentials are absent, the interface still loads, while recording and document generation return a safe configuration error.

## Security model

- Client credentials and the full-scope `CortiClient` remain on the server.
- `/api/start-session` returns only a token scoped to `streams` for browser WebSocket use.
- The server validates interaction IDs, limits JSON request bodies to 64 KB, bounds submitted facts, and returns generic failures rather than provider error details.
- The app sets a restrictive CSP, disables `X-Powered-By`, prevents framing, limits browser permissions to the local microphone, and omits referrers.
- Prototype transcript, fact, and document drafts use `sessionStorage` only. They clear when the tab closes and when a new consultation starts.

For production, add authenticated users, tenant-aware authorization, clinical audit logging, rate limiting, TLS, retention controls, consent/recording indicators, and a server-side Corti proxy where appropriate. Corti's [JavaScript proxy guide](https://docs.corti.ai/sdk/js/proxy) and [security guidance](https://docs.corti.ai/authentication/security_best_practices) describe the backend-owned credential model.

## File map

```text
index.html         Single-page structure
app.css            Responsive visual system
app.js             UI state, local fact editing, document controls
client.ts          Corti Stream WebSocket and microphone lifecycle
audio.ts           Audio capture utilities
server.ts          Credential boundary, API routes, document generation
shared.js          Tab-scoped draft store
docs/CHANGELOG.md  Change and troubleshooting log
```

`facts.html` and `document.html` are compatibility redirects to `index.html`; they may be removed once old bookmarks are retired.

## Build

```powershell
npm run build
npm start
```

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for implementation decisions and troubleshooting notes.
