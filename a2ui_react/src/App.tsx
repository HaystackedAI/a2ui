import { useMemo } from 'react'
import {
    A2uiSurface,
    basicCatalog,
    MarkdownContext,
    type ReactComponentImplementation,
} from '@a2ui/react/v0_9'
import { MessageProcessor } from '@a2ui/web_core/v0_9'
import { renderMarkdown } from '@a2ui/markdown-it'

function App() {
    const processor = useMemo(
        () =>
            new MessageProcessor<ReactComponentImplementation>([basicCatalog], (action) => {
                console.log('User action:', action)
            }),
        [],
    )

    const surfaces = Array.from(processor.model.surfacesMap.values())

    return (
        <MarkdownContext.Provider value={renderMarkdown}>
            <div style={{ padding: 24 }}>Shell ready. Surfaces: {surfaces.length}</div>
            {surfaces.map((s) => (
                <A2uiSurface key={s.id} surface={s} />
            ))}
        </MarkdownContext.Provider>
    )
}

export default App