# Sample-level static sales data. Top-level keys match the A2UI data-model paths
# the client's chart_catalog components read (/title, /dateRange, /kpis,
# /revenueByRegion, /monthlyRevenue, /recentOrders). Snowflake replaces the body
# later; the shape stays identical.
chart_SALES = {
    "title": "Q1 2025 Sales Dashboard",
    "dateRange": "Jan 1 – Mar 31, 2025",
    "kpis": [
        {"title": "Revenue", "caption": "Quarter-to-date", "value": "$980K", "trend": "up", "trendValue": "+8.5%"},
        {"title": "New customers", "caption": "vs. last year", "value": "2,940", "trend": "up", "trendValue": "+5.2%"},
        {"title": "Avg order value", "caption": "vs. last year", "value": "$333", "trend": "down", "trendValue": "-2.1%"},
        {"title": "Churn", "caption": "Monthly average", "value": "4.4%", "trend": "neutral", "trendValue": "+0.3%"},
    ],
    "revenueByRegion": [
        {"label": "North America", "value": 58},
        {"label": "Europe", "value": 22},
        {"label": "Asia Pacific", "value": 14},
        {"label": "Other", "value": 6},
    ],
    "monthlyRevenue": [
        {"label": "Jan", "value": 270000},
        {"label": "Feb", "value": 300000},
        {"label": "Mar", "value": 360000},
    ],
    "recentOrders": [
        {"order": "#10482", "customer": "Acme Corp", "region": "NA", "total": "$12,480", "status": "Paid"},
        {"order": "#10483", "customer": "Globex", "region": "EU", "total": "$8,320", "status": "Paid"},
        {"order": "#10484", "customer": "Initech", "region": "NA", "total": "$6,150", "status": "Pending"},
        {"order": "#10485", "customer": "Hooli", "region": "NA", "total": "$5,940", "status": "Paid"},
        {"order": "#10486", "customer": "Umbrella Corp", "region": "APAC", "total": "$4,220", "status": "Failed"},
    ],
}