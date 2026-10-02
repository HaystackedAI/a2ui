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


# def handle(body: str) -> list[dict]:
#     """Route the request to a screen based on what the client sent.

#     - a JSON client message {version, action:{name, context}} -> next screen
#     - anything else (a plain-text query) -> the restaurant list

#     The action context arrives already resolved to concrete values by the
#     client's MessageProcessor, so we just read them.
#     """
#     action = None
#     try:
#         parsed = json.loads(body)
#         if isinstance(parsed, dict):
#             action = parsed.get("action")
#     except (json.JSONDecodeError, ValueError):
#         pass  # not JSON -> treat as a text query

#     if action:
#         name = action.get("name")
#         ctx = action.get("context") or {}
#         if name == "book_restaurant":
#             return screens.booking_form(
#                 ctx.get("restaurantName", "Restaurant"),
#                 ctx.get("imageUrl", ""),
#                 ctx.get("address", ""),
#             )
#         if name == "submit_booking":
#             return screens.confirmation(
#                 ctx.get("restaurantName", "Restaurant"),
#                 ctx.get("partySize", "2"),
#                 ctx.get("reservationTime", ""),
#                 ctx.get("dietary", ""),
#                 ctx.get("imageUrl", ""),
#             )

#     return screens.restaurant_list(RESTAURANTS)


# @app.post("/a2a")
# async def a2a(request: Request):
#     body = (await request.body()).decode()
#     print(f"[/a2a] received: {body!r}")

#     async def stream():
#         parts = [_part(m) for m in handle(body)]
#         # One SSE event: "data: <json array of parts>\n\n"
#         yield f"data: {json.dumps(parts)}\n\n"

#     return StreamingResponse(stream(), media_type="text/event-stream")


# @app.get("/")
# def main():
#     return {"message": "Hello World"}


def to_query(body: str) -> str:
    """Convert the browser POST into a text query for the agent.
    Plain text -> as-is. A JSON action -> a natural-language instruction
    (same mapping as the sample's agent_executor)."""
    try:
        parsed = json.loads(body)
    except (json.JSONDecodeError, ValueError):
        return body  # plain text query

    action = parsed.get("action") if isinstance(parsed, dict) else None
    if not action:
        return body
    name = action.get("name")
    ctx = action.get("context") or {}
    if name == "book_restaurant":
        return (
            f"USER_WANTS_TO_BOOK: {ctx.get('restaurantName', 'Restaurant')}, "
            f"Address: {ctx.get('address', '')}, ImageURL: {ctx.get('imageUrl', '')}"
        )
    if name == "submit_booking":
        return (
            f"User submitted a booking for {ctx.get('restaurantName', 'Restaurant')} "
            f"for {ctx.get('partySize', '2')} people at {ctx.get('reservationTime', '')} "
            f"with dietary requirements: {ctx.get('dietary', '')}. "
            f"The image URL is {ctx.get('imageUrl', '')}"
        )
    return f"User submitted an event: {name} with data: {ctx}"


@app.post("/a2a")
async def a2a(request: Request):
    body = (await request.body()).decode()
    query = to_query(body)
    print(f"[/a2a] body={body!r} -> query={query!r}")

    messages = await ask_agent(query)

    async def stream():
        parts = [_part(m) for m in messages]
        yield f"data: {json.dumps(parts)}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/")
def main():
    return {"message": "Hello World"}
