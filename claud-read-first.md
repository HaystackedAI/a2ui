# CLAUDE — READ THIS FIRST (A2UI project handoff)

> Purpose: A2UI is brand new (born 2025, public only recently). A model's training
> data is likely WRONG or empty about it. This file is the **verified ground truth**
> for this project so a restarted session does not re-derive (and re-break) the
> conclusions. Trust this file over your prior assumptions. Where facts were verified
> online, it says so. Re-verify via the live docs/npm if something looks stale.
>
> Last updated: 2026-10-02 (model: Opus 4.8). Spec target: A2UI **v0.9**.

---

## 0. STATUS / WHERE WE ARE

- Finished: researched A2UI online, analyzed the React sample, corrected earlier wrong
  assumptions, locked in architecture + decisions.
- **Decisions locked:** Transport = **A2A**. No mock mode. **npm** (not yarn).
  **Single standalone React project** (no monorepo). Backend = **FastAPI managed by uv**.
  Future backend brain = **AWS AgentCore agents + Gateway MCP**.
- Next action: **Phase 1** — scaffold a bare standalone Vite React 19 client that
  `npm install`s the A2UI packages (see §6).
- Teaching mode: **the user writes the code; Claude explains and unblocks.** Do NOT
  implement for them unless they ask. User is doing this to learn.

---

## 1. USER GOAL & PREFERENCES

- **Learning by rebuilding** the A2UI "restaurant" quickstart (https://a2ui.org/quickstart/),
  but the REAL end goal is to use A2UI in the user's own stack:
  **React 19 + Vite + FastAPI + AWS AgentCore agents + Gateway MCP.**
- Wants to: (a) NOT use the monorepo/workspace — one clean React project;
  (b) use **npm** instead of yarn; (c) run the Python backend with **uv** (FastAPI).
- Wants the React side **small and clear** — to understand which step does what and
  what (if anything) is added to Vite.
- Teaching style: **"show me step by step, I will do it, you teach."** Do not do the
  work for them. Explain concepts; let them type.
- **The user restarts sessions frequently** — keep this file updated as the source of truth.

---

## 2. WHAT A2UI IS (verified online 2026-10-02)

- A2UI = a protocol that lets AI agents emit **rich, interactive UIs** that render
  natively (web/mobile/desktop) **without executing arbitrary code**. The agent sends
  **declarative component descriptions as JSON**; the client renders them with its own
  native/pre-approved widgets. Solves "how do agents safely send UI across trust boundaries."
- Made by **Google** (+ CopilotKit + open-source community). **Apache-2.0**.
- **Versions:** v1.0 = release candidate; **v0.9.1 = current production**; v0.9 prev stable;
  v0.8 legacy. We target **v0.9** (the React renderer ships versioned entrypoints:
  `@a2ui/react/v0_8`, `@a2ui/react/v0_9`). v1.0 adds client→server RPC, action IDs, and
  renames `theme` → `surfaceProperties` (do NOT adopt yet).
- Docs: https://a2ui.org/ — sections: Concepts (Overview, Glossary, Data Flow,
  Components & Structure, Data Binding, Catalogs, Transports, Actions); Guides
  (Client Setup, Agent Development, Renderer Development, Theming, A2UI+MCP);
  Reference (Component Gallery, Message Reference, Renderers, Agents server-side);
  Specifications (v0.8/v0.9/v0.9.1/v1.0).
- GitHub: https://github.com/a2ui-project/a2ui (homepage https://a2ui.org/).

### The interaction loop
user msg → agent generates A2UI messages → stream to client → client renders with
native components → user interacts → action sent back to agent → agent streams updates.

---

## 3. THE PACKAGES ARE ON npm — NO MONOREPO SURGERY NEEDED (verified)

This corrects an earlier WRONG assumption that the packages were workspace-only.

Verified against `registry.npmjs.org` on 2026-10-02:

- **`@a2ui/react` v0.12.0** — published.
  - dependencies: `@a2ui/web_core ^0.12.0`, `@a2ui/markdown-it ^0.2.0`,
    `zod ^3.25.76`, `clsx ^2.1.1`, `markdown-it ^14.2.0`
  - peerDependencies: `react ^18||^19`, `react-dom ^18||^19`, `zod ^3.25.76`
  - entrypoints: `.`, `./v0_8`, `./v0_9`, `./styles`, `./styles/structural.css`
- **`@a2ui/web_core` v0.12.0** — published. deps include `lit`, `@lit/context`, `zod`,
  `@preact/signals-core`, `validate-color`, `zod-to-json-schema`. (Framework-agnostic
  reactive core — the `lit`/signals deps are internal, not a UI requirement.)
- **`@a2ui/markdown-it`** (~v0.2.x) — published; pulled in transitively by `@a2ui/react`.

