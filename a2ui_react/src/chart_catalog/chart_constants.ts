// Shared identifier for our custom "sales" catalog. The agent emits
// createSurface.catalogId = chart_SALES_CATALOG_ID; the client registers a Catalog
// under the same id so the MessageProcessor matches the surface to it.
// The URI does not need to resolve — it is just a stable identifier.
export const chart_SALES_CATALOG_ID =
  'https://haystackedai.com/a2ui/catalogs/sales/v0_9/catalog.json'
