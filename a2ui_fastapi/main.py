import json

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI()

# The React client runs on a different origin (Vite :5003) than this API,
# so the browser needs CORS permission to POST here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

A2UI_MIME = "application/a2ui+json"


def _part(message: dict) -> dict:
    # Wrap one A2UI message as an A2A "data" part — the shape client.ts expects.
    return {"kind": "data", "data": message, "mimeType": A2UI_MIME}


def hello_surface() -> list[dict]:
    return [
        {
            "version": "v0.9",
            "createSurface": {
                "surfaceId": "default",
                "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
                "theme": {"primaryColor": "#FF0000", "font": "Roboto"},
            },
        },
        {
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": "default",
                "components": [
                    {"id": "root", "component": "Column", "children": ["hello"]},
                    {"id": "hello", "component": "Text", "variant": "h1", "text": {"path": "/title"}},
                ],
            },
        },
        {
            "version": "v0.9",
            "updateDataModel": {
                "surfaceId": "default",
                "path": "/",
                "value": {"title": "Hello from FastAPI"},
            },
        },
    ]


@app.post("/a2a")
async def a2a(request: Request):
    body = (await request.body()).decode()
    print(f"[/a2a] received: {body!r}")

    async def stream():
        parts = [_part(m) for m in hello_surface()]
        # One SSE event: "data: <json array of parts>\n\n"
        yield f"data: {json.dumps(parts)}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/")
def main():
    return {"message": "Hello World"}