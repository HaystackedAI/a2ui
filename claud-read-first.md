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
- **Scope/sequencing (IMPORTANT — clarified by user). This is STAGED; do NOT jump to the
  final stack:**
  1. **NOW: faithfully rebuild the restaurant SAMPLE in `B:\a2ui2` — the WHOLE pipeline,
     both the React client AND the Python agent** (tiny step-by-step, user types, Claude
     teaches). Mirror the sample's tooling 1:1 — "whatever the sample uses, we use". Only
     deliberate deviations: **npm** (not yarn) and **standalone** (no monorepo workspace).
     The EXISTING monorepo agent is used only as a temporary backend to verify the client
     before we rebuild our own agent. Ground every choice in this doc / the sample.
  2. Then possibly rebuild a couple of OTHER samples to learn more.
  3. ONLY AFTER that, migrate toward the **final goal**: own **FastAPI/uv** backend +
     **AWS AgentCore** agents + **Gateway MCP**.
- **Decisions locked:** Transport = **A2A** (A2A-shaped parts; full JSON-RPC/agent-card
  envelope added when AgentCore needs it). No mock mode. **npm** (not yarn). **Single
  standalone React project** (no monorepo).
- **ARCHITECTURE PIVOT (2026-10-02, user directive): NO dev-only scaffolding.** Do NOT port
  the sample's Vite dev middleware (`middleware/a2a.ts`); do NOT install `@a2a-js/sdk`; do
  NOT use the monorepo ADK/Gemini agent even as a temporary backend. Rationale (user):
  "it's 2026, go prod directly — if need backend, build; if need cloud, fly; no local unless
  have to; use prod environment to develop." So Phase 3's "verify against monorepo agent"
  detour is DROPPED. We build our OWN backend now (the real target stack), bring it up
  minimal, grow it in place — nothing thrown away.
  Backend = **FastAPI + uv** at `B:\a2ui2\agent`: `POST /a2a` → **SSE** of A2A-shaped parts
  (`data: [{kind:'data', data:<a2ui msg>, mimeType:'application/a2ui+json'}]\n\n`) — exactly
  what `client.ts` already parses, so NO @a2a-js/sdk needed. CORS enabled. Client posts to
  `import.meta.env.VITE_A2A_URL ?? '/a2a'` (dev → http://localhost:8000/a2a). Run locally
  via `uv run` while building (that's the REAL binary, not a mock); deploy to **Fly** when
  cloud is wanted. Grow: hardcoded restaurant JSON → interactive turns → real agent +
  **AWS AgentCore** + **Gateway MCP**.
- **Repo layout:** client = `B:\a2ui2\a2ui_react` (Vite React-TS, DONE/scaffolded,
  blank app runs); agent (later) = `B:\a2ui2\agent` (planned).
- Progress: Phase 1 steps 1-4a DONE. Step 1: blank Vite React-TS app runs. Step 2:
  installed `@a2ui/react@0.12.0`, `@a2ui/web_core@0.12.0`, `@a2ui/markdown-it@0.2.0`
  (confirms "it's just npm"); removed a stray top-level `zod@4` (see §7). Step 3: added
  `import {basicCatalog} from '@a2ui/react/v0_9'` to `App.tsx` + `vite build` succeeded →
  versioned subpath import resolves/bundles standalone (bundle ~491KB).
  Step 4 (shell): `App.tsx` now creates `MessageProcessor<ReactComponentImplementation>([basicCatalog], actionCb)`,
  wraps in `MarkdownContext.Provider value={renderMarkdown}`, maps surfaces → `<A2uiSurface>`.
  Step 4a (first surface): inside the `useMemo` that builds the processor, we call
  `p.processMessages([...])` with a hardcoded 3-message toy surface (createSurface →
  updateComponents: root Column + one h1 Text bound to `{path:'/title'}` → updateDataModel
  `{title:'Hello from A2UI'}`). Renders "Hello from A2UI". `tsc -b` clean. Processing INSIDE
  useMemo means `surfacesMap` is populated before first render, so no reactivity needed yet.
  CORRECTION to §4: the real restaurant mock uses NO `beginRendering` — just the 3 messages.
  Step 4b (reactive surfaces) DONE: `App.tsx` now has `const [surfaces, setSurfaces] =
  useState(() => Array.from(processor.model.surfacesMap.values()))` (lazy init captures the
  surface made in useMemo) + a `useEffect` subscribing to `processor.onSurfaceCreated`
  (append) / `onSurfaceDeleted` (filter), cleanup calls `.unsubscribe()` (StrictMode-safe).
  Screen unchanged (Surfaces:1) but now re-renders when surfaces arrive AFTER first render.
  `tsc -b` clean. Full current App.tsx = reactive shell + hardcoded toy surface (lines 13-40
  are the THROWAWAY toy; replace when the real transport lands).
  Phase 2 transport DONE: `src/client.ts` created — `A2UIClient.send(message, onChunk)`:
  POSTs to `/a2a`, parses SSE (split on blank line, `data: ` prefix, JSON array of A2A
  parts), keeps `kind:'data'` as A2uiMessages, dedupes createSurface via `seenSurfaceIds`,
  non-streaming JSON fallback. Trimmed sample's unused `get ready()`. `tsc -b` clean.
  Nothing calls it yet + no `/a2a` endpoint, so it only compiles.
  Phase 2 wiring DONE: App.tsx rewritten — hardcoded toy REMOVED. Now: `A2UIClient` via
  useMemo; `sendRef` ref breaks the processor↔sendAndProcess cycle (action callback does
  `sendRef.current?.({version:'v0.9', action})`); `sendAndProcess(msg)` clears old surfaces
  then `client.send(msg, chunk => processor.processMessages(chunk))`, sets requesting/error;
  minimal search form (onSubmit only — NO per-keystroke send), spinner, error, surfaces map.
  Inline `config={title,placeholder}`. `tsc -b` clean. Clicking Send now POSTs /a2a → 404
  until the dev middleware exists (expected). Client-side loop is COMPLETE.
  Next (REVISED per pivot above) = build our own FastAPI/uv backend at `B:\a2ui2\agent`.
  Step B1: `uv init agent` + `uv add fastapi "uvicorn[standard]"`, minimal main.py with a
  health route, verify `uv run uvicorn ...` serves. Step B2: `POST /a2a` returns an SSE
  stream of the hardcoded restaurant-list A2UI messages (reuse shapes from sample
  `src/mock/restaurantMessages.ts`), add CORS. Step B3: tweak `client.ts` to use
  `VITE_A2A_URL`; run both; verify query → restaurant list renders. Step B4: handle the
  `book_restaurant` / `submit_booking` actions (form, confirmation). Later: real agent +
  AgentCore + Gateway MCP; deploy to Fly.
- **Working agreement (confirmed by user): "you teach, I work, you check."** The loop:
  Claude explains the next tiny step → the USER writes the code → Claude verifies
  (reads files, runs builds/lint/tests to check). Claude does NOT implement the learning
  code unless the user explicitly says "u do X" (fine for throwaway/verification bits like
  a smoke-test build). Keep steps TINY and verify each before moving on. User is learning.

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

## 6. THE PLAN (staged; user executes, Claude teaches)

### STAGE 1 — Faithful rebuild of the restaurant SAMPLE in B:\a2ui2 (DO THIS FIRST)
Goal: a working replica of `samples/client/react/shell`, outside the monorepo, same
behavior. Mirror the sample's choices; deviate only to use npm + standalone.

**Phase 1 — scaffold the client**
1. `npm create vite@latest <app> -- --template react-ts`
2. `npm install @a2ui/react @a2ui/web_core @a2ui/markdown-it zod`
3. `npm install -D @a2a-js/sdk` IF we keep the sample's dev A2A middleware (it runs in the
   Vite/Node dev server, NOT the browser bundle).
4. `vite.config.ts`: `@vitejs/plugin-react` + the A2A dev middleware (ported from the
   sample's `middleware/a2a.ts`), `server.port 5003`,
   `optimizeDeps.include:['@a2ui/react','react','react-dom']`. **Nothing A2UI-specific is a
   Vite plugin — the A2UI packages are ordinary runtime imports; the only custom Vite bit
   is the dev middleware that proxies `/a2a` to the agent.**

**Phase 2 — port the 4 real files + understand imports**
Copy/adapt `App.tsx`, `client.ts`, `configs/*`. DELETE `mock/*` and the `?mock=true`
branch (no mock). One real path: form submit / action → `client.send()` →
`processor.processMessages(chunks)` → `<A2uiSurface>` renders.

**Phase 3 — verify client against the EXISTING Python agent (temporary backend)**
Reuse `B:\a2ui\samples\agent\adk\restaurant_finder` (ADK + Gemini, port 10002). Run it per
its README (`uv run .`, set GEMINI_API_KEY). Dev middleware proxies `/a2a` → 10002.
Verify the full loop: query → restaurant list → "Book Now" → booking form → submit →
confirmation. This proves our client is correct before we rebuild the agent.

**Phase 4 — rebuild the AGENT in `B:\a2ui2` (uv), replace the monorepo one**
Rebuild the restaurant agent ourselves (study `samples/agent/adk/restaurant_finder`): it
receives A2A messages and emits A2UI `kind:'data'` parts (createSurface/updateComponents/
updateDataModel/beginRendering) over SSE, exposes an agent card at
`/.well-known/agent-card.json`, declares the A2UI A2A extension. Managed by **uv**. Point
the client's dev middleware at our agent instead of the monorepo one. Full pipeline now
lives in `B:\a2ui2`.

### STAGE 2 — (optional) rebuild a couple of OTHER samples to learn more
Targets decided by the user (e.g. another client renderer, the agent itself, a custom
catalog). Record each here as we go.

### STAGE 3 — Migrate toward the FINAL GOAL (only after Stages 1–2)
Replace the Python/ADK agent with the user's own **FastAPI (uv)** backend speaking A2A,
emitting A2UI `kind:'data'` parts over SSE. Start by returning the SAME restaurant JSON
(from the sample's old `mock/`) to prove the loop, then drive it with **AWS AgentCore**
agents; **Gateway MCP** tools supply restaurant data. Point the client transport at
FastAPI (Vite dev proxy or direct with CORS).

---

## 7. GOTCHAS / NOTES

- **ZOD VERSION TRAP (verified 2026-10-02):** A2UI 0.12 pins **zod `^3.25.76`** (it ships
  its own nested `zod@3.25.76` under `@a2ui/react` and `@a2ui/web_core`). The sample's
  `package.json` declares **no** zod. Do NOT run `npm install zod` — npm grabs zod **v4**
  (wrong major, breaking changes) at top level and creates a latent conflict. If our own
  code ever needs zod, pin `zod@^3.25.76`. (We hit this: removed the stray top-level
  zod@4; A2UI's own zod@3 is all that's needed.)
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
