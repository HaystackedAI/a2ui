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
