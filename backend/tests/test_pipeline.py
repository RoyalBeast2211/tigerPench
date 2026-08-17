import os
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.database import init_db, get_db_connection
from app.pipeline.stage1_triage import BlankTriageClassifier
from app.pipeline.stage2_reid import TigerStripeReIDEngine
from app.pipeline.stage3_spatial import SpatialTerritoryEngine, haversine_distance_km

client = TestClient(app)

def test_stage1_triage_classifier():
    classifier = BlankTriageClassifier()
    # Test blank classification
    res_blank = classifier.classify_frame("dummy_path", filename_hint="PTR_ST01_BLANK_GRASS.jpg")
    assert res_blank["category"] == "blank"
    assert res_blank["is_quarantined"] is True

    # Test tiger classification
    res_tiger = classifier.classify_frame("dummy_path", filename_hint="PTR_ST01_TIGER_PTR_M_01.jpg")
    assert res_tiger["category"] == "tiger"
    assert res_tiger["is_quarantined"] is False

    # Test human classification with privacy flag
    res_human = classifier.classify_frame("dummy_path", filename_hint="PTR_ST03_PATROL_STAFF.jpg")
    assert res_human["category"] == "human"
    assert res_human["human_privacy_masked"] is True

def test_stage2_reid_matcher():
    reid = TigerStripeReIDEngine()
    dummy_vec = [0.1] * 32
    known_tigers = [
        {"tiger_id": "PTR-M-01", "name": "Kingfisher", "flank_features": json.dumps([0.1] * 32)},
        {"tiger_id": "PTR-F-02", "name": "Langdi", "flank_features": json.dumps([-0.1] * 32)},
    ]
    res = reid.match_against_catalogue(dummy_vec, known_tigers)
    assert res["decision"] in ["CONFIDENT_MATCH", "AMBIGUOUS_REVIEW"]
    assert res["assigned_tiger_id"] == "PTR-M-01"
    assert len(res["top_candidates"]) > 0

def test_stage3_spatial_territory():
    spatial = SpatialTerritoryEngine()
    locs = [
        {"lat": 21.7450, "lng": 79.3250},
        {"lat": 21.7620, "lng": 79.3410},
        {"lat": 21.7380, "lng": 79.3120}
    ]
    home_range = spatial.generate_home_range(locs)
    assert home_range["area_km2"] > 0.0
    assert "centroid" in home_range
    assert home_range["polygon_geojson"]["type"] == "Feature"

    # Test inside/outside check
    inside_status, _ = spatial.check_territory_status(
        new_lat=21.7480,
        new_lng=79.3280,
        established_territory_geojson=home_range["polygon_geojson"],
        historical_station_ids=["PTR-ST-01", "PTR-ST-02"],
        current_station_id="PTR-ST-01"
    )
    assert inside_status in ["INSIDE_TERRITORY", "OUTSIDE_TERRITORY"]

def test_api_endpoints():
    # Test stats
    resp = client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_tigers_enrolled" in data

    # Test stations
    resp_st = client.get("/api/stations")
    assert resp_st.status_code == 200
    assert len(resp_st.json()["stations"]) > 0

    # Test tigers
    resp_tg = client.get("/api/tigers")
    assert resp_tg.status_code == 200
    assert len(resp_tg.json()["tigers"]) > 0

    # Test pipeline batch ingestion
    resp_ingest = client.post("/api/pipeline/ingest-batch", json={
        "batch_name": "Test Ingestion Cycle",
        "use_bundled_sample": True
    })
    assert resp_ingest.status_code == 200
    assert resp_ingest.json()["status"] == "COMPLETED"
