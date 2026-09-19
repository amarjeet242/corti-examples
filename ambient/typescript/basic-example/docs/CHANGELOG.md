# Change and troubleshooting log

## 2026-09-19 — Single-workspace Ambient Scribe

### Changed

- Replaced the separate consultation, facts, and document pages with one responsive consultation workspace (`index.html`, `app.css`, and `app.js`). The old `facts.html` and `document.html` now redirect to the workspace so existing bookmarks do not show obsolete screens.
- Added a recording dock, live/ready status indicators, elapsed timer, visual audio waves, transcript timeline, editable fact cards, and document preview/actions to match the provided reference's information hierarchy without copying its branding or patient content.
- Added local add/edit/remove fact controls. Reviewed facts are sent to document generation so edits affect the generated note; changes remain only in this browser tab and are not written back to Corti Facts yet.
- Kept Template and Settings controls visible but inactive. Patient-record saving remains disabled until the relevant workflow, patient matching, authorization, and audit requirements are defined.
- Updated the Stream client to use the SDK's default configuration handshake. Recording begins only after `connect()` returns, which means Corti has accepted the configuration.
- Added a project `.gitignore`, a cross-platform `npm run clean`, this change log, and an updated README.

### Security and privacy decisions

- Kept client credentials on the Express server. The browser receives a token limited to the `streams` WebSocket scope, never a client secret or full-scope service token.
- Added generic API errors and removed raw provider errors and consultation contents from server logs.
- Added request-size, interaction-ID, fact-count, text-length, and fact-group validation before document generation.
- Added CSP, anti-framing, no-referrer, no-sniff, and restricted permissions headers. The CSP permits only the local application plus Corti HTTPS/WSS endpoints needed for streaming.
- Kept drafts in `sessionStorage`, not persistent storage. A new consultation clears the current tab's previous draft; closing the tab clears it as well.

### Verification checkpoints

1. Run `npm install` then `npm run build`; the TypeScript server and browser bundle should build.
2. Run `npm run dev` and open `http://localhost:3000`; the single consultation UI should load without credentials.
3. Without valid `.env` values, clicking **Start recording** must return only the configuration error and must not reveal a secret or provider response.
4. With valid sandbox credentials, allow microphone access, start/stop a recording, confirm transcript/facts render, edit a fact, and generate a note.
5. Confirm a direct visit to `/facts.html` or `/document.html` returns to the workspace.

### Troubleshooting

| Symptom | Likely cause | Check / resolution |
| --- | --- | --- |
| Start button reports missing credentials | `.env` is absent or contains example values | Copy `.env.example` to `.env`; fill the tenant, client ID, secret, and environment. Do not commit `.env`. |
| Browser does not ask for microphone | Site was not served from `localhost`/HTTPS, or permission was denied | Use `http://localhost:3000`; reset the browser's microphone permission and try again. |
| Session cannot start after microphone approval | Stream scope, tenant, or environment is invalid | Verify credentials and that the backend can mint a `streams` scoped token. |
| No transcript or facts appear | Audio is silent or the Stream configuration was not accepted | Inspect non-sensitive browser diagnostics; verify microphone input and Corti Stream access. |
| Generated note ignores an edit | The fact was not left in the field before Generate, or the generation call failed | Confirm the edited text remains visible; retry Generate. The UI submits reviewed fact text to the server. |
| Document generation fails | No usable facts, or Documents API/template access is missing | Add/review a fact, then verify the tenant can generate the configured template sections. |
| A legacy bookmark shows a bare page | It points to `facts.html` or `document.html` | Those pages intentionally redirect to `index.html`; update the bookmark when convenient. |

### Follow-up work deliberately deferred

- Template selection and template discovery.
- Authenticated users and patient-record persistence.
- Auditable fact write-back/discard workflows using Corti's Facts update endpoints.
- Clinical testing, accessibility review with users, data-retention policy, and production security review.
