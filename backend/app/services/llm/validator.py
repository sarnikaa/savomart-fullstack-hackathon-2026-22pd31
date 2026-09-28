import re
from typing import Dict, Any, List, Set

def extract_numbers_from_text(text: str) -> Set[str]:
    """Find all numeric tokens in text (e.g. 84, 84.5, 2.4)."""
    # Matches integers and decimals
    tokens = re.findall(r'\b\d+(?:\.\d+)?\b', text)
    return set(tokens)

def collect_numbers_from_dict(data: Any) -> Set[str]:
    """Recursively collect all numeric strings from dictionary or list."""
    numbers = set()
    if isinstance(data, dict):
        for v in data.values():
            numbers.update(collect_numbers_from_dict(v))
    elif isinstance(data, list):
        for item in data:
            numbers.update(collect_numbers_from_dict(item))
    elif isinstance(data, (int, float)):
        numbers.add(str(data))
        # Also store rounded version
        if isinstance(data, float):
            numbers.add(f"{data:.1f}")
            numbers.add(f"{int(data)}")
    elif isinstance(data, str):
        # check if it contains numbers
        numbers.update(extract_numbers_from_text(data))
    return numbers

def validate_narrative_grounding(narrative: str, metrics: Dict[str, Any]) -> bool:
    """
    Returns True if every number mentioned in narrative is derived from metrics.
    Rejects any ungrounded / hallucinated numbers.
    """
    text_numbers = extract_numbers_from_text(narrative)
    allowed_numbers = collect_numbers_from_dict(metrics)
    
    # Common harmless numbers allowed in prose (like 1, 2, 3 in bullet lists, 10 for top-10, 100 for score base, 24 for 24/7)
    safe_whitelisted = {"1", "2", "3", "4", "5", "10", "100", "24", "7"}
    
    for num in text_numbers:
        if num in safe_whitelisted:
            continue
        if num not in allowed_numbers:
            # Check float equivalence (e.g. "2.40" vs "2.4")
            try:
                val = float(num)
                if not any(abs(val - float(a)) < 0.05 for a in allowed_numbers if re.match(r'^\d+(\.\d+)?$', a)):
                    return False
            except ValueError:
                return False
    return True

def generate_grounded_template_narrative(title: str, metrics: Dict[str, Any]) -> str:
    """
    Deterministic template fallback when no LLM is used or LLM failed validation.
    Labeled explicitly.
    """
    sub = metrics.get("subscores", {})
    raw = metrics.get("raw_counts", {})
    fitness = metrics.get("fitness_score", 0.0)
    nearest_km = raw.get("nearest_savomart_km", 0.0)
    c_risk = metrics.get("is_cannibalisation_risk", False)

    canni_note = (
        f"Nearest operational Savomart is {nearest_km:.1f} km away (Cannibalisation Risk flagged)."
        if c_risk else
        f"Existing Savomart coverage safe ({nearest_km:.1f} km away)."
    )

    return (
        f"### Area Fitness Report: {title}\n\n"
        f"**Overall Score:** {fitness}/100\n\n"
        f"**Grounded Assessment (Template summary - no LLM):**\n"
        f"- **Residential Base:** Score {sub.get('residential_density', 0)}/100 ({raw.get('residential_units', 0)} residential structures identified).\n"
        f"- **Commercial Activity:** Score {sub.get('commercial_vitality', 0)}/100 ({raw.get('commercial_points', 0)} commercial footfall generators).\n"
        f"- **Competitive White Space:** Score {sub.get('competitive_gap', 0)}/100 with {raw.get('competitors', 0)} direct competitors.\n"
        f"- **Transit & Road Access:** Score {sub.get('transit_accessibility', 0)}/100 ({raw.get('transit_points', 0)} transit hubs).\n"
        f"- **Cannibalisation:** {canni_note}\n\n"
        f"**Verdict:** {'Recommended for primary field scouting.' if fitness >= 70 else 'Secondary priority; evaluate specific micro-pockets only.'}"
    )
