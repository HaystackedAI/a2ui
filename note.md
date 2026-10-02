npm install @a2ui/react @a2ui/web_core @a2ui/markdown-it zod


What each piece does (the mental model you're building):
- MessageProcessor — the brain. You hand it a list of catalogs ([basicCatalog] = the component vocabulary it's allowed to render) and an action callback (fires when the user clicks a Button etc.). It ingests A2UI messages and maintains a reactive model of surfaces.
- processor.model.surfacesMap — a Map of all live surfaces. Right now it's empty (we've fed in no messages), so surfaces.length will be 0.
- <A2uiSurface surface={…}> — the React component that draws one surface's component tree. We map over every surface and render each.
- MarkdownContext.Provider value={renderMarkdown} — lets Text components render markdown (needed later for the "More Info" links). Harmless now.
- ReactComponentImplementation — the TypeScript generic that tells MessageProcessor it's producing React components. Matches the sample.
- useMemo(…, []) — create the processor once, not on every render.