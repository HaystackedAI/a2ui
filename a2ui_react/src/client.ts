import type { A2uiMessage, A2uiClientMessage } from '@a2ui/web_core/v0_9'

// One "part" of an A2A streamed message. We only care about kind:'data'
// (an A2UI message) and kind:'error'. 'text' parts are ignored here.
interface Part {
    kind: 'data' | 'text' | 'error'
    data?: Record<string, unknown>
    text?: string
    mimeType?: string
}

export class A2UIClient {
    // message = the user's typed query (string) OR a client message (an action
    // sent back to the agent). onChunk fires per SSE chunk so the UI can render
    // incrementally; the full list is also returned at the end.
    async send(
        message: A2uiClientMessage | string,
        onChunk?: (messages: A2uiMessage[]) => void,
    ): Promise<A2uiMessage[]> {
        const body = typeof message === 'string' ? message : JSON.stringify(message)

        const response = await fetch('/a2a', { method: 'POST', body })

        // A proxy error page is often HTML, not JSON — surface it clearly
        // instead of a confusing JSON parse error below.
        if (!response.ok && !response.headers.get('Content-Type')?.includes('application/json')) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`)
        }

        const contentType = response.headers.get('Content-Type')
        const allMessages: A2uiMessage[] = []
        const seenSurfaceIds = new Set<string>()

        if (contentType?.includes('text/event-stream')) {
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    buffer += decoder.decode(value, { stream: true })

                    // Split on blank lines (SSE event boundary); keep the last
                    // partial event in the buffer for the next read.
                    const lines = buffer.split(/\r?\n\r?\n/)
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue
                        try {
                            const parts = JSON.parse(line.slice(6)) as Part[]
                            const chunkMessages: A2uiMessage[] = []
                            for (const part of parts) {
                                if (part.kind === 'error') throw new Error(part.text)
                                if (part.kind === 'data' && part.data) {
                                    const uiMessage = part.data as unknown as A2uiMessage
                                    const createSurface = (uiMessage as { createSurface?: { surfaceId: string } }).createSurface
                                    if (createSurface) {
                                        if (seenSurfaceIds.has(createSurface.surfaceId)) continue
                                        seenSurfaceIds.add(createSurface.surfaceId)
                                    }
                                    chunkMessages.push(uiMessage)
                                }
                            }
                            if (chunkMessages.length > 0) {
                                allMessages.push(...chunkMessages)
                                onChunk?.(chunkMessages)
                            }
                        } catch (e) {
                            console.error('Error processing SSE chunk:', e)
                        }
                    }
                }
            }
        } else {
            // Non-streaming fallback: a plain JSON array of parts.
            const data = await response.json()
            if (data.error) throw new Error(data.error)
            for (const part of data as Part[]) {
                if (part.kind === 'data' && part.data) {
                    allMessages.push(part.data as unknown as A2uiMessage)
                }
            }
        }

        return allMessages
    }
}