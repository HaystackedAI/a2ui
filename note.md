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


A2UI transmits UI intent (semantic description). A sandbox transmits a realization (a concrete web document).
 What A2UI can do that a sandbox cannot, even in theory

1. Render as genuinely native, non-web widgets. A sandbox payload is a web document; off-web it's a webview — still web-in-a-box. The same A2UI message becomes a real Flutter widget, a native iOS/Android control, a desktop control, with no browser engine present at all. A sandbox categorically presupposes a web runtime; A2UI presupposes only "a renderer that knows the catalog."
2. Re-target to a different medium entirely. Because A2UI is intent, the same Button/DateTimeInput surface can be realized as a voice UI, a screen-reader-native flow, or a text terminal. You cannot losslessly turn a rendered HTML document into a voice interface — the realization is already baked in. This is the deepest one: a sandbox has already decided it's visual + DOM; A2UI hasn't.
3. Co-layout with host content. An iframe is a replaced element — a sealed box. The host browser will never reflow across that boundary; the agent's internal layout is opaque. A2UI nodes live in the host's own layout tree, so agent and host components can share one flex/scroll/grid flow. Seamless interleaving is categorically a native-render property.
4. One unified host-owned a11y / focus / theme / i18n tree. A sandbox keeps its own document, accessibility tree, and focus order; the host can't natively merge them. With A2UI the host is the renderer, so there's a single accessibility tree, focus order, theme-token system, and locale formatting spanning host + agent content.
5. A renderer-independent semantic contract. You noted a sandbox can bound its API — true. But that bound is this host's JS/DOM implementation. A2UI's catalog is a spec that independent renderers (React, Lit, Flutter…) implement natively with guaranteed semantics, so one agent drives many genuinely different clients. A per-host sandbox API can't give that portability guarantee in principle — it's tied to a DOM runtime.

What a sandbox can do that A2UI cannot, even in theory

Being honest the other way:

1. Arbitrary / novel content and client-side logic. A sandbox can render anything the web platform can — WebGL, canvas games, bespoke widgets — and run real imperative logic locally. A2UI is categorically limited to a declarative, pre-implemented vocabulary: the agent can only use components the client already ships. It cannot invent a new interactive widget or ship behavior. Catalog extensibility just moves the fence; at any instant the agent is bounded, and the client must already implement every component.
2. Local interactivity without a round-trip. Sandbox code runs on the client; A2UI actions generally round-trip to the agent.

The essence

- Sandbox = "here is a finished web thing, run it in a box." Maximally expressive, but web-bound and realization-bound forever.
- A2UI = "here is what I mean, you render it." Bounded in expressiveness, but medium-agnostic, platform-native, and contract-portable in ways a sandbox can't reach in principle.

So the real trade isn't security — it's expressiveness (sandbox wins) vs portability-of-intent (A2UI wins). You chose the "describe intent" side, which is the right call given your multi-platform/multi-agent target, and the wrong call if you needed arbitrary bespoke web widgets. That's the fair comparison.
