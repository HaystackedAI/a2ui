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
  Backend = **FastAPI** project at `B:\a2ui2\a2ui_fastapi` (NOT `agent/` — user scaffolded
  via FastAPI CLI: `fastapi[standard]>=0.142.2`, py>=3.13, entry `main.py` with `app`).
  **Already DEPLOYED to FastAPI Cloud: https://a2ui-61cd4406.fastapicloud.dev/** (root
  returns Hello World, HTTP 200). **CI/CD is set up: `git push` auto-deploys.**
  **BACKEND LOCALHOST IS BANNED (user directive).** No `uv run fastapi dev`, no :8000, ever.
  Loop = edit main.py → `git push` → CI/CD deploys → test the CLOUD URL (curl / browser).
  The ONLY localhost is the FRONTEND Vite dev server on **:5173** (Vite default; our
  vite.config has no port override — NOT the sample's 5003). CORS must allow
  http://localhost:5173 (currently `allow_origins=["*"]`). Plan: `POST /a2a` → **SSE** of
  A2A-shaped parts
  (`data: [{kind:'data', data:<a2ui msg>, mimeType:'application/a2ui+json'}]\n\n`) — exactly
  what `client.ts` already parses, so NO @a2a-js/sdk needed. CORS enabled (client is
  cross-origin). Backend URL lives in `a2ui_react/src/config.ts` as `export const A2A_URL`
  (committed, non-secret — the React analog of Python config.py; user chose this over Vite
  .env/import.meta.env, which are reserved for secrets & per-env build values). client.ts
  imports A2A_URL and fetches it directly. NO .env file.
  Grow: hardcoded restaurant JSON → interactive turns → real agent +
  **AWS AgentCore** + **Gateway MCP**. (Deploy target is FastAPI Cloud, not Fly.)
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
  Step B2a DONE + DEPLOYED + VERIFIED: `POST /a2a` in `a2ui_fastapi/main.py` — CORSMiddleware
  (allow_origins=["*"]), reads+logs body, returns StreamingResponse(media_type
  text/event-stream) yielding ONE event `data: [3 parts]\n\n`; each part
  `{kind:'data', data:<a2ui msg>, mimeType:'application/a2ui+json'}` carrying the "Hello from
  FastAPI" toy (createSurface/updateComponents: Column+h1 Text bound /title/updateDataModel).
  Curl confirmed: HTTP 200, Content-Type text/event-stream, ACAO:* on POST + OPTIONS
  preflight (allows POST). helper `_part()`, `hello_surface()`. Root `/` still Hello World.
  Step B3 DONE (client wiring): `a2ui_react/src/config.ts` exports `A2A_URL =
  'https://a2ui-61cd4406.fastapicloud.dev/a2a'`; client.ts imports it + `fetch(A2A_URL,...)`.
  `.env` deleted. tsc clean. (Had a false start: user's `.env` used non-VITE_ name + missing
  /a2a path → import.meta.env undefined → fetched localhost:5173/a2a → 404; replaced by
  config.ts.) B3 VERIFIED: Send → "Hello from FastAPI" renders over the network. FULL LOOP
  (browser → FastAPI Cloud → SSE → render) PROVEN.
  Step B2b DONE + DEPLOYED + CURL-VERIFIED (cloud /a2a → 3 parts, title "Top 5 Chinese
  Restaurants in New York", 5 items): main.py serves the full restaurant
  list via `restaurant_list_surface()` — 3 messages faithful to sample
  `createRestaurantListMessages`. DATA SPLIT (user request): the 5 restaurants live in
  `a2ui_fastapi/datasource/restaurant_list.py` as `RESTAURANTS` (datasource/ is a namespace
  package — NO __init__.py needed on py3.13); main.py keeps only A2UI message-building.
  IMPORT GOTCHA (hit + fixed): the app loads as `main:app` with CWD = a2ui_fastapi, so the
  import MUST be `from datasource.restaurant_list import RESTAURANTS` — NOT
  `from a2ui_fastapi.datasource...` (that → ModuleNotFoundError: No module named
  'a2ui_fastapi', because the project root is the CWD, not an importable package above it).
  Verified `uv run python -c "import main"` → OK, 5 restaurants. Introduces the `List` template: `item-list` List
  `children:{componentId:'item-card-template', path:'/items'}` stamps the Card template per
  item; RELATIVE bindings inside template (`{path:'name'}` = current item) vs ABSOLUTE
  (`{path:'/title'}`); each `template-book-button` fires action `book_restaurant` with context
  captured per-item ({restaurantName,imageUrl,address} as {path:...}). Endpoint still ignores
  body + always returns the list. hello_surface() removed.
  RULE RE-AFFIRMED MID-B4: strict teach/type — Claude shows code + explains, USER types,
  Claude verifies. (Claude drifted into writing files; user corrected "you don't write, you
  teach, i type"; reverted. "you fix"/"you help/you do" are explicit one-off opt-ins only.)
  Step B4 DONE + VERIFIED (offline), awaiting deploy: `/a2a` is now INTERACTIVE. main.py has
  3 surface builders (restaurant_list_surface, booking_form_surface(restaurantName,imageUrl,
  address), confirmation_surface(name,partySize,reservationTime,dietary,imageUrl)) + a
  `handle(body)` dispatch: json.loads(body); if dict has `action` → branch on action.name
  ('book_restaurant'→booking-form, 'submit_booking'→confirmation); else → list. endpoint
  streams `handle(body)`. Action context arrives already-resolved to concrete values by the
  client MessageProcessor. booking-form uses TextField/DateTimeInput two-way bound to the data
  model (value:{path:/x}); submit button captures those back into its action context. Distinct
  surfaceIds default/booking-form/confirmation; client deletes all surfaces each turn so only
  the newest shows. Verified via `uv run python -c import main`: text→default, book→booking-
  form "Book a Table at RedFarm", submit→confirmation "Booking Confirmed... 4 people at ...".
  NOTE: user hand-edited the list title to "COA" (was "Top 5 Chinese Restaurants in New York")
  — their edit, preserved verbatim through the refactor; lives in `screens.restaurant_list`.
  REFACTOR DONE (user: "you do the refactor", prod-structure directive — see §0.5): the 3
  inline Python surface builders were REMOVED from main.py and re-expressed as:
    - `a2ui_fastapi/screens/v0_9/{restaurant_list,booking_form,confirmation}.json` — STATIC
      layout only (createSurface + updateComponents + bindings); the "UI contract" assets.
      (Checked the sample agent `samples/agent/adk/restaurant_finder`: it stores screens the
      same way, as `examples/0.9/*.json`, used as LLM few-shot prompt examples — so storing
      ours as JSON is forward-compatible with the Stage-3 LLM agent.)
    - `a2ui_fastapi/screens/__init__.py` — assembly interface: `_layout(name)` loads+parses a
      JSON asset (lru_cache on raw text, fresh parse per call so callers can't mutate cache),
      `_data_model(surfaceId, value)` builds the runtime updateDataModel; public fns
      `restaurant_list(restaurants)`, `booking_form(name,img,addr)`,
      `confirmation(name,partySize,time,dietary,img)` = layout + data model.
    - `datasource/restaurant_list.py` — RESTAURANTS (unchanged).
    - `main.py` — now THIN: CORS + `handle(body)` dispatch (routes to screens.*) + `/a2a` +
      root. Path resolution uses `Path(__file__).parent/"v0_9"` (CWD-independent; ships in the
      deploy). Verified offline: text→default(5 items,title "COA"), book→booking-form "Book a
      Table at RedFarm", submit→confirmation "...4 people at 2026-10-05 19:00". Behavior
      preserved. NOT yet deployed.
  DEPLOYED + BROWSER-VERIFIED (full loop): user walked search→list→Book Now (Xi'an Famous
  Foods)→booking-form (prefilled name+address, partySize 2)→Submit (picked datetime
  2026-10-09T13:36, left dietary blank)→confirmation "Booking Confirmed at Xi'an Famous Foods
  / 2 people at 2026-10-09T13:36 / No dietary requirements specified / We look forward...".
  Two-way-bound fields + submit_booking context + the dietary else-branch all confirmed live.
  ===> STAGE 1 COMPLETE: full A2UI pipeline rebuilt in user's own React+FastAPI stack,
  deployed (FastAPI Cloud + CI/CD), production structure. <===
  (Aside: the restaurant `infoLink` "More Info" markdown renders via @a2ui/markdown-it's
  `renderMarkdown` = markdown-it + DOMPurify sanitize [node_modules/@a2ui/markdown-it/src/
  markdown.js: render then sanitize]; clicking navigates to the external site. User said
  don't worry about link behavior for now. Possible later hardening: target=_blank/noopener.)
  ***TARGET CLARIFIED (user, 2026-10-02): the immediate TARGET is to CLONE ALL FUNCTIONS OF
  THE SAMPLE (restaurant demo: client + agent) in our stack. AgentCore + Gateway MCP is the
  LONG-TERM GOAL, NOT the target — deferred. Do not conflate.***
  So our hardcoded `handle()` is a PLACEHOLDER, not the finished agent. To hit target we must
  clone `samples/agent/adk/restaurant_finder`'s FUNCTIONS in FastAPI. Function inventory:
   CLIENT (mostly done): search→query ✓; render list ✓; Book Now→form ✓; Submit→confirmation
     ✓; markdown/More Info ✓. STILL MISSING on client: two-column list rendering for >5
     results; (deliberately skipped chrome: dark-mode toggle, loading-text rotation, hero
     image, mock badge — revisit only if "all functions" includes them).
   AGENT (NOT cloned — only a hardcoded stand-in): (a) A2A server + agent card; (b)
     `get_restaurants` tool that extracts cuisine/location/count from the query + returns
     matching data (we always return the same 5); (c) LLM-GENERATED A2UI from basic-catalog
     schema + example templates (examples/0.9/*.json) + selection RULES; (d) ≤5 →
     single_column_list, >5 → two_column_list (we only have single-col); (e) booking_form on
     book intent, confirmation on submit; (f) optional text-only mode (get_text_prompt).
  AGENT DECISION RESOLVED (2026-10-02): faithful LLM clone, provider = GEMINI (user has key),
  SINGLE client-facing FastAPI Cloud container (evolve a2ui_fastapi; NO separate gateway yet).
  Scope CUTS (user): SKIP two-column list + all skipped chrome (dark-mode/loading-text/hero/
  mock-badge) — don't help Final Goal.
  *** DEPENDENCY WALL (the "unless cannot") ***: `a2ui-agent-sdk` 0.7.0 IS on PyPI (import
  `a2ui`) BUT hard-depends on `google-adk`, which pins `opentelemetry-sdk<1.43`, while
  `fastapi[standard]` 0.142.2 (FastAPI Cloud) needs `opentelemetry-sdk>=1.44` → UNSOLVABLE.
  So we CANNOT use a2ui-agent-sdk / google-adk / a2a-sdk in this FastAPI project.
  RESOLUTION (REVISED — user: don't degrade to bare genai, that throws away agent architecture;
  use STRANDS now = the real endgame framework): AGENT FRAMEWORK = **Strands Agents SDK**
  (`strands-agents`), NOT ADK, NOT bare genai. Verified on PyPI (v1.57.2, py>=3.10):
   - opentelemetry-sdk pinned `>=1.30,<2.0` → COMPATIBLE with fastapi[standard]'s >=1.44 (ADK
     capped <1.43 — THAT was the wall; Strands clears it).
   - native Gemini via `strands-agents[gemini]` (google-genai); your key works.
   - native A2A via `strands-agents[a2a]` (a2a-sdk+starlette+uvicorn) — A2A kept as 1st-class.
   - AgentCore via strands-agents-tools `bedrock-agentcore` extras → Strands-now IS the AgentCore
     on-ramp. Strands runs as a lib inside our FastAPI Cloud container now; → AgentCore later,
     same agent code.
  Principle reaffirmed by user: code can be simple, but structure/architecture = production
  (keep the agent framework + A2A; sample uses A2A "for a reason" even if simple demo needn't).
  Clone the sample's BUSINESS FUNCTIONS on Strands: system prompt = component rules +
  `screens/v0_9/*.json` as few-shot examples + selection rules; `get_restaurants` as a Strands
  tool; action→text-query; parse/validate+retry.
  TOPOLOGY DECIDED = (1), after user clarification: dropping the sample's dev A2A middleware
  was only dropping its dev-only PACKAGING (Vite Node server); its ROLE (an A2A gateway/BFF:
  hold agent conn, speak real A2A, translate to/from browser) is PRODUCTION-MEANINGFUL and we
  KEPT it — it's our FastAPI `/a2a` backend. The "dumb browser" (POST+SSE) is the CORRECT prod
  design (browser must NOT speak agent-to-agent protocols or hold agent creds; the backend
  gateway does). So:
    browser (dumb POST+SSE) → FastAPI `/a2a` = A2A GATEWAY (prod heir of the dev middleware)
      → speaks A2A to → Strands agent (`strands-agents[gemini,a2a]`, Gemini) → AgentCore later.
  Agent runs in the SAME FastAPI Cloud container now; A2A boundary is real but local; at
  AgentCore time only the gateway's target URL changes (localized seam). INSTALL:
  `uv add 'strands-agents[gemini,a2a]'`. Next: build Strands agent (system prompt = component
  rules + screens/v0_9/*.json examples + selection rules; get_restaurants tool; parse/validate
  +retry) + make /a2a the gateway that bridges dumb browser ⇄ A2A agent.
  === BUILD PROGRESS (a2ui_agent, Strands) ===
  Verified Strands API (installed, no fastapi conflict): `from strands import Agent, tool`;
  `from strands.models.gemini import GeminiModel` → GeminiModel(model_id=..., client_args=
  {"api_key": ...}); run via `await agent.invoke_async(query)`; A2A exposure via
  `from strands.multiagent.a2a import A2AServer` → `A2AServer(agent).to_fastapi_app()` (serves
  agent card + message/stream; emits output as A2A TEXT parts).
  MODEL ID = **gemini-3.6-flash** (standard across B:\too/toocore + B:\div; NOT 2.5 [deprecated]).
  SMOKE TEST PASSED (a2ui_agent/smoke.py — throwaway): Strands+Gemini+key replied OK. Key loaded
  from a2ui_fastapi/.env for tests (TODO: move key to a2ui_agent/.env + FastAPI Cloud secret).
  Tests/checks: CLAUDE runs them (user: "all the test/check, you do").
  Agent I/O design: agent is pure Strands text-in → A2UI-JSON-out (knows nothing of browser);
  action→text-query conversion lives in the GATEWAY (Phase C), like sample's agent_executor.
  Few-shot examples = our screens/v0_9/*.json (same format as sample examples/0.9).
  PROVIDER SWITCHED to **Groq** (user: "change to groq", per B:\div\divcore): Gemini key was
  FREE-TIER (20 req/day) and got exhausted fast (each generate() = tool-call + gen + retry =
  several reqs) → blocked. Groq = free, fast, higher limits, OpenAI-compatible. brain.py now
  uses `from strands.models.openai import OpenAIModel`, MODEL_ID="openai/gpt-oss-120b",
  GROQ_BASE_URL="https://api.groq.com/openai/v1", client_args={api_key: GROQ_API_KEY, base_url}.
  Needed `uv add openai` (the [gemini] extra didn't include the openai client). GROQ_API_KEY
  currently in a2ui_fastapi/.env (works; TODO move to a2ui_agent/.env + agent's FastAPI Cloud
  secret). smoke.py is throwaway + still references Gemini (ignore/delete).
  ===> PHASE A (agent brain) DONE + TESTED: a2ui_agent/agent/{__init__,tools,prompt,brain}.py.
  tools.get_restaurants (@tool, static datasource), prompt.SYSTEM_PROMPT (rules + 3 screen
  examples + data-model shapes), brain.build_agent()/generate(query) (OpenAIModel→Groq, tool,
  parse A2UI JSON + 1 retry). Test (CLAUDE ran): list→default(5 items), book→booking-form,
  submit→confirmation, all valid 3-message A2UI. <===
  PHASE B DONE + DEPLOYED + VERIFIED LIVE: deployed a2ui-agent.fastapicloud.dev serves A2A —
  /.well-known/agent-card.json → 200 (card: streaming:true, skill get_restaurants, transport
  JSONRPC), POST / = message/stream. Tested message/stream (text "Find me chinese restaurants
  in New York") → SSE of JSON-RPC events; FINAL artifact carries valid A2UI (3 msgs
  createSurface/updateComponents/updateDataModel, surfaceId default, 5 items). CONFIRMED the
  A2UI JSON arrives as the `text` of a part inside the stream (Strands emits agent output as
  A2A text/artifact parts — NOT a2ui data parts; A2UI-for-browser wrapping is the GATEWAY's job).
  Card `url` is still http://127.0.0.1:9000/ because AGENT_PUBLIC_URL unset → TODO set
  AGENT_PUBLIC_URL=https://a2ui-agent.fastapicloud.dev + redeploy (so fromCardUrl clients work;
  gateway can also just POST the known base URL directly).
  === PHASE C (gateway = A2A client) NEXT ===: a2ui_fastapi /a2a must: (1) receive browser
  POST (text query OR JSON {version,action}); (2) convert action→text-query like sample
  agent_executor (book_restaurant→"USER_WANTS_TO_BOOK: ...", submit_booking→"User submitted a
  booking ..."); (3) call the agent's message/stream (via a2a-sdk client OR raw httpx JSON-RPC
  like the curl test); (4) collect the A2UI JSON from the part text, parse, wrap each msg as
  `{kind:'data', data:<msg>, mimeType:'application/a2ui+json'}`, stream as browser SSE
  `data: [parts]`. Replaces the deterministic handle()/screens in a2ui_fastapi (screens+
  datasource now live in a2ui_agent). Gateway needs an A2A client dep (a2a-sdk or httpx).
  --- prior Phase B notes ---
  PHASE B (A2A server) — code DONE + local build OK: a2ui_agent/main.py =
  `A2AServer(agent_factory=lambda ctx: build_agent(), http_url=os.environ.get("AGENT_PUBLIC_URL"),
  serve_at_root=True).to_fastapi_app()`. Local check: app=A2AFastAPI, exposes
  /.well-known/agent-card.json. DEPLOYED URLS: gateway=a2ui-backend.fastapicloud.dev (/a2a),
  agent=a2ui-agent.fastapicloud.dev. BUT agent deploy is STILL THE OLD HELLO-WORLD STUB (/.well-
  known/agent-card.json → 404, / → Hello World) — new main.py NOT yet (re)deployed.
  DEPLOY PREREQ: set GROQ_API_KEY env/secret on the a2ui-agent FastAPI Cloud service (A2AServer
  runs build_agent() at BOOT → reads it → crash if missing). Optional AGENT_PUBLIC_URL=
  https://a2ui-agent.fastapicloud.dev (agent-card url). config.ts already has A2A_URL (gateway)
  + A2UI_AGENT_URL (agent). A2A = client/server: agent=server (Phase B), gateway=client (Phase C).
  THEN PHASE C: a2ui_fastapi gateway = A2A CLIENT — reads agent card, message/stream to the agent,
  converts browser action→text-query (like sample agent_executor), wraps parts → browser SSE.
  (Pending/optional, not blocking: frontend catalog seam src/catalog/index.ts re-exporting
  basicCatalog.) STAGE 2 "other samples" (custom-components-example, community/mcp/*, other
  client frameworks) is SEPARATE from this target.
- **Working agreement (confirmed by user): "you teach, I work, you check."** The loop:
  Claude explains the next tiny step → the USER writes the code → Claude verifies
  (reads files, runs builds/lint/tests to check). Claude does NOT implement the learning
  code unless the user explicitly says "u do X" (fine for throwaway/verification bits like
  a smoke-test build). Keep steps TINY and verify each before moving on. User is learning.

---

## 0.5 GUIDING PRINCIPLE (user directive, 2026-10-02)

**Code may be SAMPLE-LEVEL; architecture must be PRODUCTION-LEVEL.** The logic can be
simple, placeholder, hardcoded, stubbed-to-replace — as long as it works. But the
structure/folders/modules must be production-grade: separation of concerns, clear
interfaces & contracts, explicit imports, modularization. Rationale: throwaway logic is
cheap to replace; a throwaway structure must be torn out later. (Mirrored in memory
`sample-code-prod-architecture`.) Example applied: backend split into
`screens/v0_9/*.json` (UI layout assets / contract) + `screens/__init__.py` (assembly
interface) + `datasource/` (data) + thin `main.py` (transport + routing).

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

- **SECRETS / .env (incident 2026-10-02):** GitHub Push Protection blocked a push because the
  **GEMINI key was committed** in `a2ui_fastapi/.env` (commit d89416a). Fixed by `git rm
  --cached` + root `.gitignore` (`.env`/`.env.*`/`*.env`) + `git commit --amend` (secret was in
  the single unpushed HEAD commit; never reached GitHub). RULE: **never commit API keys.** Keys
  = real secrets → **FastAPI Cloud env/secrets** per container + a LOCAL gitignored `.env` for
  dev (distinct from committed non-secret config like React `src/config.ts`). GEMINI_API_KEY
  belongs on the **a2ui_agent** container (the Gemini caller), NOT a2ui_fastapi (gateway).
- **Two-container split IN PROGRESS:** `B:\a2ui2\a2ui_agent` scaffolded (its own FastAPI project
  + uv.lock) = the Strands/Gemini AGENT; `a2ui_fastapi` = the gateway. (See topology (1) above.)

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
