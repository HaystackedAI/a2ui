# Chart renderer — research findings (recorded 2026-10-02)

> Purpose: record what exists for building a **custom `Chart` component in a client
> renderer** for A2UI, before we build our own. The restaurant clone skipped this (it used
> `basicCatalog`, which has NO chart). This is the main net-new piece for the Snowflake→charts
> AWS goal. Two reference implementations found. We'll likely do both as study, then port into
> our stack. Discuss after. This file is RECORD-ONLY — no decision made yet.

---

## 0. The core situation

- **rizzcharts** (`B:\a2ui\samples\community\agent\adk\rizzcharts`) is **AGENT-ONLY**. It ships a
  custom catalog *schema*, few-shot *examples*, and the *agent* (python/java/kotlin, Google ADK +
  A2A). It ships **NO client renderer** — nothing that actually draws a chart.
- rizzcharts does **NOT** use CopilotKit or AG-UI (grep of the whole tree = 0 hits). Pure ADK + A2A.
- The a2ui sample repo has client renderers for **Angular, Lit, Flutter, React** — but the only
  **React** client is `samples/client/react/shell` = the restaurant demo (basicCatalog only, no chart).
- **Nobody has published a React chart renderer in the a2ui repo.** But two solid blueprints exist
  (one Angular in-repo, one React in CopilotKit's docs), and our React package DOES support it.

### Our stack (for context — neither blueprint copy-pastes into it)
```
browser a2ui_react (@a2ui/react, A2A over SSE)
  → gateway a2ui_fastapi (A2A client)
    → agent a2ui_agent (Strands + Groq, A2A server)
```
Our renderer package = **`@a2ui/react`**. The custom-component API it exposes (verified in
`a2ui_react/node_modules/@a2ui/react/v0_9/index.d.ts`):

```ts
function createComponentImplementation<Api extends ComponentApi>(
  api: Api,
  RenderComponent: React.FC<ReactA2uiComponentProps<...>>
): ReactComponentImplementation

function createBinderlessComponentImplementation(
  api: ComponentApi,
  RenderComponent: React.FC<{ context: ComponentContext; buildChild: ... }>
): ReactComponentImplementation
```

You build a `Chart` as a `ReactComponentImplementation` and add it to the catalog array already
used in `App.tsx`:
```ts
new MessageProcessor([basicCatalog, chartImpl], actionCb)
```
> NOTE: the a2ui **docs** do NOT document this React path — every doc example is Angular. The API
> is real in the package though. So our port is "undocumented but supported."

---

## WAY A — a2ui official repo, **Angular** Chart (Chart.js)

The closest in-repo prior art. Wrong framework (Angular), right idea; a direct behavioral blueprint.

**Files (read-only reference, under `B:\a2ui`):**
- Component: `samples/community/client/angular/projects/orchestrator/src/a2ui-catalog/chart.ts`
- Catalog wiring: `samples/community/client/angular/projects/orchestrator/src/a2ui-catalog/catalog.ts`
- (sibling custom comp) `.../a2ui-catalog/google-map.ts`

**What the Angular `chart.ts` does / renders:**
- Dark **card**: header with **title (left)** + **download & share icon buttons (right)**.
- A **Chart.js pie/doughnut** (via `ng2-charts` `BaseChartDirective`) with the **legend on the right**
  and **percentage data labels** on each slice (`chartjs-plugin-datalabels`).
- **Interactive drill-down**: click a slice OR a legend item → chart swaps to that category's
  sub-breakdown; a **back-arrow** restores the top level. (`selectedCategory` signal; `root` vs
  drilled.)
- Inputs: `type` (pie|doughnut), `title`, `chartData`.
- **Data binding by PATH, not inline**: it walks the data-model —
  `chartData[i].label`, `chartData[i].value`, and nested `chartData[i].drillDown[j].{label,value}`
  (loops index 0..499, stops at first null). Values resolved via `super.resolvePrimitive({path})`.

**Catalog registration pattern (`catalog.ts`):**
```ts
export const DEMO_CATALOG = {
  Chart: {
    type: () => import('./chart').then(r => r.Chart),      // lazy
    bindings: ({properties}) => [
      inputBinding('type',      () => properties['type']),
      inputBinding('title',     () => properties['title']),
      inputBinding('chartData', () => properties['chartData']),
    ],
  },
  GoogleMap: { ... },
} as Catalog;
```

**Chart type coverage:** pie / doughnut only. (Our Snowflake goal needs bar/line too → extend.)

**Also in-repo (related, Lit):** `samples/community/custom-lit-components/register-components.ts`
shows the Lit registration pattern (`componentRegistry.register('OrgChart', OrgChart, 'org-chart', {schema})`,
plus a `TextField` override and `McpApp`/`WebFrame`). Useful to see the register-with-schema idea.

---

## WAY B — **CopilotKit** docs, **React** Recharts tutorial  ← the detailed one

The React chart tutorial. Right framework (React), right lib (Recharts). **Different renderer stack
than ours**, so it's a conceptual blueprint, not copy-paste.

**URL:** https://docs.copilotkit.ai/generative-ui/a2ui/dynamic-schema  ("Dynamic Schema A2UI")

Siblings:
- https://docs.copilotkit.ai/generative-ui/a2ui/fixed-schema — same pattern, flight-card primitives.
- https://docs.copilotkit.ai/docs/integrations/a2a/generative-ui/declarative-a2ui — restaurant
  starter, JSON-only, **v0.8 renderer, Book Now is inert** (CopilotKit cousin of our restaurant clone).
- Overview: https://docs.copilotkit.ai/generative-ui/a2ui

**What the Dynamic Schema tutorial builds:**
- `PieChart` **and** `BarChart` as custom components **on Recharts** (so bar is covered here, unlike Way A).
- A **3-file split** under `frontend/src/app/a2ui/`:
  - `definitions.ts` — Zod prop schemas + **descriptions** (the LLM reads descriptions to pick a
    component). Catalog set: Card, StatusBadge, Metric, InfoRow, DataTable, PrimaryButton,
    PieChart, BarChart.
  - `renderers.tsx` — React implementations keyed by the same names (the Recharts chart lives here).
  - `catalog.ts` — `createCatalog(definitions, renderers, { includeBasicCatalog: true })` merges
    custom + built-ins.
- Wire-up: one prop → `a2ui={{ catalog: myCatalog }}` on `<CopilotKit>`.
- "Dynamic schema" = a secondary LLM generates UI schema+data+layout from context; middleware
  waits for the full components array then **streams data progressively** (cards appear one by one).

**Key code shapes quoted from the page:**
- Data-bound prop = **literal-or-binding union**: `const DynString = z.union([z.string(), z.object({ path: z.string() })]);`
- Recharts bar mark: `<Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]} />`
- Catalog build: `export const myCatalog = createCatalog(myDefinitions, myRenderers, { includeBasicCatalog: true });`
- **Gotcha (will bite us too):** chart renderers **coerce values to Number** because "the LLM
  sometimes emits them as strings."

**CopilotKit stack vs ours — DO NOT confuse:**

| | Our stack | CopilotKit tutorial |
|---|---|---|
| Renderer pkg | `@a2ui/react` | `@copilotkit/a2ui-renderer` |
| Register custom comp | `createComponentImplementation(api, Fc)` | `createCatalog(definitions, renderers)` |
| Transport | A2A → our FastAPI gateway → Strands/Groq | CopilotKit `CopilotRuntime` (AG-UI) |
| Spec version | v0.9 | restaurant starter uses v0.8 |

---

## A vs B — quick compare

| | WAY A (a2ui Angular) | WAY B (CopilotKit React) |
|---|---|---|
| Framework | Angular | **React** ✓ (our target) |
| Chart lib | Chart.js (ng2-charts) | **Recharts** ✓ |
| Chart types | pie, doughnut | pie, **bar** |
| In our repo? | yes (`B:\a2ui`) read-only | no — external docs |
| Renderer API | `@a2ui/angular` Catalog | `@copilotkit/a2ui-renderer` createCatalog |
| Copy-paste into our `@a2ui/react`? | No (Angular) | No (different pkg/runtime) |
| Value to us | behavior blueprint: drill-down, path-walking `chartData`, title/icons | structural blueprint: 3-file split, Zod literal-or-binding, Number coercion, Recharts |

**Neither targets `@a2ui/react` + `createComponentImplementation`.** Both are references to port FROM.
The 3-file split in Way B matches the `src/catalog/` seam already planned in the handoff doc.

---

## Living demos (biz-sense visuals — not the rizzcharts build itself)
- A2UI Composer: https://a2ui-composer.ag-ui.com/ — **Gallery** (32 widgets incl. "Incremental
  Dashboard", "Stats Card", "Financial Data Grid"), **Custom Catalog** page (11-comp catalog, a
  "Sales Dashboard" example, renders live in React), **Theater** `/theater` (JSONL playback across
  React/Lit/Angular).
