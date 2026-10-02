import json

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from datasource.restaurant_list import RESTAURANTS

app = FastAPI()

# The React client runs on a different origin (Vite :5173) than this API,
# so the browser needs CORS permission to POST here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

A2UI_MIME = "application/a2ui+json"
CATALOG_ID = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"


def _part(message: dict) -> dict:
    # Wrap one A2UI message as an A2A "data" part — the shape client.ts expects.
    return {"kind": "data", "data": message, "mimeType": A2UI_MIME}


def restaurant_list_surface() -> list[dict]:
    """The 3 A2UI messages for the restaurant-list surface:
    createSurface (canvas) -> updateComponents (layout) -> updateDataModel (data)."""
    return [
        {
            "version": "v0.9",
            "createSurface": {
                "surfaceId": "default",
                "catalogId": CATALOG_ID,
                "theme": {"primaryColor": "#FF0000", "font": "Roboto"},
            },
        },
        {
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": "default",
                "components": [
                    {"id": "root", "component": "Column", "children": ["title-heading", "item-list"]},
                    # Absolute binding: /title from the data root.
                    {"id": "title-heading", "component": "Text", "variant": "h1", "text": {"path": "/title"}},
                    # List stamps `item-card-template` once per element of /items.
                    {
                        "id": "item-list",
                        "component": "List",
                        "direction": "vertical",
                        "children": {"componentId": "item-card-template", "path": "/items"},
                    },
                    {"id": "item-card-template", "component": "Card", "child": "card-layout"},
                    {"id": "card-layout", "component": "Row", "children": ["template-image", "card-details"]},
                    # Relative bindings (no leading slash) resolve against the current item.
                    {"id": "template-image", "component": "Image", "url": {"path": "imageUrl"}, "weight": 1},
                    {
                        "id": "card-details",
                        "component": "Column",
                        "children": [
                            "template-name",
                            "template-rating",
                            "template-detail",
                            "template-link",
                            "template-book-button",
                        ],
                        "weight": 2,
                    },
                    {"id": "template-name", "component": "Text", "variant": "h3", "text": {"path": "name"}},
                    {"id": "template-rating", "component": "Text", "text": {"path": "rating"}},
                    {"id": "template-detail", "component": "Text", "text": {"path": "detail"}},
                    {"id": "template-link", "component": "Text", "text": {"path": "infoLink"}},
                    {
                        "id": "template-book-button",
                        "component": "Button",
                        "child": "book-now-text",
                        "variant": "primary",
                        # Per-item bindings are captured into the action context,
                        # so each button sends ITS restaurant's values back.
                        "action": {
                            "event": {
                                "name": "book_restaurant",
                                "context": {
                                    "restaurantName": {"path": "name"},
                                    "imageUrl": {"path": "imageUrl"},
                                    "address": {"path": "address"},
                                },
                            },
                        },
                    },
                    {"id": "book-now-text", "component": "Text", "text": "Book Now"},
                ],
            },
        },
        {
            "version": "v0.9",
            "updateDataModel": {
                "surfaceId": "default",
                "path": "/",
                "value": {
                    "title": "Top 5 Chinese Restaurants in New York",
                    "items": RESTAURANTS,
                },
            },
        },
    ]


@app.post("/a2a")
async def a2a(request: Request):
    body = (await request.body()).decode()
    print(f"[/a2a] received: {body!r}")

    async def stream():
        parts = [_part(m) for m in restaurant_list_surface()]
        # One SSE event: "data: <json array of parts>\n\n"
        yield f"data: {json.dumps(parts)}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/")
def main():
    return {"message": "Hello World"}
