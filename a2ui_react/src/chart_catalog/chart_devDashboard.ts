import type { A2uiMessage } from '@a2ui/web_core/v0_9'
import { chart_SALES_CATALOG_ID } from './chart_constants'

// DEV ONLY (throwaway): a hardcoded dashboard surface to preview custom components
// before the agent emits them. KPIs only in A4b; charts added in A5/A6.
export const chart_devDashboardMessages: A2uiMessage[] = [
    {
        version: 'v0.9',
        createSurface: { surfaceId: 'sales-dashboard', catalogId: chart_SALES_CATALOG_ID },
    },
    {
        version: 'v0.9',
        updateComponents: {
            surfaceId: 'sales-dashboard',
            components: [
                { id: 'root', component: 'Column', children: ['dash-header', 'kpis', 'charts', 'orders-card'] },
                { id: 'dash-header', component: 'Column', children: ['dash-title', 'dash-subtitle'] },
                { id: 'dash-title', component: 'Text', variant: 'h1', text: { path: '/title' } },
                { id: 'dash-subtitle', component: 'Text', variant: 'caption', text: { path: '/dateRange' } },
                {
                    id: 'kpis',
                    component: 'List',
                    direction: 'horizontal',
                    children: { componentId: 'kpi-tpl', path: '/kpis' },
                },
                {
                    id: 'kpi-tpl',
                    component: 'StatTile',
                    title: { path: 'title' },
                    caption: { path: 'caption' },
                    value: { path: 'value' },
                    trend: { path: 'trend' },
                    trendValue: { path: 'trendValue' },
                },
                { id: 'charts', component: 'Row', children: ['card-region', 'card-monthly'] },
                { id: 'card-region', component: 'Card', child: 'region-chart', weight: 1 },
                {
                    id: 'region-chart',
                    component: 'Chart',
                    type: 'doughnut',
                    title: 'Revenue by region',
                    chartData: { path: '/revenueByRegion' },
                },
                { id: 'card-monthly', component: 'Card', child: 'monthly-chart', weight: 1 },
                {
                    id: 'monthly-chart',
                    component: 'Chart',
                    type: 'bar',
                    title: 'Monthly revenue',
                    chartData: { path: '/monthlyRevenue' },
                },
                { id: 'orders-card', component: 'Card', child: 'orders-table' },
                {
                    id: 'orders-table',
                    component: 'DataTable',
                    title: 'Recent orders',
                    caption: 'Top 5 by value this week',
                    columns: [
                        { key: 'order', label: 'Order' },
                        { key: 'customer', label: 'Customer' },
                        { key: 'region', label: 'Region' },
                        { key: 'total', label: 'Total', align: 'right' },
                        { key: 'status', label: 'Status' },
                    ],
                    rows: { path: '/recentOrders' },
                    statusColumn: 'status',
                },
            ],
        },
    },
    {
        version: 'v0.9',
        updateDataModel: {
            surfaceId: 'sales-dashboard',
            path: '/',
            value: {
                title: 'Q1 2025 Sales Dashboard',
                dateRange: 'Jan 1 – Mar 31, 2025',
                kpis: [
                    { title: 'Revenue', caption: 'Quarter-to-date', value: '$980K', trend: 'up', trendValue: '+8.5%' },
                    { title: 'New customers', caption: 'vs. last year', value: '2,940', trend: 'up', trendValue: '+5.2%' },
                    { title: 'Avg order value', caption: 'vs. last year', value: '$333', trend: 'down', trendValue: '-2.1%' },
                    { title: 'Churn', caption: 'Monthly average', value: '4.4%', trend: 'neutral', trendValue: '+0.3%' },
                ],
                revenueByRegion: [
                    { label: 'North America', value: 58 },
                    { label: 'Europe', value: 22 },
                    { label: 'Asia Pacific', value: 14 },
                    { label: 'Other', value: 6 },
                ],
                monthlyRevenue: [
                    { label: 'Jan', value: 270000 },
                    { label: 'Feb', value: 300000 },
                    { label: 'Mar', value: 360000 },
                ],
                recentOrders: [
                    { order: '#10482', customer: 'Acme Corp', region: 'NA', total: '$12,480', status: 'Paid' },
                    { order: '#10483', customer: 'Globex', region: 'EU', total: '$8,320', status: 'Paid' },
                    { order: '#10484', customer: 'Initech', region: 'NA', total: '$6,150', status: 'Pending' },
                    { order: '#10485', customer: 'Hooli', region: 'NA', total: '$5,940', status: 'Paid' },
                    { order: '#10486', customer: 'Umbrella Corp', region: 'APAC', total: '$4,220', status: 'Failed' },
                ],
            },
        },
    },
]