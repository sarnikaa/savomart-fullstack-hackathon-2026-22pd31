import pytest
from backend.app.services.scoring.area_score import (
    compute_area_fitness_score,
    calculate_cannibalisation_safety
)
from backend.app.services.scoring.property_score import compute_property_evaluation

def test_cannibalisation_safety_boundaries():
    # >= 2.0 km -> Safe (100.0, False)
    score, is_risk = calculate_cannibalisation_safety(2.5)
    assert score == 100.0
    assert not is_risk

    score, is_risk = calculate_cannibalisation_safety(2.0)
    assert score == 100.0
    assert not is_risk

    # Midpoint ramp: 1.4 km
    score, is_risk = calculate_cannibalisation_safety(1.4)
    assert 20.0 < score < 100.0
    assert not is_risk

    # < 0.8 km -> Hard Cannibalisation Risk
    score, is_risk = calculate_cannibalisation_safety(0.5)
    assert score <= 20.0
    assert is_risk is True

    score, is_risk = calculate_cannibalisation_safety(0.1)
    assert score < 10.0
    assert is_risk is True

def test_area_fitness_score_bounds_and_renormalisation():
    res = compute_area_fitness_score(
        residential_count=50,
        commercial_count=30,
        transit_count=10,
        competitor_count=3,
        nearest_savomart_km=3.5
    )
    assert 0.0 <= res["fitness_score"] <= 100.0
    assert not res["is_cannibalisation_risk"]
    assert sum(res["weights_used"].values()) == pytest.approx(1.0, rel=1e-3)

    # Missing signal: test renormalisation
    res_partial = compute_area_fitness_score(
        residential_count=50,
        commercial_count=30,
        transit_count=0,
        competitor_count=3,
        nearest_savomart_km=3.5,
        available_signals=["residential_density", "commercial_vitality", "cannibalisation_safety"]
    )
    assert sum(res_partial["weights_used"].values()) == pytest.approx(1.0, rel=1e-3)
    assert "transit_accessibility" not in res_partial["weights_used"]

def test_property_evaluation_provisional_fallback():
    # Without catchment study -> provisional = True
    eval_no_study = compute_property_evaluation(
        rent_monthly=200000.0,
        carpet_area_sqft=3000.0,
        frontage_ft=30.0,
        ceiling_height_ft=11.0,
        floor_position="ground_floor",
        road_width_ft=40.0,
        parking_four_wheeler=4,
        has_power_backup=True,
        has_loading_dock=True,
        area_fitness_score=80.0,
        catchment_quality_score=None
    )
    assert eval_no_study["is_provisional"] is True
    assert eval_no_study["subscores"]["catchment_score"] is None
    assert 0.0 <= eval_no_study["total_score"] <= 100.0

    # With catchment study -> provisional = False
    eval_with_study = compute_property_evaluation(
        rent_monthly=200000.0,
        carpet_area_sqft=3000.0,
        frontage_ft=30.0,
        ceiling_height_ft=11.0,
        floor_position="ground_floor",
        road_width_ft=40.0,
        parking_four_wheeler=4,
        has_power_backup=True,
        has_loading_dock=True,
        area_fitness_score=80.0,
        catchment_quality_score=85.0
    )
    assert eval_with_study["is_provisional"] is False
    assert eval_with_study["subscores"]["catchment_score"] == 85.0
