import json
import os
import re

from strands import Agent
from strands.models.openai import OpenAIModel

from .prompt import SYSTEM_PROMPT
from .tools import chart_get_sales_data

MODEL_ID = "openai/gpt-oss-120b"  # Groq-hosted (OpenAI-compatible)
GROQ_BASE_URL = "https://api.groq.com/openai/v1"


def build_agent() -> Agent:
    model = OpenAIModel(
        client_args={
            "api_key": os.environ["GROQ_API_KEY"],
            "base_url": GROQ_BASE_URL,
        },
        model_id=MODEL_ID,
    )
    return Agent(
        model=model,
        system_prompt=SYSTEM_PROMPT,
        tools=[chart_get_sales_data],
        name="chart_agent",
        description="Renders a sales dashboard as A2UI.",
    )


def _extract_json(text: str):
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fence:
        text = fence.group(1).strip()
    return json.loads(text)


async def generate(query: str) -> list[dict]:
    """Run the agent for one query; return the parsed A2UI message list (1 retry on bad JSON)."""
    agent = build_agent()
    text = str(await agent.invoke_async(query))
    try:
        messages = _extract_json(text)
    except Exception:
        nudge = query + "\n\nReturn ONLY a JSON array of A2UI messages. No prose. No code fences."
        text = str(await agent.invoke_async(nudge))
        messages = _extract_json(text)

    if not (isinstance(messages, list) and messages and all(isinstance(m, dict) and "version" in m for m in messages)):
        raise ValueError(f"Agent did not return a valid A2UI message list: {text[:300]}")
    return messages