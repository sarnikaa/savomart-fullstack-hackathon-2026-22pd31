from typing import Dict, Any, List, Optional

# Mock retail rent benchmarks per sqft for key Chennai localities
LOCALITY_RENT_BENCHMARKS = {
    "velachery": 85.0,
    "mylapore": 125.0,
    "anna nagar": 140.0,
    "t. nagar": 175.0,
    "adyar": 115.0,
    "tambaram": 65.0,
    "porur": 70.0,
    "omr": 60.0,
    "default": 80.0,
}

def get_locality_benchmark(pincode: str, locality_name: Optional[str]) -> float:
    name_clean = (locality_name or "").lower()
    for loc, val in LOCALITY_RENT_BENCHMARKS.items():
        if loc in name_clean:
            return val
    return LOCALITY_RENT_BENCHMARKS["default"]

def compute_property_evaluation(
    rent_monthly: Optional[float],
    carpet_area_sqft: float,
    frontage_ft: float,
    ceiling_height_ft: float,
    floor_position: str,
    road_width_ft: float,
    parking_four_wheeler: int,
    has_power_backup: bool,
    has_loading_dock: bool,
    area_fitness_score: float,
    catchment_quality_score: Optional[float] = None,
    locality_name: Optional[str] = None,
    pincode: str = "600001",
) -> Dict[str, Any]:
    """
    Property Score (0-100):
    S_prop = 0.35*R_comm + 0.30*P_phys + 0.20*L_loc + 0.15*C_catchment
    If no catchment study, drops C_catchment, renormalises weights, sets is_provisional=True.
    """
    risks: List[str] = []
    insights: List[str] = []
    benchmark_rent_sqft = get_locality_benchmark(pincode, locality_name)

    # 1. Commercial Viability (R_comm)
    if rent_monthly and rent_monthly > 0 and carpet_area_sqft > 0:
        actual_rent_sqft = rent_monthly / carpet_area_sqft
        rent_ratio = actual_rent_sqft / benchmark_rent_sqft
        if rent_ratio <= 0.85:
            r_comm = 95.0
            insights.append(f"Highly favorable rent: ₹{actual_rent_sqft:.1f}/sqft is {int((1 - rent_ratio)*100)}% below benchmark (MOCK)")
        elif rent_ratio <= 1.05:
            r_comm = 80.0
            insights.append(f"Rent aligned with market: ₹{actual_rent_sqft:.1f}/sqft (benchmark: ₹{benchmark_rent_sqft:.1f})")
        elif rent_ratio <= 1.30:
            r_comm = 55.0
            risks.append(f"Premium rent: ₹{actual_rent_sqft:.1f}/sqft is {int((rent_ratio - 1)*100)}% above benchmark")
        else:
            r_comm = 25.0
            risks.append(f"Severe rent burden: ₹{actual_rent_sqft:.1f}/sqft is {int((rent_ratio - 1)*100)}% above benchmark")
    else:
        # Missing rent -> penalise confidence
        r_comm = 50.0
        risks.append("Rent not yet specified: commercial evaluation marked provisional")

    # 2. Physical Suitability (P_phys)
    p_phys = 0.0

    # Frontage
    if frontage_ft >= 35.0:
        p_phys += 35.0
        insights.append(f"Excellent retail frontage: {frontage_ft:.0f} ft ensures prime street visibility")
    elif frontage_ft >= 24.0:
        p_phys += 28.0
        insights.append(f"Adequate retail frontage: {frontage_ft:.0f} ft")
    elif frontage_ft >= 15.0:
        p_phys += 15.0
        risks.append(f"Restricted frontage: {frontage_ft:.0f} ft limits customer sightlines")
    else:
        p_phys += 5.0
        risks.append(f"Critical risk: Very narrow frontage ({frontage_ft:.0f} ft < 15 ft minimum)")

    # Carpet Area
    if 2500 <= carpet_area_sqft <= 4500:
        p_phys += 35.0
        insights.append(f"Ideal store format: {carpet_area_sqft:.0f} sqft fits standard Savomart assortment")
    elif 1800 <= carpet_area_sqft < 2500:
        p_phys += 25.0
        insights.append(f"Compact store format: {carpet_area_sqft:.0f} sqft")
    elif carpet_area_sqft > 4500:
        p_phys += 20.0
        risks.append(f"Large area ({carpet_area_sqft:.0f} sqft) may cause high operating expense")
    else:
        p_phys += 10.0
        risks.append(f"Small carpet area ({carpet_area_sqft:.0f} sqft) constrains aisles and checkout")

    # Floor Position
    flr = floor_position.lower()
    if "ground" in flr:
        p_phys += 20.0
    elif "basement" in flr:
        p_phys += 10.0
        risks.append("Basement split floor increases customer friction")
    else:
        p_phys += 5.0
        risks.append("First floor retail requires dedicated lift/escalator for grocery carts")

    # Parking & Loading
    if parking_four_wheeler >= 4:
        p_phys += 5.0
    elif parking_four_wheeler == 0:
        risks.append("Zero dedicated four-wheeler parking bays")

    if has_loading_dock:
        p_phys += 5.0
    else:
        risks.append("No dedicated loading bay: night-time supply logistics will be constrained")

    p_phys = min(100.0, p_phys)

    # 3. Location & Micro-Accessibility (L_loc)
    l_loc = 0.0
    if road_width_ft >= 45.0:
        l_loc += 40.0
        insights.append(f"Wide road width: {road_width_ft:.0f} ft enables smooth two-way access and customer parking")
    elif road_width_ft >= 30.0:
        l_loc += 30.0
    else:
        l_loc += 15.0
        risks.append(f"Narrow road width: {road_width_ft:.0f} ft will cause delivery truck congestion")

    # Area score contribution
    l_loc += (area_fitness_score * 0.6)
    l_loc = min(100.0, l_loc)

    # 4. Weights and Catchment Integration
    is_provisional = catchment_quality_score is None

    if is_provisional:
        # Renormalise over 3 components
        w_comm = 0.35 / 0.85
        w_phys = 0.30 / 0.85
        w_loc = 0.20 / 0.85
        total_score = (r_comm * w_comm) + (p_phys * w_phys) + (l_loc * w_loc)
        c_catchment = 0.0
    else:
        total_score = (r_comm * 0.35) + (p_phys * 0.30) + (l_loc * 0.20) + (catchment_quality_score * 0.15)
        c_catchment = catchment_quality_score
        insights.append(f"Ground Catchment validated: Survey score {catchment_quality_score:.1f}/100 incorporated")

    total_score = round(total_score, 1)

    # Recommendation Logic
    if total_score >= 80.0 and len(risks) <= 1:
        recommendation = "strong_go"
    elif total_score >= 68.0:
        recommendation = "conditional_go"
    elif total_score >= 50.0:
        recommendation = "high_risk"
    else:
        recommendation = "reject"

    return {
        "total_score": total_score,
        "recommendation": recommendation,
        "is_provisional": is_provisional,
        "subscores": {
            "commercial_viability": round(r_comm, 1),
            "physical_suitability": round(p_phys, 1),
            "location_accessibility": round(l_loc, 1),
            "catchment_score": round(c_catchment, 1) if not is_provisional else None,
        },
        "risks": risks,
        "insights": insights,
        "benchmark_rent_sqft": benchmark_rent_sqft,
    }
