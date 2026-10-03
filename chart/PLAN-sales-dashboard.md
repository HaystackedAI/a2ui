# PLAN — Rebuild the "Sales Dashboard" in our stack (teach / type / check)

> Target = the composer **Sales Dashboard** (screenshot `b:\a2ui2\chart\image.png`).
> Rebuilt on OUR stack: `a2ui_react` (client, `@a2ui/react`) + `a2ui_fastapi` (A2A gateway) +
> `a2ui_agent` (Strands + Groq, A2A server). Research + rationale: `RESEARCH-chart-renderer.md`.
> Working rule (unchanged): **Claude teaches the next tiny step → user types → Claude checks.**
> Claude does NOT write the learning code (throwaway/verification bits only, and only when asked).

---

## DECISIONS (locked — Claude's judgment, per user "follow your judgement")

1. **2 custom components:** `StatTile` (KPI card) + `Chart` (ONE component, `type: doughnut | bar`).
   Not one component per chart type — a single `Chart` with a `type` prop; the renderer branches
   internally to the right Recharts tree. (`type` is just data; the render code is what draws.)
2. **Chart library = Recharts** (React-idiomatic; matches the CopilotKit tutorial blueprint).
3. **Data = static sample data Claude creates** (below). Snowflake deferred to the AWS phase.
4. **ONE merged custom catalog** (basic components + StatTile + Chart) under OUR catalogId. A surface
   names a single `catalogId`, and the dashboard needs BOTH basic (Column/Row/Card/Text/List) AND
   custom (StatTile/Chart) components → they must live in the SAME catalog. The agent emits
   `createSurface.catalogId = SALES_CATALOG_ID`.
5. **Build order: RENDERER FIRST, against a HARDCODED dashboard surface (no agent/LLM)** — de-risks
   the net-new React work independently. THEN wire the agent so the LLM emits the same surface.
6. **v1 scope cuts (deferred):** Q1–Q4 tabs, chart drill-down, dark-mode/chrome. v1 = one quarter,
   static, light theme. (Record each as done if we add them.)
7. When writing chart/stat-tile visuals, **load the `dataviz` skill first** (color/layout rules).
8. **NAMING (user rule):** every NEW file/folder/function/variable is prefixed `chart_`; MODIFIED
   existing files keep their name (`App.tsx` stays `App.tsx`). Protocol A2UI component `name` strings
   ("StatTile"/"Chart") stay UNPREFIXED. So: folder `src/chart_catalog/`, files `chart_*.tsx`,
   exports `chart_StatTile`/`chart_salesCatalog`, const `chart_SALES_CATALOG_ID`. (memory: chart-naming-convention)

---

## THE SHARED CONTRACT (client & agent MUST agree — this is the spec)