- a2ui.org homepage: "Custom Components" video — agent picks a **chart** for a numeric question,
  a **Google Map** for a location question (= the rizzcharts premise, shown rendering).
- No hosted demo of the Angular `orchestrator` build found; its repo README 404s (no screenshots).

---

## TARGET CHOSEN (user, 2026-10-02): the "Sales Dashboard"

Source: https://a2ui-composer.ag-ui.com/custom-catalog → Assembled Components → **Sales Dashboard**
(screenshot saved `b:\a2ui2\chart\image.png`). This is the CopilotKit composer = Way B's renderer
stack. We will **REBUILD** it in our stack (`@a2ui/react` + A2A + Strands/Groq), not import it.
Composer blurb: "11 components, runs alongside the basic catalog."

**What the dashboard contains (from the screenshot):**
- Title block: `Q1 2025 Sales Dashboard` + date range `Jan 1 – Mar 31, 2025`.
- **4 KPI/stat-tile cards** in a Row: Revenue (TOTAL, `$980K`, ↑ `+8.5%`), New customers (COUNT,
  `2,940`, ↑ `+5.2%`), Avg order value (AOV, `$333`, ↓ `-2.1%`), Churn (RATE, `4.4%`, → `+0.3%`).
  Each tile = title + sublabel + unit-label + big value + **trend arrow (up/down/neutral) & colored
  trendValue** (green up / red down / grey neutral).
