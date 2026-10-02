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
