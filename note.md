npm install @a2ui/react @a2ui/web_core @a2ui/markdown-it zod

What each piece does (the mental model you're building):
- MessageProcessor — the brain. You hand it a list of catalogs ([basicCatalog] = the component vocabulary it's allowed to render) and an action callback (fires when the user clicks a Button etc.). It ingests A2UI messages and maintains a reactive model of surfaces.
- processor.model.surfacesMap — a Map of all live surfaces. Right now it's empty (we've fed in no messages), so surfaces.length will be 0.
- <A2uiSurface surface={…}> — the React component that draws one surface's component tree. We map over every surface and render each.
- MarkdownContext.Provider value={renderMarkdown} — lets Text components render markdown (needed later for the "More Info" links). Harmless now.
- ReactComponentImplementation — the TypeScript generic that tells MessageProcessor it's producing React components. Matches the sample.
- useMemo(…, []) — create the processor once, not on every render.

**What a "surface" is**

A surface is one independent, *agent-controlled* UI region/screen — the top-level container that everything else (components, data, actions) lives inside. It's the unit the agent creates, updates, and deletes, and the unit your renderer mounts and draws.

Surface  (id: "default")
├── catalogId      → which component vocabulary is allowed (the basic catalog)
├── theme          → optional styling (v0.9; renamed surfaceProperties in v1.0)
├── component tree → the layout: a flat list of nodes linked by id, with a "root"
└── data model     → a JSON blob the components bind to via { path: "/..." }

Those map exactly to the three messages you were about to send: 
- createSurface makes the surface + sets catalog/theme; 
- updateComponents fills the component tree; 
- updateDataModel fills the data model.

The server-driven-UI "screen" is the best mental model: the agent streams a declarative description, the client draws it with its own trusted native widgets (no agent code runs).

Yes — it's the central one. The A2UI hierarchy is:

Catalog  (the vocabulary of allowed components)
   │
Surface  (a screen using that vocabulary)   ← YOU control/render at this level
   ├── Components  (the tree inside the surface)
   ├── Data model  (bound into components)
   └── Actions     (events from components, sent back to the agent)


**The essence**
- Sandbox = "here is a finished web thing, run it in a box." Maximally expressive, but web-bound and realization-bound forever.
- A2UI = "here is what I mean, you render it." Bounded in expressiveness, but medium-agnostic, platform-native, and contract-portable in ways a sandbox can't reach in principle.

user types query ──► client.send(query, onChunk)
                         onChunk(chunk) ──► processor.processMessages(chunk) ──► surface renders
user clicks a Button ──► processor's action callback ──► client.send({version,action}) ──► (loop)

That's the full loop working end to end — browser at :5173 → FastAPI Cloud → SSE → processor.processMessages → <A2uiSurface>. The entire pipeline you set out to rebuild is now proven with real network transport. 🎉



Good analogy to reach for — and the instinct is right in one dimension: both are server-driven UI. The server decides what the user sees; the client displays it. But A2UI differs from JSP in three ways that are the whole point, so it's worth being precise.

The sharpest way to see the difference: with JSP, the server writes <div class="card">...</div> — it knows about HTML and CSS. With A2UI, the server says {"component": "Card", ...} and has no idea how a Card is drawn — your React basicCatalog decides that. The server describes structure and data; the client o

And the reason this matters for your actual goal (agents): you would never let an LLM write r page — that's an injection waiting to happen. A2UI's catalog is the allowlist that makes "let the model build the UI" safe. JSP has no such boundary.                                                                                                                                                             
So: server-driven UI — yes, same family as JSP. But A2UI is that idea rebuilt as a safe, reactive, cross-platform protocol rather than HTML templating. Think "the server sends a remote-UI spec a generic renderer paints," closer to React Server Components or Airbnb-style Server-Driven UI than to JSP.


browser (dumb POST+SSE)  ──►  FastAPI /a2a  = A2A GATEWAY (prod heir of the dev middleware)
                                     │  speaks A2A to…
                                     ▼
                               Strands agent (A2A-capable, Gemini) ──► AgentCore later

- Browser: unchanged, dumb, correct.
- /a2a: the gateway — translates browser ⇄ A2A, exactly like the sample's middleware did, but as a real backend.
- Agent: Strands with [a2a], so the gateway↔agent boundary is real A2A from day one (not a shortcut). When the agent moves to AgentCore, only the gateway's target URL changes.


Verified Strands API

- Model: from strands.models.gemini import GeminiModel → GeminiModel(model_id="gemini-2.5-flash", client_args={"api_key": ...})
- Agent: from strands import Agent, tool → Agent(model=..., tools=[...], system_prompt=..., name=..., description=...), run via await agent.invoke_async(query)
- A2A exposure: from strands.multiagent.a2a import A2AServer → A2AServer(agent).to_fastapi_app() gives a FastAPI app serving the agent over A2A (agent card + message/stream). Its executor emits the agent's output as A2A text parts.

Data flow (two containers)

browser (dumb POST+SSE) → GATEWAY a2ui_fastapi /a2a
    → A2A call → AGENT a2ui_agent (Strands+Gemini) returns A2UI JSON (as A2A text)
    ← gateway parses it, wraps as a2ui data parts, streams SSE → browser
So the agent is the brain (query → A2UI JSON, using our screens as examples); the gateway stays the transport adapter (A2A client ⇄ browser SSE). The A2UI-specific wrapping for the browser lives in the gateway (where our _part() already is).

Structural moves this implies

- screens/v0_9/*.json + datasource/ move to a2ui_agent (the agent generates UI, so the examples + data belong there). The gateway keeps no screens/data/LLM.
- a2ui_fastapi slims to: browser /a2a + A2A client to the agent.

Staged plan

- A — Agent brain (the valuable, hard part): Strands Agent (Gemini + get_restaurants tool + system prompt = component rules + our screen examples + selection rules) that returns valid A2UI JSON for a query/action. Test in isolation.
- B — Expose over A2A: A2AServer(agent).to_fastapi_app() in a2ui_agent; deploy.
- C — Wire the gateway: a2ui_fastapi calls the agent over A2A, streams SSE.

browser (dumb POST+SSE)
   → a2ui_fastapi  = A2A CLIENT  (Phase C)   ─ message/stream ─►   a2ui_agent = A2A SERVER (Phase B)
   ◄──────── SSE ────────                     ◄─ streamed parts ──   (Strands + Groq)



Last step: we got your LLM agent live on A2A and verified it. Specifically:

1. Built the agent brain in a2ui_agent — tools.py (get_restaurants), prompt.py (rules + our 3 screen examples), brain.py (Strands Agent).
2. Switched the model to Groq gpt-oss-120b (Gemini's free tier was capped at 20/day and kept blocking us).
3. Wrapped it as an A2A server (main.py = A2AServer(...).to_fastapi_app()).
4. You deployed it to a2ui-agent.fastapicloud.dev + set GROQ_API_KEY.
5. I tested the deployed agent over A2A message/stream → it returned valid A2UI (createSurface/updateComponents/updateDataModel, 5 restaurants) for "find chinese restaurants in New York". ✅

So: the LLM agent (A2A server) is done and live — that was Phase B.

Where that leaves us:
- ✅ React client (browser)
- ✅ Gateway a2ui_fastapi — but still serving deterministic hardcoded screens
- ✅ LLM agent a2ui_agent — live on A2A, Groq-driven
- ⬜ Phase C (next): wire the gateway to call the agent, so the browser shows the LLM's screens instead of the canned ones.

Right now the browser → gateway → canned screens. Phase C makes it browser → gateway → agent → LLM screens. Want to build Phase C?


Let's build Phase C. The gateway (a2ui_fastapi) becomes an A2A client: it takes the browser's input, calls the agent's message/stream, pulls the A2UI out, and streams it back to the browser as SSE.

I'll teach it in small, testable pieces:
- C1 (now): the A2A client — agent_client.py with ask_agent(query) → A2UI messages. I can test this directly against your live agent.
- C2: convert browser action → text query (the book_restaurant/submit_booking mapping)
- C3: rewrite /a2a to use them + SSE to the browser
- C4: remove the old deterministic handle()/screens, deploy, see it in the browser

On the client choice: I'm going with httpx + raw JSON-RPC (not a2a-sdk), because I already proved the exact request/response shapes work (the curl test), httpx ships with fastapi[standard], and we isolate it in a dedicated module — so the structure stays production (a clean A2A-client boundary) while the code stays simple and teachable. Swappable to a2a-sdk later without touching the rest.



How it maps to A2A (client side):
- A2ACardResolver → get_agent_card() = discover the agent (reads /.well-known/agent-card.json).
- override card.url to the real agent address (the gateway is configured with it; avoids the 127.0.0.1 card issue).
- ClientFactory(...).create(card) = build the A2A client (JSON-RPC transport).
- client.send_message(...) = the message/stream call; it yields (Task, update) events, from which we pull the A2UI JSON text and parse it.


browser a2ui_react (:5173)
   → gateway a2ui-backend.fastapicloud.dev/a2a   (FastAPI, A2A CLIENT)
      → agent a2ui-agent.fastapicloud.dev        (Strands + Groq gpt-oss-120b, A2A SERVER)
         → A2UI JSON → SSE → rendered
search → list → book → form → submit → confirm, all LLM-generated. Target met.



WHY A2UI is here at all

The whole point: the agent (an LLM) decides what dashboard to show, but it never sends code — it sends declarative JSON. The browser renders that JSON using only components it already trusts. So an LLM can compose "4 KPI tiles + a doughnut + a bar chart + a table" without ever being able to inject arbitrary markup/script into your page. That safe-UI-across-a-trust-boundary is exactly what A2UI solves, and it's why it's worth the ceremony for an LLM-driven dashboard.

WHERE it's used — three seams

1. The catalog (the shared contract) — a2ui_react/src/chart_catalog/chart_catalog.ts
A2UI calls the agreed component vocabulary a catalog. We took A2UI's basicCatalog (Column/Row/Card/Text/List…) and built our own on top:
new Catalog(chart_SALES_CATALOG_ID,
  basicCatalog.protocolVersion,
  [...basicCatalog.components.values(), chart_StatTile, chart_Chart, chart_DataTable],
  ...)
A surface names exactly one catalogId, and the dashboard needs both basic layout and our custom charts — so they merge into one catalog under our own id (https://haystackedai.com/a2ui/catalogs/sales/v0_9/catalog.json). Both sides must agree on this id: the agent's createSurface.catalogId byte-matches it, which is how the client knows "StatTile"/"Chart" are legal here.

2. The custom components (client half of the contract) — chart_Chart.tsx, chart_StatTile.tsx, chart_DataTable.tsx
Each is registered with createComponentImplementation(api, view) where api is a Zod schema describing the props the agent may send:
chart_ChartApi = { name: 'Chart', schema: z.object({
  type: z.enum(['doughnut','bar']),      // literal enum, never bound
  title: DynamicStringSchema.optional(),
  chartData: z.union([z.array(item), DataBindingSchema]), // literal OR {path}
})}
The schema is the gatekeeper — if the LLM sends something off-contract, A2UI rejects it rather than rendering garbage. The view is plain React (Recharts). "Chart" is one component that branches internally on props.type → PieChart vs BarChart.

3. The messages (what the agent emits) — chart_agent/examples/v0_9/chart_sales_dashboard.json
This is A2UI's 3-message protocol, and the file is the LLM's few-shot example of it:

- createSurface — "start a surface, using this catalog."
- updateComponents — the component tree, as a flat list referenced by id. Pure layout, no values. Note it uses the List+template pattern: kpis List stamps kpi-tpl (a StatTile) once per item in /kpis.
- updateDataModel — the data, kept entirely separate from layout.

HOW layout and data meet — data binding

The key A2UI idea the chart part leans on: components don't contain their values; they point at them. In the tree you see "chartData": { "path": "/revenueByRegion" } and "text": { "path": "/title" }. Those {path} bindings are resolved by A2UI's binder against the data model, then handed to your React props already-resolved. That's why chart_Chart's view just reads props.chartData as a plain array:
const raw = Array.isArray(props.chartData) ? props.chartData : []
Two binding flavors in play:
- Absolute (/title, /revenueByRegion) — from the data root.
- Relative (inside the kpi-tpl template: {path:'title'}, {path:'trend'}) — relative to the current list item, so one StatTile definition renders all four KPIs.

The payoff of that separation

Because layout and data are decoupled, the same component tree can be re-driven with new data by sending only a fresh updateDataModel — e.g. a future "Q2" tab wouldn't resend the whole dashboard, just the numbers. And the LLM's job shrinks to "emit valid JSON matching the catalog," which the Zod schemas + the complete 3-message example keep honest (that's what fixed the earlier confirmation bug).

So in one line: A2UI is the contract that lets the LLM agent describe a dashboard as safe declarative JSON (catalog + 3 messages + path-bindings), which your Recharts components render — the agent chooses the UI, the client controls how it's drawn.
