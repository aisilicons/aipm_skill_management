"""Settings router - multi-key management and provider config."""
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from core.keystore import (
    list_keys, add_key, delete_key, activate_key,
    get_active_key, get_active_config
)
from core.config import test_provider

router = APIRouter()

PROVIDERS = [
    {"id": "anthropic", "name": "Anthropic Claude", "recommended": True, "free_tier": False,
     "models": ["claude-sonnet-4-6", "claude-opus-4-7", "claude-haiku-4-5"],
     "link": "https://console.anthropic.com/settings/keys", "base_url": ""},
    {"id": "groq", "name": "Groq", "recommended": False, "free_tier": True,
     "models": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
     "link": "https://console.groq.com", "base_url": "https://api.groq.com/openai/v1"},
    {"id": "google", "name": "Google Gemini", "recommended": False, "free_tier": True,
     "models": ["gemini-2.0-flash", "gemini-1.5-pro"],
     "link": "https://aistudio.google.com/apikey", "base_url": ""},
    {"id": "openai", "name": "OpenAI", "recommended": False, "free_tier": False,
     "models": ["gpt-4o", "gpt-4o-mini"],
     "link": "https://platform.openai.com/api-keys", "base_url": ""},
    {"id": "ollama", "name": "Ollama (Local)", "recommended": False, "free_tier": True,
     "models": ["llama3.1", "qwen2.5", "mistral"],
     "link": "https://ollama.com", "base_url": "http://host.docker.internal:11434/v1"},
]


class KeyAdd(BaseModel):
    provider: str
    nickname: str
    api_key: str
    model: str = ""
    base_url: str = ""
    set_active: bool = True


class KeyTest(BaseModel):
    provider: str
    api_key: str
    model: str = ""
    base_url: str = ""


@router.get("/providers")
async def get_providers():
    keys = list_keys()
    active = get_active_key()
    active_config = get_active_config()
    # Build masked display
    masked = ""
    if active:
        k = active.get("api_key", "")
        masked = (k[:8] + "..." + k[-4:]) if len(k) > 12 else ("***" if k else "")
    return {
        "keys": keys,
        "active": {
            "id": active["id"] if active else None,
            "provider": active_config.get("provider", ""),
            "model": active_config.get("model", ""),
            "nickname": active.get("nickname", "") if active else "",
            "key_masked": masked,
            "key_set": bool(active and active.get("api_key")),
        },
        "available_providers": PROVIDERS,
    }


@router.get("/keys")
async def get_keys():
    return {"keys": list_keys()}


@router.post("/keys")
async def create_key(body: KeyAdd):
    row = add_key(
        provider=body.provider,
        nickname=body.nickname,
        api_key=body.api_key,
        model=body.model,
        base_url=body.base_url,
        set_active=body.set_active,
    )
    return {"status": "saved", "key": row}


@router.delete("/keys/{key_id}")
async def remove_key(key_id: int):
    ok = delete_key(key_id)
    if not ok:
        raise HTTPException(404, "Key not found")
    return {"status": "deleted", "id": key_id}


@router.post("/keys/{key_id}/activate")
async def set_active_key(key_id: int):
    row = activate_key(key_id)
    if not row:
        raise HTTPException(404, "Key not found")
    return {"status": "activated", "key": row}


@router.post("/keys/test")
async def test_key(body: KeyTest):
    result = await test_provider({
        "provider": body.provider,
        "api_key": body.api_key,
        "model": body.model,
        "base_url": body.base_url,
    })
    return result


# Legacy endpoints (backward compat)
@router.post("/providers")
async def save_provider_legacy(body: dict):
    """Legacy single-provider save - creates/updates a key."""
    provider = body.get("provider", "anthropic")
    api_key = body.get("api_key", "")
    model = body.get("model", "")
    base_url = body.get("base_url", "")
    if not api_key:
        return {"status": "error", "message": "API key required"}
    nickname = f"{provider.title()} Key"
    add_key(provider=provider, nickname=nickname, api_key=api_key,
            model=model, base_url=base_url, set_active=True)
    return {"status": "saved", "provider": provider}


@router.post("/providers/test")
async def test_provider_legacy(body: dict):
    return await test_provider(body)


@router.get("/workspace")
async def get_workspace():
    ws = Path(os.environ.get("WORKSPACE_PATH", "/workspace"))
    projects_dir = ws / "my-projects"
    active = get_active_key()
    active_file = ws / "_system" / "active-project.md"
    return {
        "path": str(ws),
        "exists": ws.exists(),
        "initialized": (ws / "_system").exists(),
        "project_count": len(list(projects_dir.glob("PROJ-*"))) if projects_dir.exists() else 0,
        "active_project": active_file.read_text().strip() if active_file.exists() else "",
    }