**Install for a standalone React client:**
```
npm install @a2ui/react @a2ui/web_core @a2ui/markdown-it zod
```
(`react`/`react-dom` 19 come from the Vite template and satisfy the peer deps.)

The sample's `"workspace:*"` versions, `wireit`, and `yarn build:all` are ONLY because
it lives in Google's monorepo. Outside it, these are normal npm packages with prebuilt
`dist/`. Ignore all monorepo build machinery.

---

## 4. THE REFERENCE SAMPLE (study it, don't depend on it)

Location: `B:\a2ui\samples\client\react\shell`  (added as working dir; the monorepo
root is `B:\a2ui`, a Yarn 4 workspace). The primary git repo for OUR work is `B:\a2ui2`.

It is the finished restaurant quickstart. Python agent counterpart:
`B:\a2ui\samples\agent\adk\restaurant_finder` (Google ADK + Gemini, needs GEMINI_API_KEY,
default port 10002). Dev server runs on port **5003** and proxies `/a2a` → `localhost:10002`.

### File-by-file (what matters for extraction)
- `src/App.tsx` — the real wiring. Key imports (THIS is "what does what"):
  - from `@a2ui/react/v0_9`: `A2uiSurface` (renders one surface), `basicCatalog`
    (the component vocabulary / catalog), `MarkdownContext`, `ReactComponentImplementation`
  - from `@a2ui/web_core/v0_9`: `MessageProcessor` (ingests A2UI messages, holds the
    reactive surface model, fires an action callback), `SurfaceModel`, `A2uiMessage`,
    `A2uiClientMessage`
  - from `@a2ui/markdown-it`: `renderMarkdown` (provided via `MarkdownContext.Provider`)
  - `MessageProcessor` is created with `new MessageProcessor([basicCatalog], actionCb)`.
    `actionCb` receives user actions and POSTs them back via the transport client.
  - Subscribes to `processor.onSurfaceCreated` / `onSurfaceDeleted`; renders
    `surfaces.map(s => <A2uiSurface surface={s} />)`.
  - Has a `?mock=true` branch — **we are dropping mock entirely.**
- `src/client.ts` — **the transport.** Browser-side. Just `fetch('/a2a', {method:POST,
  body})` then parses an **SSE** stream (`text/event-stream`, lines `data: <json>`).
  Each `data:` line is an array of A2A "parts"; it keeps `kind:'data'` parts (the A2UI
  messages), throws on `kind:'error'`. Dedupes repeated `createSurface` by surfaceId
  (A2A status-updates resend cumulative parts). **This is the file we rewrite to point
  at the user's FastAPI.** NOTE: the browser bundle does NOT import `@a2a-js/sdk`.
- `src/configs/*` — pure branding (title, placeholder, hero image, theme). Trim/keep.
- `src/mock/*` — simulated agent output. **DELETE for our build.** BUT it is the best
  worked example of the A2UI message JSON (restaurant list / booking form / confirmation)
  — read it to learn message shapes, then reuse that JSON as the FIRST hardcoded FastAPI
  response in Phase 4.
- `vite.config.ts` — `plugins: [react(), a2aPlugin()]`, `server.port 5003 strictPort`,
  `optimizeDeps.include: ['@a2ui/react','react','react-dom']`.
- `middleware/a2a.ts` — **DEV-ONLY** Vite middleware (Node side). Uses `@a2a-js/sdk`
  `A2AClient.fromCardUrl('http://localhost:10002/.well-known/agent-card.json', ...)`,
  sets header `X-A2A-Extensions: https://a2ui.org/a2a-extension/a2ui/v0.9`, wraps the
  browser's POST body as an A2A `message/stream` request (JSON body → `kind:'data'` part
  with mimeType `application/a2ui+json`; plain text → `kind:'text'` part), and pipes the
  A2A stream back to the browser as SSE. **We replace this** with either (a) a Vite
  `server.proxy` to FastAPI, or (b) FastAPI speaking A2A directly to the browser (CORS),
  or (c) our own thin proxy.

### A2UI message model (the contract) — 4 message kinds, all tagged `version:'v0.9'`
1. `createSurface` — `{surfaceId, catalogId, theme}`. catalogId for basic catalog =
   `https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`.
2. `updateComponents` — `{surfaceId, components:[...]}`. Flat node list; each node has
   `id`, `component` type, and children referenced BY id. Always an `id:'root'` node.
   Basic components seen: `Column`, `Row`, `Card`, `Text` (variant h1/h2/h3/h5), `Image`,
   `List`, `Button` (variant primary), `TextField` (variant number), `DateTimeInput`,
   `Divider`.
