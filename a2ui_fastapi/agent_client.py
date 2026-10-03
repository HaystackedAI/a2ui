import json

import httpx
from a2a.client import A2ACardResolver, ClientConfig, ClientFactory
from a2a.client.helpers import create_text_message_object

# The deployed A2A agent. The gateway knows the agent's address, so it overrides
# the card's url (which is 127.0.0.1 until AGENT_PUBLIC_URL is set on the agent).
AGENT_URL = "https://a2ui-agent.fastapicloud.dev"            # restaurant agent
chart_AGENT_URL = "https://mcpserver.fastapicloud.dev"       # sales-dashboard chart agent

def chart_pick_agent(query: str) -> str:
    """Route the query to an agent URL. Keyword if-else for now
    (an LLM/router agent is the production upgrade, Stage C)."""
    q = query.lower()
    if "dashboard" in q or "sales" in q or "revenue" in q:
        return chart_AGENT_URL
    return AGENT_URL

def _find_ui_text(obj):
    """Recursively find the part `text` that holds the A2UI JSON."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "text" and isinstance(v, str) and "createSurface" in v:
                return v
            found = _find_ui_text(v)
            if found:
                return found
    elif isinstance(obj, list):
        for v in obj:
            found = _find_ui_text(v)
            if found:
                return found
    return None


async def ask_agent(query: str) -> list[dict]:
    """Send a text query to the A2A agent; return the parsed A2UI message list."""
    agent_url = chart_pick_agent(query)
    async with httpx.AsyncClient(timeout=90) as http_client:
        resolver = A2ACardResolver(http_client, base_url=agent_url)
        card = await resolver.get_agent_card()
        card = card.model_copy(update={"url": agent_url + "/"})  # use the known address
        client = ClientFactory(ClientConfig(httpx_client=http_client, streaming=True)).create(card)

        ui_text = None
        async for event in client.send_message(create_text_message_object(content=query)):
            objs = event if isinstance(event, tuple) else (event,)
            for obj in objs:
                if obj is None:
                    continue
                data = obj.model_dump() if hasattr(obj, "model_dump") else obj
                text = _find_ui_text(data)
                if text:
                    ui_text = text  # keep the last (most complete)

        if not ui_text:
            raise ValueError("Agent returned no A2UI content")
        return json.loads(ui_text)