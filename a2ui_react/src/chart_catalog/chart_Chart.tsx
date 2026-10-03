import { z } from 'zod'
import { createComponentImplementation } from '@a2ui/react/v0_9'
import { DynamicStringSchema, DataBindingSchema } from '@a2ui/web_core/v0_9'
import {
    PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const chart_ChartItemSchema = z.object({
    label: z.string(),
    value: z.number(),
    color: z.string().optional(),
})

// `type` is a literal enum (never bound, like `variant`). `chartData` is bindable:
// a literal array OR a {path} data-binding (DataBindingSchema), so the binder can
// resolve it from the data model.
export const chart_ChartApi = {
    name: 'Chart',
    schema: z
        .object({
            weight: z.number().optional(),
            type: z.enum(['doughnut', 'bar']),
            title: DynamicStringSchema.optional(),
            chartData: z.union([z.array(chart_ChartItemSchema), DataBindingSchema]),
        })
        .strict(),
}

// Validated categorical hues (dataviz reference palette, light): slots 1-3
// (blue/orange/aqua) pass the all-pairs CVD + normal-vision gates. The small
// remainder folds into a neutral "Other" gray — never a 4th competing hue.
const chart_CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a']
const chart_OTHER = '#898781'
const chart_INK = '#0b0b0b'
const chart_MUTED = '#898781'
const chart_GRID = '#e1e0d9'
const chart_BAR = '#2a78d6' // single-series sequential default (blue)

const chart_sliceColor = (d: { label: string; color?: string }, i: number) =>
    d.color ??
    (d.label.toLowerCase() === 'other' ? chart_OTHER : chart_CATEGORICAL[i % chart_CATEGORICAL.length])

const chart_fmtK = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`)

export const chart_Chart = createComponentImplementation(chart_ChartApi, ({ props }) => {
    // Defensive: use the array if resolved; coerce value to Number (LLM may send strings).
    const raw = Array.isArray(props.chartData) ? props.chartData : []
    const data = raw.map((d) => ({ label: d.label, value: Number(d.value), color: d.color }))

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
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: chart_INK }}>
                    {props.title}
                </div>
            )}
            <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                    {props.type === 'doughnut' ? (
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="label"
                                innerRadius={55}
                                outerRadius={95}
                            >
                                {data.map((d, i) => (
                                    <Cell key={i} fill={chart_sliceColor(d, i)} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v: any) => `${v}%`} />
                            <Legend />
                        </PieChart>
                    ) : (
                        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                            <CartesianGrid stroke={chart_GRID} strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fill: chart_MUTED, fontSize: 12 }}
                                axisLine={{ stroke: chart_GRID }}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={chart_fmtK}
                                tick={{ fill: chart_MUTED, fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                width={48}
                            />
                            <Tooltip formatter={(v: any) => chart_fmtK(Number(v))} />
                            <Bar dataKey="value" fill={chart_BAR} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    )
})
