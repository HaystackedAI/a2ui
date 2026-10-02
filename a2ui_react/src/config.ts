// App configuration (non-secret, committed with the code — the React analog
// of a Python config.py). Secrets or per-environment build values would go in
// Vite's import.meta.env / .env instead.

// Deployed FastAPI backend (A2A/A2UI endpoint). Backend has no localhost — we
// always talk to the deployed service.
export const A2A_URL = 'https://a2ui-backend.fastapicloud.dev/a2a'
export const A2UI_AGENT_URL = 'https://a2ui-agent.fastapicloud.dev'
export const A2UI_FASTAPI_URL = 'https://a2ui-backend.fastapicloud.dev'