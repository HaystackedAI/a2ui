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
1. **Does the React deep binder resolve a `{path}` to a whole ARRAY subtree** for `chartData`?
   If `props.chartData` arrives already-resolved → great. If not (binder only resolves scalars) →
   fallback: use `createBinderlessComponentImplementation` and resolve items via the `context`
   (like the Angular sample walks `chartData[i].label/.value`). Decide at A5 by logging props.
2. **Zod schema must include catalog common props** (e.g. `weight`). Read a basic component's `*Api`
   in `@a2ui/web_core/.../basic_catalog` as the template for the common bits before writing ours.
3. **List-template relative bindings into `/kpis`** must resolve per-item (confirm at A4). If flaky,
   fall back to 4 explicit StatTiles with absolute paths.
4. **Recharts + Vite** bundle size / SSR-free rendering — watch `vite build`; Recharts needs a sized
   container (set width/height or `<ResponsiveContainer>`).
5. Keep the **restaurant demo working** — if `App.tsx` now holds a hardcoded dashboard toy, gate it so
   the normal query flow still renders agent surfaces (the toy is temporary; removed in Stage B).

## STATUS
- [ ] A1 recharts  [ ] A2 seam  [ ] A3 StatTile  [ ] A4 KPIs render  [ ] A5 doughnut
  [ ] A6 bar  [ ] A7 full dashboard
- [ ] B1 schema  [ ] B2 tool  [ ] B3 example  [ ] B4 prompt  [ ] B5 brain  [ ] B6 deploy+verify
