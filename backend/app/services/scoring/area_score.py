import math
from typing import Dict, Any, List, Tuple

DEFAULT_WEIGHTS = {
    "residential_density": 0.30,
    "commercial_vitality": 0.25,
    "competitive_gap": 0.20,
    "transit_accessibility": 0.15,
    "cannibalisation_safety": 0.10,
}

# Empirical percentile thresholds for Chennai urban H3 resolution 9 cells
CHENNAI_BENCHMARKS = {
    "residential": {"p25": 12, "p50": 35, "p75": 70, "p90": 120},
    "commercial": {"p25": 8, "p50": 24, "p75": 55, "p90": 95},
    "transit": {"p25": 2, "p50": 6, "p75": 14, "p90": 25},
    "competitors": {"p25": 1, "p50": 4, "p75": 9, "p90": 18},
}

def calculate_percentile_score(value: float, benchmarks: Dict[str, float]) -> float:
    """Map raw count to 0-100 percentile rank based on Chennai distribution."""
    if value <= 0:
        return 5.0
    if value <= benchmarks["p25"]:
        return 10.0 + (value / benchmarks["p25"]) * 15.0
    if value <= benchmarks["p50"]:
        return 25.0 + ((value - benchmarks["p25"]) / (benchmarks["p50"] - benchmarks["p25"])) * 25.0
    if value <= benchmarks["p75"]:
        return 50.0 + ((value - benchmarks["p50"]) / (benchmarks["p75"] - benchmarks["p50"])) * 25.0
    if value <= benchmarks["p90"]:
        return 75.0 + ((value - benchmarks["p75"]) / (benchmarks["p90"] - benchmarks["p75"])) * 15.0
    # Top 10%
    excess = min(value - benchmarks["p90"], benchmarks["p90"])
    return 90.0 + (excess / benchmarks["p90"]) * 10.0

def calculate_cannibalisation_safety(nearest_store_km: float) -> Tuple[float, bool]:
    """
    Cannibalisation Safety:
    C_safe = 100 * clamp((d - 0.8) / (2.0 - 0.8), 0, 1)
    Hard Cannibalisation Risk flag if d < 0.8 km.
    """
    if nearest_store_km is None:
        return 100.0, False
    
    is_risk = nearest_store_km < 0.8
    if nearest_store_km >= 2.0:
        score = 100.0
    elif nearest_store_km <= 0.8:
        score = max(0.0, (nearest_store_km / 0.8) * 20.0) # Penalty curve
    else:
        score = 20.0 + ((nearest_store_km - 0.8) / (2.0 - 0.8)) * 80.0
    
    return round(score, 1), is_risk

def compute_area_fitness_score(
    residential_count: int,
    commercial_count: int,
    transit_count: int,
    competitor_count: int,
    nearest_savomart_km: float,
    available_signals: List[str] = None
) -> Dict[str, Any]:
    """
    Compute deterministic, explainable Area Fitness Score (0-100)
    with weight renormalisation if any signal is missing.
    """
    d_res = calculate_percentile_score(residential_count, CHENNAI_BENCHMARKS["residential"])
    v_com = calculate_percentile_score(commercial_count, CHENNAI_BENCHMARKS["commercial"])
    a_trans = calculate_percentile_score(transit_count, CHENNAI_BENCHMARKS["transit"])
    
    # Competitive Gap: high residential with low competitors = massive white space opportunity
    # Saturation ratio: competitors per 10 residential units
    ratio = competitor_count / max(1.0, residential_count / 10.0)
    if ratio <= 0.3:
        g_comp = 95.0 # High unserved white space
    elif ratio <= 0.8:
        g_comp = 80.0
    elif ratio <= 1.5:
        g_comp = 60.0
    elif ratio <= 2.5:
        g_comp = 40.0
    else:
        g_comp = 20.0 # Heavily saturated
    
    c_safe, is_canni_risk = calculate_cannibalisation_safety(nearest_savomart_km)

    raw_scores = {
        "residential_density": round(d_res, 1),
        "commercial_vitality": round(v_com, 1),
        "competitive_gap": round(g_comp, 1),
        "transit_accessibility": round(a_trans, 1),
        "cannibalisation_safety": round(c_safe, 1),
    }

    # Weight renormalisation if signals are missing
    active_weights = {}
    total_active_weight = 0.0
    for key, weight in DEFAULT_WEIGHTS.items():
        if available_signals is None or key in available_signals:
            active_weights[key] = weight
            total_active_weight += weight
    
    renormalised_weights = {k: v / total_active_weight for k, v in active_weights.items()}

    final_score = 0.0
    for k, w in renormalised_weights.items():
        final_score += raw_scores[k] * w

    # If severe cannibalisation risk, apply cap
    if is_canni_risk:
        final_score = min(final_score, 65.0)

    final_score = round(final_score, 1)

    return {
        "fitness_score": final_score,
        "is_cannibalisation_risk": is_canni_risk,
        "subscores": raw_scores,
        "weights_used": {k: round(w, 4) for k, w in renormalised_weights.items()},
        "raw_counts": {
            "residential_units": residential_count,
            "commercial_points": commercial_count,
            "transit_points": transit_count,
            "competitors": competitor_count,
            "nearest_savomart_km": nearest_savomart_km,
        }
    }