### Catalog
- `SALES_CATALOG_ID = "https://haystackedai.com/a2ui/catalogs/sales/v0_9/catalog.json"` (our own URI;
  non-resolving is fine — it's just an identifier both sides match on).
- Protocol version: reuse `basicCatalog.protocolVersion` (v0.9).
- Client builds: `new Catalog(SALES_CATALOG_ID, basicCatalog.protocolVersion,
  [...basicCatalog.components.values(), StatTile, Chart], [...basicCatalog.functions.values()])`.

### Custom component props (Zod on client / JSON-schema on agent — same shape)
`StatTile`:
| prop | type | notes |
|---|---|---|
| `title` | DynamicString | e.g. "Revenue" |
| `caption` | DynamicString | e.g. "Quarter-to-date" |
| `value` | DynamicString | pre-formatted by agent, e.g. "$980K", "4.4%" |
| `trend` | enum `up`\|`down`\|`neutral` | drives arrow + color |
| `trendValue` | DynamicString | e.g. "+8.5%" |
| (`weight`) | common | from catalog common props |

`Chart`:
| prop | type | notes |
|---|---|---|
| `type` | enum `doughnut`\|`bar` | which Recharts tree to render |
| `title` | DynamicString | chart heading |
| `chartData` | array of `{label:string, value:number, color?:string}` **OR** `{path}` | the series; numbers are numeric — **coerce to Number in the renderer** (LLM may emit strings) |

> DynamicString = literal string OR `{path:"..."}` data-binding (A2UI's literal-or-binding union).

### Sample data model (the surface's `updateDataModel` value) — **Claude creates this**
```json
{
  "period":  { "title": "Q1 2025 Sales Dashboard", "dateRange": "Jan 1 – Mar 31, 2025" },
  "kpis": [
    { "title": "Revenue",         "caption": "Quarter-to-date", "value": "$980K", "trend": "up",      "trendValue": "+8.5%" },
    { "title": "New customers",   "caption": "vs. last year",   "value": "2,940", "trend": "up",      "trendValue": "+5.2%" },
    { "title": "Avg order value", "caption": "vs. last year",   "value": "$333",  "trend": "down",    "trendValue": "-2.1%" },
    { "title": "Churn",           "caption": "Monthly average", "value": "4.4%",  "trend": "neutral", "trendValue": "+0.3%" }
  ],
  "revenueByRegion": [
    { "label": "North America", "value": 58 },
    { "label": "Europe",        "value": 22 },
    { "label": "Asia Pacific",  "value": 14 },
    { "label": "Other",         "value": 6  }
  ],
  "monthlyRevenue": [
    { "label": "Jan", "value": 270000 },
    { "label": "Feb", "value": 300000 },
    { "label": "Mar", "value": 360000 }
  ]
}
```

### Component tree (the surface's `updateComponents`) — faithful to the screenshot
```
root (Column)
├─ header (Column)
│   ├─ title     Text  variant h1,      text {path:/period/title}
│   └─ subtitle  Text  variant caption, text {path:/period/dateRange}
├─ kpis (List, direction horizontal, children = template)
│   └─ kpi-tpl  StatTile   (template over {path:/kpis}; RELATIVE bindings:
│                title {path:title} caption {path:caption} value {path:value}
│                trend {path:trend} trendValue {path:trendValue})
└─ charts (Row)
    ├─ card-region  (Card → region-chart)
    │   └─ region-chart  Chart type=doughnut title="Revenue by region" chartData {path:/revenueByRegion}
    └─ card-monthly (Card → monthly-chart)
        └─ monthly-chart Chart type=bar      title="Monthly revenue"   chartData {path:/monthlyRevenue}
```
> KPI row uses the proven **List+template** pattern (relative bindings) from the restaurant build —
> avoids array-index path guesswork. Charts bind `chartData` to a whole array via `{path}`.

---

## STAGE A — Client renderer, tested against a HARDCODED surface (no agent)

Goal: see the full dashboard render in the browser from a hardcoded 3-message surface, before the
agent exists. Each step is tiny; Claude checks `tsc -b` / browser after each.

- **A1. Install Recharts.** `npm i recharts` in `a2ui_react`. Check: it resolves, `tsc -b` clean,
  `vite build` still succeeds (watch bundle size).
- **A2. Create the catalog seam.** New folder `a2ui_react/src/catalog/`:
  - `src/catalog/constants.ts` → `export const SALES_CATALOG_ID = "..."`.
  - (we'll add component files + an `index.ts` that assembles the merged `Catalog`.)
  Check: files compile, nothing imported yet.
- **A3. Build `StatTile`.** `src/catalog/StatTile.tsx`:
  - a `ComponentApi` = `{ name: 'StatTile', schema: z.object({...}) }` (props above; include catalog
    common props — read a basic component's Api as a template for the common bits).
  - `createComponentImplementation(StatTileApi, StatTileView)` where `StatTileView({props})` renders
    the card (title, caption, big value, trend arrow + colored trendValue: green up / red down /
    grey neutral). Plain CSS for now.
  Check: `tsc -b` clean; unit-eyeball the component in isolation if easy.
- **A4. Merge catalog + render a hardcoded dashboard (KPIs only).**
  - `src/catalog/index.ts` → build `salesCatalog = new Catalog(SALES_CATALOG_ID,
    basicCatalog.protocolVersion, [...basicCatalog.components.values(), StatTile], [...functions])`.
  - In `App.tsx`, pass `[salesCatalog]` to `MessageProcessor` (keep `basicCatalog` too if we want the
    restaurant demo to still work: `[basicCatalog, salesCatalog]`).
  - Temporarily `processor.processMessages([...])` a HARDCODED 3-message dashboard surface with ONLY
    the header + KPI List (createSurface catalogId=SALES_CATALOG_ID / updateComponents / updateDataModel
    with the sample data above). (Throwaway toy, like the first restaurant surface — Claude may write
    this verification bit if asked.)
  Check (browser): 4 KPI tiles render with correct values + trend arrows/colors. **Also log `props`
    inside StatTileView once** to CONFIRM the deep binder resolves List-template relative paths.
- **A5. Build `Chart` — doughnut first.** `src/catalog/Chart.tsx`:
  - `ChartApi` schema (type/title/chartData). `ChartView({props})` → `switch(props.type)`; `doughnut`
    → Recharts `<PieChart><Pie dataKey="value" nameKey="label" innerRadius=.. /></PieChart>` with a
    right-side legend + colored slices. **Coerce `value` to Number.**
  - Add `Chart` to the merged catalog array.
  - Extend the hardcoded surface with the `revenueByRegion` doughnut.
  Check (browser): doughnut renders from `{path:/revenueByRegion}`. **CONFIRM `props.chartData` arrives
    as the resolved array** (see Risks). `tsc -b` clean.
- **A6. Add `bar` to `Chart`.** Same component, `type==='bar'` → Recharts `<BarChart><Bar
  dataKey="value"/><XAxis dataKey="label"/><YAxis/></BarChart>`. Extend the hardcoded surface with the
  `monthlyRevenue` bar. Check (browser): both charts render.
- **A7. Full hardcoded dashboard.** Assemble the complete tree (header + KPI list + 2 chart cards in a
  Row). Check: matches the screenshot layout; `tsc -b` + `vite build` clean. **Load `dataviz` skill**
  and polish colors/spacing. ===> Renderer DONE, agent-independent. <===

## STAGE B — Agent emits the dashboard (the LLM half)

Goal: remove the hardcoded toy; the Strands/Groq agent generates the same surface. Gateway unchanged.

- **B1. Catalog schema JSON** in `a2ui_agent` (e.g. `catalog/v0_9/sales_catalog_definition.json`):
  author from the **rizzcharts catalog-definition template** (basic components) + add `StatTile` and
  extend `Chart` with `type: bar` (rizzcharts' is pie/doughnut only). `catalogId` = SALES_CATALOG_ID.
- **B2. Data tool** `get_sales_data()` (Strands `@tool`, static sample data above; shape mirrors the
  data model). Snowflake later swaps the body only.
- **B3. Few-shot example** `a2ui_agent/examples/v0_9/sales_dashboard.json` = the COMPLETE 3-message
  screen (createSurface + updateComponents + updateDataModel), same as the restaurant examples (which
  must be complete 3-message screens — the earlier confirmation bug came from layout-only examples).
- **B4. System prompt**: component rules (StatTile + Chart with type doughnut|bar), the example, and
  selection rules (when to use doughnut vs bar; StatTiles for KPIs). Reuse the restaurant prompt
  structure.
- **B5. Brain wiring**: ensure `createSurface.catalogId = SALES_CATALOG_ID`; keep parse + 1 retry.
  Test locally (Claude runs): query → valid 3-message dashboard A2UI.
- **B6. Deploy + verify loop**: push `a2ui_agent` (FastAPI Cloud CI/CD); gateway `a2ui_fastapi`
  unchanged (A2A client → wraps parts → SSE). Browser: query "sales dashboard" → full dashboard
  renders over the network. ===> TARGET MET. <===

## STAGE C — deferred polish (only if user wants)
Q1–Q4 Tabs (action → updateDataModel per quarter) · chart drill-down (rizzcharts/Angular pattern) ·
theming/dark-mode · Snowflake data tool · AgentCore + Gateway MCP (the long-term goal).

---

## OPEN RISKS / verify-during-build (don't guess — test)
1. ✅ RESOLVED at A5: **the React deep binder DOES resolve a `{path}` to the whole array** —
   `props.chartData` arrives as the resolved `[{label,value}]` array (doughnut rendered with full
   legend). No binderless fallback needed. `chartData` schema = `z.union([z.array(item),
   DataBindingSchema])`; renderer coerces `value` to Number.
2. **Zod schema must include catalog common props** (e.g. `weight`). Read a basic component's `*Api`
   in `@a2ui/web_core/.../basic_catalog` as the template for the common bits before writing ours.
3. **List-template relative bindings into `/kpis`** must resolve per-item (confirm at A4). If flaky,
   fall back to 4 explicit StatTiles with absolute paths.
4. **Recharts + Vite** bundle size / SSR-free rendering — watch `vite build`; Recharts needs a sized
   container (set width/height or `<ResponsiveContainer>`).
5. Keep the **restaurant demo working** — if `App.tsx` now holds a hardcoded dashboard toy, gate it so
   the normal query flow still renders agent surfaces (the toy is temporary; removed in Stage B).

## STATUS
- [x] A1 recharts  [x] A2 seam  [x] A3 StatTile  [x] A4 KPIs render  [x] A5 doughnut
  [x] A6 bar  [x] A7 full dashboard (user-confirmed visually) — STAGE A (renderer) DONE
- [x] B1 pyproject deps + uv.lock  [x] B2 data (chart_sales.py)  [x] B3 tool (chart_get_sales_data)
  [x] B4 few-shot example  [x] B5 prompt  [x] B6 brain  [x] B7 __init__  [x] B8 main (A2AServer)
  [x] DEPLOYED (agent card healthy)  [ ] B9 skipped-local  [x] **B10 gateway wiring + browser test DONE**
- ===> **TARGET MET (2026-10-03): full Sales-Dashboard LLM pipeline live end-to-end,
  user-confirmed in browser.** <===  Chain: browser:5173 → gateway a2ui_fastapi (keyword
  if-else router `chart_pick_agent`: "dashboard/sales/revenue" → chart agent, else restaurant) →
  chart agent mcpserver.fastapicloud.dev (Strands/Groq, A2A) → A2UI → SSE → chart_catalog renderer.
  Both demos coexist (restaurant query still routes to the restaurant agent).
- CLEANUP DONE: `App.tsx` dev-dashboard injection removed (now commented out — `chart_devDashboard`
  import + DEV useMemo); clean `processor` useMemo active; `tsc -b` clean. Page shows the search
  form on load; dashboard only renders on query. Throwaway `src/chart_catalog/chart_devDashboard.ts`
  now unimported (safe to delete).

---

## 🫱 HANDOVER — RESUME HERE (session 2026-10-03, TARGET MET)

**Where we are:** ✅ **DONE / TARGET MET.** Full Sales-Dashboard pipeline live end-to-end,
user-confirmed in the browser. Renderer (Stage A) + chart agent (Stage B) + gateway routing (B10)
all working. Both the dashboard and restaurant demos coexist on the same deployed gateway.

**What landed this session (B10 + cleanup):**
- Gateway `a2ui_fastapi/agent_client.py`: added `chart_AGENT_URL` (= mcpserver.fastapicloud.dev)
  and `chart_pick_agent(query)` — keyword if-else router ("dashboard"/"sales"/"revenue" → chart
  agent, else restaurant `AGENT_URL`). `ask_agent` now resolves `agent_url = chart_pick_agent(query)`
  and uses it for the resolver base_url + card url override. Import + routing verified; deployed.
- Client `App.tsx`: removed the `chart_devDashboard` page-load injection (commented out); clean
  `processor` useMemo restored. `tsc -b` clean.
- First real LLM generation of the dashboard VERIFIED valid in-browser (the complete-3-msg few-shot
  held; no malformed-JSON retry needed in practice).

**Possible NEXT (Stage C — only if user wants):**
- Delete throwaway `a2ui_react/src/chart_catalog/chart_devDashboard.ts` (unimported) + the commented
  dead lines in `App.tsx`; commit the client cleanup.
- Upgrade routing: replace the keyword if-else with an LLM intent-router — belongs AGENT-SIDE (keep
  the gateway dumb per §0.5), not bolted into the gateway. (User discussed this; chose if-else for now.)
- Q1–Q4 Tabs · chart drill-down · theming/dark-mode · Snowflake data tool · AgentCore + Gateway MCP.

--- prior handover (superseded; kept for history) ---

**Topology decided (user):** BRAND-NEW separate agent `b:\a2ui2\chart_agent` (NOT extending
a2ui_agent). Clone of a2ui_agent's architecture.

**Done & verified:**
- STAGE A (client `a2ui_react/src/chart_catalog/`): `chart_constants.ts`
  (`chart_SALES_CATALOG_ID` = `https://haystackedai.com/a2ui/catalogs/sales/v0_9/catalog.json`),
  `chart_StatTile.tsx`, `chart_Chart.tsx` (one Chart, `type` doughnut|bar, Recharts),
  `chart_DataTable.tsx` (status badges good/warn/crit), `chart_catalog.ts`
  (`chart_salesCatalog` = basics + 3 custom), `chart_devDashboard.ts` (hardcoded 3-msg surface,
  THROWAWAY). `App.tsx`: `MessageProcessor([basicCatalog, chart_salesCatalog])` + processes
  `chart_devDashboardMessages` on load (DEV/throwaway — REMOVE at cleanup). recharts installed;
  **zod pinned 3.25.76 as a DIRECT dep** (fixed the v4-at-top-level trap). dataviz palette applied.
  Binder confirmed to resolve `{path}`→whole array for chartData.
- STAGE B (`b:\a2ui2\chart_agent`, standalone clone of a2ui_agent): `pyproject.toml`
  (a2a-sdk, fastapi[standard], openai, strands-agents[a2a]) + `uv.lock`; `datasource/chart_sales.py`
  (`chart_SALES`, keys match client bindings); `agent/tools.py` (`chart_get_sales_data`, no args);
  `examples/v0_9/chart_sales_dashboard.json` (complete 3-msg screen, catalogId byte-matches client);
  `agent/prompt.py`; `agent/brain.py` (Groq `openai/gpt-oss-120b`); `agent/__init__.py`;
  `main.py` (A2AServer, serve_at_root). **DEPLOYED → https://mcpserver.fastapicloud.dev**
  (FastAPI Cloud; app/host is "mcpserver"). Agent card verified live: name `chart_agent`, skill
  `chart_get_sales_data`, streaming, `url` = real deployed URL (AGENT_PUBLIC_URL set), root `/`→405
  (POST-only). GROQ_API_KEY secret presumed set (card boots). config.ts:
  `A2UI_CHART_AGENT='https://mcpserver.fastapicloud.dev'`.

**NEXT ACTION (B10) — wire the gateway, then browser-test:**
The gateway `a2ui_fastapi/agent_client.py` has `AGENT_URL = "https://a2ui-agent.fastapicloud.dev"`
(restaurant). The browser → gateway → agent, and the client NEEDS the gateway (it translates A2A
text parts → browser SSE `{kind:'data'}`; client can't talk A2A directly). To render the dashboard:
point the gateway at the chart agent. DECISION PENDING: (a) change `AGENT_URL` to
`https://mcpserver.fastapicloud.dev` (simplest; breaks restaurant), or (b) make it env/route-based.
`ask_agent._find_ui_text` keys off a part `text` containing `"createSurface"` — chart agent emits
the same shape, so it should work unchanged. After wiring: redeploy gateway (git push), then in
browser query e.g. "sales dashboard" → expect the full dashboard. Then CLEANUP: remove the
`chart_devDashboard` injection from `App.tsx` so queries (not page-load) drive it.

**TESTING CONSTRAINT:** this session's Bash sandbox has NO external network (`curl` → HTTP 000 even
to known URLs). Use `WebFetch` (GET only) to check deployed endpoints, or have the user run a `!`
curl for POST/message-stream tests. Do NOT run the agent locally (user directive: test deployed only).

**Open risks for B10:** LLM routing/output validity is untested (first real generation). If the
dashboard JSON is malformed, brain.py has 1 retry; the complete-3-msg example should keep it valid
(restaurant confirmation-bug lesson). Watch that `updateDataModel.value` keys match client paths.