- **Revenue by region** = **doughnut** (pie w/ hole), 4 colored segments.
- **Monthly revenue** = **bar chart** (Jan/Feb/Mar, green bars, $0–$360K axis).
- Quarter tabs Q1–Q4 (swap the data set) — that's just different `updateDataModel` payloads.

**Data shape (from the Component Data pane, `sales-data.json`, one tab per quarter):**
```jsonc
{
  "period": { "title": "Q1 2025 Sales Dashboard", "date_range": "Jan 1 – Mar 31, 2025" },
  "kpis": {
    "revenue":   { "label": "Total", "value": "$980K", "trend": "up",      "trendValue": "+8.5%" },
    "customers": { "label": "Count", "value": "2,940", "trend": "up",      "trendValue": "+5.2%" },
    "aov":       { "label": "AOV",   "value": "$333",  "trend": "down",    "trendValue": "-2.1%" },
    "churn":     { "label": "Rate",  "value": "4.4%",  "trend": "neutral", "trendValue": "+0.3%" }
  },
  "revenue_by_region": [ { "label": "North America", "value": 58, "color": "#3b82f6" }, ... ],
  "monthly_revenue":   [ /* Jan/Feb/Mar bars */ ]   // (below the fold, inferred)
}
```
> NOTE: KPI `value` is a **string** ("$980K", "4.4%") — pre-formatted by the agent; chart numbers
> (`value`) are numeric → confirms Way B's "coerce chart values to Number" gotcha.

**Catalog components we'll need (maps to Way B's 11-component set):**
`Card`/layout (basicCatalog gives Column/Row/Text), plus CUSTOM: **StatTile/Metric** (the KPI card
w/ trend), **PieChart** (doughnut), **BarChart**. Optionally StatusBadge/InfoRow/DataTable if we
want the full 11. For v1 the dashboard needs ≈ StatTile + PieChart + BarChart + a title/header.

**How it rebuilds in OUR structure (no architecture change — same as restaurant pipeline):**
1. CLIENT `a2ui_react`: add `src/catalog/` — StatTile, PieChart (doughnut), BarChart as
   `createComponentImplementation(api, Fc)` using **Recharts**; register
   `new MessageProcessor([basicCatalog, statTile, pieChart, barChart], actionCb)`.
2. AGENT `a2ui_agent`: new custom-catalog schema + few-shot examples (dashboard JSON) + a data
   tool (NOW: static sales-data like `get_restaurants`; LATER: **Snowflake** query) that fills
   `updateDataModel` with the shape above.
3. GATEWAY `a2ui_fastapi`: unchanged (still A2A client, wraps parts → SSE).
This IS the Snowflake→charts target with static data first; swap the tool for Snowflake later,
then move the agent to AgentCore + Gateway MCP.

## Open question for discussion (not decided)
- Do both as study, then build ONE React `Chart` in `a2ui_react` via `createComponentImplementation`
  (Recharts, props `type`/`title`/`chartData`, literal-or-binding, Number coercion), + a custom
  catalog schema + chart few-shot examples on the agent (clone rizzcharts' agent half)?
- Chart types to support first (pie/doughnut vs bar/line)? Drill-down in v1 or later?
- Snowflake data path: shape of `chartData` the agent emits.
