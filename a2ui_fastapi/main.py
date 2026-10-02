import json

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import screens
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


def _part(message: dict) -> dict:
    # Wrap one A2UI message as an A2A "data" part — the shape client.ts expects.
    return {"kind": "data", "data": message, "mimeType": A2UI_MIME}


def handle(body: str) -> list[dict]:
    """Route the request to a screen based on what the client sent.

    - a JSON client message {version, action:{name, context}} -> next screen
    - anything else (a plain-text query) -> the restaurant list

    The action context arrives already resolved to concrete values by the
    client's MessageProcessor, so we just read them.
    """
    action = None
    try:
        parsed = json.loads(body)
        if isinstance(parsed, dict):
            action = parsed.get("action")
    except (json.JSONDecodeError, ValueError):
        pass  # not JSON -> treat as a text query

    if action:
        name = action.get("name")
        ctx = action.get("context") or {}
        if name == "book_restaurant":
            return screens.booking_form(
                ctx.get("restaurantName", "Restaurant"),
                ctx.get("imageUrl", ""),
                ctx.get("address", ""),
            )
        if name == "submit_booking":
            return screens.confirmation(
                ctx.get("restaurantName", "Restaurant"),
                ctx.get("partySize", "2"),
                ctx.get("reservationTime", ""),
                ctx.get("dietary", ""),
                ctx.get("imageUrl", ""),
            )

    return screens.restaurant_list(RESTAURANTS)


@app.post("/a2a")
async def a2a(request: Request):
    body = (await request.body()).decode()
    print(f"[/a2a] received: {body!r}")

    async def stream():
        parts = [_part(m) for m in handle(body)]
        # One SSE event: "data: <json array of parts>\n\n"
        yield f"data: {json.dumps(parts)}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/")
def main():
    return {"message": "Hello World"}
