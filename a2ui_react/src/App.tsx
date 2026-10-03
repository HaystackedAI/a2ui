import { useMemo, useState, useEffect, useRef, useCallback, type FormEvent } from 'react'
import { A2uiSurface, basicCatalog, MarkdownContext, type ReactComponentImplementation, } from '@a2ui/react/v0_9'
import { MessageProcessor } from '@a2ui/web_core/v0_9'
import { renderMarkdown } from '@a2ui/markdown-it'

import type { A2uiClientMessage } from '@a2ui/web_core/v0_9'
import { A2UIClient } from './client'


import { chart_salesCatalog } from './chart_catalog/chart_catalog'
import { chart_devDashboardMessages } from './chart_catalog/chart_devDashboard'


// Minimal branding (port configs/* later).
const config = { title: 'COA Finder', placeholder: 'Find me an COA' }

function App() {
    const client = useMemo(() => new A2UIClient(), [])
    // The processor's action callback needs to call sendAndProcess, but
    // sendAndProcess is defined below and depends on the processor. Break the
    // cycle with a ref the callback reads at call time.
    const sendRef = useRef<((m: A2uiClientMessage | string) => Promise<void>) | null>(null)

    // const processor = useMemo(
    //     () =>
    //         new MessageProcessor<ReactComponentImplementation>([basicCatalog, chart_salesCatalog], (action) => {
    //             console.log('User action:', action)
    //             sendRef.current?.({ version: 'v0.9', action })
    //         }),
    //     [],
    // )


    const processor = useMemo(() => {
        const p = new MessageProcessor<ReactComponentImplementation>([basicCatalog, chart_salesCatalog], (action) => {
            console.log('User action:', action)
            sendRef.current?.({ version: 'v0.9', action })
        })
        // DEV (throwaway): preview the hardcoded dashboard surface on load.
        p.processMessages(chart_devDashboardMessages)
        return p
    }, [])

    const [surfaces, setSurfaces] = useState<ReturnType<typeof getSurfaces>>(() => getSurfaces(processor))
    const [requesting, setRequesting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [started, setStarted] = useState(false)

    useEffect(() => {
        const sub1 = processor.onSurfaceCreated((surface) => setSurfaces((prev) => [...prev, surface]))
        const sub2 = processor.onSurfaceDeleted((id) => setSurfaces((prev) => prev.filter((s) => s.id !== id)))
        return () => {
            sub1.unsubscribe()
            sub2.unsubscribe()
        }
    }, [processor])

    const sendAndProcess = useCallback(
        async (message: A2uiClientMessage | string) => {
            try {
                setRequesting(true)
                setError(null)
                setStarted(true)
                // Clear old surfaces so each turn renders fresh.
                Array.from(processor.model.surfacesMap.keys()).forEach((id) => processor.model.deleteSurface(id))

                await client.send(message, (chunk) => {
                    console.log('Chunk:', chunk)
                    processor.processMessages(chunk)
                })
            } catch (err) {
                console.error(err)
                setError(err instanceof Error ? err.message : 'An error occurred')
            } finally {
                setRequesting(false)
            }
        },
        [client, processor],
    )

    useEffect(() => {
        sendRef.current = sendAndProcess
    }, [sendAndProcess])

    const handleSubmit = useCallback(
        (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault()
            const body = new FormData(e.currentTarget).get('body') as string
            if (body) sendAndProcess(body)
        },
        [sendAndProcess],
    )

    const showForm = !requesting && !started

    return (
        <MarkdownContext.Provider value={renderMarkdown}>
            <div style={{ padding: 24 }}>
                {showForm && (
                    <form onSubmit={handleSubmit}>
                        <h1>{config.title}</h1>
                        <input name="body" defaultValue={config.placeholder} autoComplete="off" required />
                        <button type="submit">Send</button>
                    </form>
                )}
                {requesting && <div>Loading…</div>}
                {error && <div style={{ color: 'crimson' }}>{error}</div>}
                {surfaces.map((s) => (
                    <A2uiSurface key={s.id} surface={s} />
                ))}
            </div>
        </MarkdownContext.Provider>
    )
}

function getSurfaces(processor: MessageProcessor<ReactComponentImplementation>) {
    return Array.from(processor.model.surfacesMap.values())
}

export default App