from backend.app.services.llm.validator import (
    validate_narrative_grounding,
    extract_numbers_from_text,
    generate_grounded_template_narrative
)

def test_extract_numbers():
    text = "The score is 84.5 and there are 120 units within 2.4 km."
    numbers = extract_numbers_from_text(text)
    assert "84.5" in numbers
    assert "120" in numbers
    assert "2.4" in numbers

def test_grounding_validator():
    metrics = {
        "title": "Velachery",
        "fitness_score": 84.5,
        "subscores": {"residential_density": 88.0, "commercial_vitality": 85.0},
        "raw_counts": {
            "residential_units": 240,
            "commercial_points": 135,
            "competitors": 14,
            "nearest_savomart_km": 4.8
        }
    }

    valid_narrative = (
        "Velachery scores 84.5 with 240 residential units and 135 commercial points. "
        "The nearest store is 4.8 km away."
    )
    assert validate_narrative_grounding(valid_narrative, metrics) is True

    # Hallucinated number (e.g. claims 95000 population or 72% market share)
    hallucinated_narrative = (
        "Velachery has 95000 residents and captures 72% market share."
    )
    assert validate_narrative_grounding(hallucinated_narrative, metrics) is False

def test_template_fallback_generation():
    metrics = {
        "title": "Anna Nagar",
        "fitness_score": 86.0,
        "subscores": {"residential_density": 80.0, "commercial_vitality": 90.0},
        "raw_counts": {
            "residential_units": 150,
            "commercial_points": 80,
            "transit_points": 12,
            "competitors": 5,
            "nearest_savomart_km": 1.2
        },
        "is_cannibalisation_risk": False
    }
    template = generate_grounded_template_narrative("Anna Nagar", metrics)
    assert "Template summary - no LLM" in template
    assert "86.0/100" in template or "86/100" in template
