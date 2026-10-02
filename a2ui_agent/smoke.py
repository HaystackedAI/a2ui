import asyncio
import os

from strands import Agent
from strands.models.gemini import GeminiModel

model = GeminiModel(
    model_id="gemini-3.6-flash",  # standard model id used across B:\too and B:\div
    client_args={"api_key": os.environ["GEMINI_API_KEY"]},
)
agent = Agent(model=model, system_prompt="You are concise.")


async def main():
    result = await agent.invoke_async("Say hello in one short sentence.")
    print("RESULT:", result)


asyncio.run(main())
