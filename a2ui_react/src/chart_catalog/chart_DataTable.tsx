import { z } from 'zod'
import { createComponentImplementation } from '@a2ui/react/v0_9'
import { DynamicStringSchema, DataBindingSchema } from '@a2ui/web_core/v0_9'

const chart_ColumnSchema = z.object({
    key: z.string(),
    label: z.string(),
    align: z.enum(['left', 'right']).optional(),
})

export const chart_DataTableApi = {
    name: 'DataTable',
    schema: z
        .object({
            weight: z.number().optional(),
            title: DynamicStringSchema.optional(),
            caption: DynamicStringSchema.optional(),
            // columns = layout (literal, not bound); rows = data (bindable to a {path} array)
            columns: z.array(chart_ColumnSchema),
            rows: z.union([z.array(z.record(z.string(), z.any())), DataBindingSchema]),
            statusColumn: z.string().optional(),
        })
        .strict(),
}

// Reserved status palette (dataviz skill) — never a categorical hue; dot + text so
// the status never rides on color alone.
const chart_STATUS: Record<string, string> = {
    paid: '#0ca30c', // good
    pending: '#fab219', // warning
    failed: '#d03b3b', // critical
}
const chart_INK = '#0b0b0b'
const chart_SECONDARY = '#52514e'
const chart_MUTED = '#898781'
const chart_HAIR = '#e1e0d9'

// Plain helper (NOT a JSX component) — returns the badge markup for a status cell.
function chart_statusCell(value: string) {
    const color = chart_STATUS[value.toLowerCase()] ?? chart_MUTED
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: chart_INK }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
            {value}
        </span>
    )
}

export const chart_DataTable = createComponentImplementation(chart_DataTableApi, ({ props }) => {
    const rows = Array.isArray(props.rows) ? props.rows : []
    const cols = props.columns

    return (
        <div
            style={{
                flex: props.weight ?? 1,
                margin: 8,
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                background: '#fcfcfb',
            }}
        >
            {props.title && (
                <div style={{ fontSize: 15, fontWeight: 600, color: chart_INK }}>{props.title}</div>
            )}
            {props.caption && (
                <div style={{ fontSize: 13, color: chart_SECONDARY, marginBottom: 10 }}>{props.caption}</div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                    <tr>
                        {cols.map((c) => (
                            <th
                                key={c.key}
                                style={{
                                    textAlign: c.align ?? 'left',
                                    padding: '8px 10px',
                                    borderBottom: `1px solid ${chart_HAIR}`,
                                    color: chart_MUTED,
                                    fontWeight: 600,
                                }}
                            >
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            {cols.map((c) => (
                                <td
                                    key={c.key}
                                    style={{
                                        textAlign: c.align ?? 'left',
                                        padding: '8px 10px',
                                        borderBottom: `1px solid ${chart_HAIR}`,
                                        color: chart_INK,
                                        fontVariantNumeric: c.align === 'right' ? 'tabular-nums' : undefined,
                                    }}
                                >
                                    {c.key === props.statusColumn
                                        ? chart_statusCell(String(r[c.key] ?? ''))
                                        : String(r[c.key] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
})