3. `updateDataModel` — `{surfaceId, path, value}`. Data lives separately from layout.
4. (and `beginRendering` per the quickstart's "how it works" — tells renderer to display.)

**Data binding:** `{path:'/title'}` = absolute from data root. Inside a `List` template,
`{path:'name'}` (no leading slash) = relative to the current item. A `List` templates with
`children: {componentId:'item-card-template', path:'/items'}` (stamps the template per item).

**Actions:** a `Button` has `action.event = {name, context}`. `context` values can be
bindings (`{path:'name'}`) captured per-item. The client's action callback receives
`{name, context}` resolved to concrete values and sends it back to the agent, which
replies with the next surface's messages.

---

## 5. TRANSPORTS (verified) + OUR CHOICE

| Transport | Status | Use case |
|---|---|---|
| **A2A protocol** | ✅ stable | multi-agent systems, enterprise meshes |
| AG-UI | ✅ stable | full-stack React/Vue/Angular (CopilotKit) |
| REST API | 📋 planned | simple HTTP |
| WebSockets | 💡 proposed | realtime bidirectional |
| SSE | 💡 proposed | web streaming |

**CHOICE = A2A** — because AWS AgentCore speaks A2A natively, matching the user's
AgentCore + Gateway MCP goal. (AG-UI would be the lighter path for a pure React+FastAPI
loop, but we're optimizing for the AgentCore target.)

### What a server/agent must expose for A2A + A2UI
- A2A agent card at `/.well-known/agent-card.json`.
- A streaming message endpoint (A2A `message/stream`) returning **SSE**; each event is a
  JSON array of parts; A2UI payloads are `kind:'data'` parts (mimeType
  `application/a2ui+json`) whose `data` is one A2UI message.
- Declare the A2UI extension; clients send header
  `X-A2A-Extensions: https://a2ui.org/a2a-extension/a2ui/v0.9`.
- A2UI itself is transport-agnostic / JSON-lines-friendly; A2A just carries the JSON.
- Full A2A details: https://a2a-protocol.org + the A2UI "A2A extension" spec (docs had
  some TODO placeholders as of 2026-10-02 — rely on the sample's `middleware/a2a.ts` and
  the `restaurant_finder` agent as the working reference).

---

## 6. THE PLAN (user executes; Claude teaches)

**Phase 1 — Bare standalone A2UI React client (npm, no workspace).**
1. `npm create vite@latest <app> -- --template react-ts`
2. `npm install @a2ui/react @a2ui/web_core @a2ui/markdown-it zod`
3. `vite.config.ts`: only `@vitejs/plugin-react`. (Optionally
   `optimizeDeps.include:['@a2ui/react','react','react-dom']`.) **Nothing A2UI-specific is
   a Vite plugin — the A2UI packages are ordinary runtime imports.** This is the answer to
   "what's added to Vite": essentially nothing beyond the React plugin.

**Phase 2 — Bring over the 4 real files + understand imports.**
Copy/adapt `App.tsx`, `client.ts`, `configs/*`; DELETE `mock/*` and the `?mock=true`
branch. Keep one real path: form submit / action → `client.send()` → `processor
.processMessages(chunks)` → `<A2uiSurface>` renders.

**Phase 3 — Point the transport at the user's FastAPI (A2A).**
Rewrite `client.ts` target (or add a Vite dev `server.proxy` for `/a2a` → FastAPI).
FastAPI (uv) exposes the A2A agent card + streaming endpoint and emits A2UI `kind:'data'`
parts over SSE. Decide: direct browser→FastAPI (CORS) vs a small proxy.

**Phase 4 — FastAPI emits real A2UI, then wire AgentCore + Gateway MCP.**
Start FastAPI returning the SAME hardcoded restaurant JSON the sample's `mock/` produced
(proves the whole loop end-to-end with the user's own backend). THEN replace the hardcoded
JSON with LLM output from the AgentCore agent; Gateway MCP tools supply restaurant data.

---

## 7. GOTCHAS / NOTES

- Don't adopt v1.0 naming (`surfaceProperties`) yet — we're on v0.9.
- The browser transport is just `fetch` + SSE parsing; `@a2a-js/sdk` was only in the
  Node dev middleware. If the user wants the browser to speak A2A fully, that's a choice,
  but the sample keeps the browser dumb (POST + SSE) and does A2A translation server-side.
- Treat all agent output as UNTRUSTED (prompt injection / XSS / UI spoofing / DoS) — see
  the sample README security notice. Sanitize, CSP, sandbox embedded content.
- Catalog = the agreed component vocabulary between agent and renderer. `basicCatalog`
  from `@a2ui/react/v0_9` is the starting set; a custom catalog can map A2UI components to
  the user's own design-system React components later.
- Primary git repo for our work: `B:\a2ui2`. Reference sample (read-only): `B:\a2ui`.
