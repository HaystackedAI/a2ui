import { z } from 'zod'
import { createComponentImplementation } from '@a2ui/react/v0_9'
import { DynamicStringSchema } from '@a2ui/web_core/v0_9'

// --- Contract: component name + Zod schema of its props. ---
// DynamicStringSchema = a literal string OR a {path} binding; the renderer's
// binder resolves it to a plain string before our View sees it. `weight` is the
// catalog common prop (flex-grow inside a Row/Column), like the basic components.
export const chart_StatTileApi = {
    name: 'StatTile',
    schema: z
        .object({
            weight: z.number().optional(),
            title: DynamicStringSchema,
            caption: DynamicStringSchema.optional(),
            value: DynamicStringSchema,
            trend: DynamicStringSchema.optional(),
            trendValue: DynamicStringSchema.optional(),
        })
        .strict(),
}

const chart_TREND = {
    up: { arrow: '↑', color: '#006300' },      // success delta (light)
    down: { arrow: '↓', color: '#d03b3b' },    // critical
    neutral: { arrow: '→', color: '#898781' }, // muted
} as const

// --- View: props arrive already resolved (strings / enum / number). ---
export const chart_StatTile = createComponentImplementation(chart_StatTileApi, ({ props }) => {
    const key = props.trend === 'up' || props.trend === 'down' ? props.trend : 'neutral'
    const t = chart_TREND[key]
    return (
        <div
            style={{
                flex: props.weight ?? 1,
                minWidth: 180,
                padding: 20,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                background: '#fff',
            }}
        >
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{props.title}</div>
            {props.caption && (
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{props.caption}</div>
            )}
            <div style={{ fontSize: 30, fontWeight: 700, color: '#111827', marginTop: 14 }}>
                {props.value}
            </div>
            {props.trendValue && (
                <div style={{ fontSize: 14, color: t.color, marginTop: 4 }}>
                    {t.arrow} {props.trendValue}
                </div>
            )}
        </div>
    )
})
