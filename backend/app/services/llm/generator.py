import json
import logging
from typing import Dict, Any, Tuple
from backend.app.config import settings
from backend.app.services.llm.validator import (
    validate_narrative_grounding,
    generate_grounded_template_narrative
)

logger = logging.getLogger(__name__)

async def generate_area_narrative(
    title: str,
    metrics: Dict[str, Any]
) -> Tuple[str, bool]:
    """
    Generates a natural-language report narrative.
    Returns (narrative_text, is_llm_generated).
    Guarantees strict grounding against metrics.
    """
    provider = (settings.LLM_PROVIDER or "none").lower()

    # If no LLM provider configured or keys missing, return grounded template immediately
    if provider in ("none", "local") or (provider == "gemini" and not settings.GEMINI_API_KEY) or (provider == "openai" and not settings.OPENAI_API_KEY):
        return generate_grounded_template_narrative(title, metrics), False

    prompt = (
        f"You are an expert commercial retail expansion analyst for Savomart grocery chain in Chennai.\n"
        f"Write a concise executive assessment for the area '{title}'.\n"
        f"CRITICAL RULE: You may ONLY cite numbers that exist in this exact input JSON:\n"
        f"{json.dumps(metrics, indent=2)}\n"
        f"Do NOT invent or extrapolate any population figures or percentages not in the JSON.\n"
        f"Format in clear markdown sections: Executive Summary, Strategic Strengths, Key Risks, and Scouting Recommendation."
    )

    try:
        if provider == "gemini":
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2}
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidate_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    # Validate grounding
                    if validate_narrative_grounding(candidate_text, metrics):
                        return candidate_text, True
                    else:
                        logger.warning("LLM output rejected by grounding validator (unverified numbers detected).")
        elif provider == "openai":
            import httpx
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
            payload = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidate_text = data["choices"][0]["message"]["content"]
                    if validate_narrative_grounding(candidate_text, metrics):
                        return candidate_text, True
                    else:
                        logger.warning("OpenAI output rejected by grounding validator.")
    except Exception as e:
        logger.error(f"Error calling LLM provider {provider}: {e}")

    # Fallback to deterministic grounded template
    return generate_grounded_template_narrative(title, metrics), False
