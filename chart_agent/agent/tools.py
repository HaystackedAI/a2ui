import json
from strands import tool
from datasource.chart_sales import chart_SALES


@tool
def chart_get_sales_data() -> str:
    """Get the sales dashboard data: KPIs, revenue by region, monthly revenue, recent orders.

    Returns a JSON object with keys: title, dateRange, kpis, revenueByRegion,
    monthlyRevenue, recentOrders — ready to drop into updateDataModel at path "/".
    """
    return json.dumps(chart_SALES)