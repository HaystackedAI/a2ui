import { Catalog } from '@a2ui/web_core/v0_9'
import { basicCatalog, type ReactComponentImplementation } from '@a2ui/react/v0_9'
import { chart_SALES_CATALOG_ID } from './chart_constants'
import { chart_StatTile } from './chart_StatTile'
import { chart_Chart } from './chart_Chart'
import { chart_DataTable } from './chart_DataTable'

// Our catalog = all the basic components PLUS our custom ones, under our own id.
// A surface names ONE catalogId; the dashboard needs both basic layout
// (Column/Row/Card/Text/List) and custom (StatTile/Chart), so they live together.
export const chart_salesCatalog = new Catalog<ReactComponentImplementation>(
    chart_SALES_CATALOG_ID,
    basicCatalog.protocolVersion,
    [...basicCatalog.components.values(), chart_StatTile, chart_Chart, chart_DataTable],
    [...basicCatalog.functions.values()],
    basicCatalog.themeSchema,
)