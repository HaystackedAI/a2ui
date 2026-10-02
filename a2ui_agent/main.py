import os

from strands.multiagent.a2a import A2AServer
from agent.brain import build_agent

# A2A server wrapping our Strands agent. agent_factory builds a fresh agent per
# A2A context (multi-tenant safe). http_url advertises the public URL in the
# agent card once we know the deployed URL (set AGENT_PUBLIC_URL in the cloud env).
server = A2AServer(
    agent_factory=lambda context_id: build_agent(),
    http_url=os.environ.get("AGENT_PUBLIC_URL"),
    serve_at_root=True,
)

app = server.to_fastapi_app()