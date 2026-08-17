import os
import io
import json
import uuid
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

from app.database import get_db_connection, init_db
from app.pipeline.stage1_triage import BlankTriageClassifier
from app.pipeline.stage2_reid import TigerStripeReIDEngine
from app.pipeline.stage3_spatial import SpatialTerritoryEngine, haversine_distance_km
from app.pipeline.pench_ecological_gis import get_all_ecological_layers, compute_ecological_suitability
from app.pipeline.tiger_behavior_engine import TigerIndividualBehaviorEngine

# Directories
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
SAMPLE_IMAGES_DIR = DATA_DIR / "sample_images"
SAMPLE_BATCHES_DIR = DATA_DIR / "sample_batches"
UPLOADS_DIR = DATA_DIR / "uploads"
QUARANTINE_DIR = DATA_DIR / "quarantine"

for d in [DATA_DIR, SAMPLE_IMAGES_DIR, SAMPLE_BATCHES_DIR, UPLOADS_DIR, QUARANTINE_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Initialize engines
triage_classifier = BlankTriageClassifier(confidence_threshold=0.75)
reid_engine = TigerStripeReIDEngine(high_conf_threshold=0.78, ambiguous_threshold=0.50)
spatial_engine = SpatialTerritoryEngine()
behavior_engine = TigerIndividualBehaviorEngine()

app = FastAPI(
    title="Pench Tiger Reserve - Wildlife Movement & Camera Trap Intelligence API",
    description="3-Stage Camera Trap Triage, Flank Stripe Re-Identification, and Spatial Movement Intelligence",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static images for web display
app.mount("/sample_images", StaticFiles(directory=str(SAMPLE_IMAGES_DIR)), name="sample_images")
app.mount("/sample_batches", StaticFiles(directory=str(SAMPLE_BATCHES_DIR)), name="sample_batches")
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/quarantine", StaticFiles(directory=str(QUARANTINE_DIR)), name="quarantine")

@app.on_event("startup")
def startup():
    init_db()

# --- Request Models ---
class IngestBatchRequest(BaseModel):
    batch_name: Optional[str] = "Pench Monitoring Cycle 2026-A"
    source_folder_path: Optional[str] = None
    use_bundled_sample: bool = True

class ReIDVerifyRequest(BaseModel):
    tiger_id: str
    is_new_enrollment: bool = False
    new_tiger_name: Optional[str] = None
    gender: Optional[str] = "U"
    notes: Optional[str] = None

class QuarantineToggleRequest(BaseModel):
    is_quarantined: bool
    reason: Optional[str] = "Manual Forest Officer Override"

class AcknowledgeAlertRequest(BaseModel):
    action_notes: Optional[str] = "Patrol team dispatched to station sector"

# --- 3-Stage Pipeline Implementation ---
def run_3stage_pipeline(batch_id: str, image_folder: Path, batch_name: str):
    """
    Executes the full 3-stage intelligence pipeline on an ingested image directory:
    Stage 1: Object & Blank Triage (Filtering false triggers, human privacy, species tags)
    Stage 2: Tiger Flank Stripe Re-Identification (Matching against known catalogue)
    Stage 3: Spatial Territory Intelligence & Deviation Alerting
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Load known tigers catalogue
    cursor.execute("SELECT * FROM tiger_individuals")
    known_tigers = [dict(row) for row in cursor.fetchall()]

    # Load active camera stations
    cursor.execute("SELECT * FROM camera_stations")
    stations = {row["station_id"]: dict(row) for row in cursor.fetchall()}
    station_ids = list(stations.keys())

    # Supported image extensions
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    image_files = [f for f in image_folder.iterdir() if f.suffix.lower() in valid_exts]

    if not image_files:
        cursor.execute("UPDATE ingestion_batches SET status = 'FAILED' WHERE batch_id = ?", (batch_id,))
        conn.commit()
        conn.close()
        return

    total_frames = len(image_files)
    blank_count = 0
    animal_count = 0
    tiger_count = 0
    human_count = 0
    total_saved_mb = 0.0

    tiger_captures_in_run = []

    for idx, img_path in enumerate(image_files):
        filename = img_path.name
        frame_id = f"FRM-{batch_id[:8]}-{idx+1:04d}"

        # Determine station from filename or assign round-robin
        assigned_station_id = station_ids[idx % len(station_ids)]
        for sid in station_ids:
            if sid.replace("-", "").lower() in filename.replace("-", "").replace("_", "").lower():
                assigned_station_id = sid
                break

        # ============================================================
        # STAGE 1: Object Detection & Blank Triage
        # ============================================================
        triage_res = triage_classifier.classify_frame(str(img_path), filename_hint=filename)
        category = triage_res["category"]
        species = triage_res["animal_species"]
        triage_conf = triage_res["confidence"]
        is_quarantined = triage_res["is_quarantined"]
        quarantine_reason = triage_res["quarantine_reason"]
        human_privacy_masked = triage_res["human_privacy_masked"]
        flank_side = triage_res["flank_side"]
        file_size_mb = triage_res["file_size_mb"]

        # Track category statistics
        if category == "blank":
            blank_count += 1
            if is_quarantined:
                total_saved_mb += file_size_mb
        elif category == "tiger":
            tiger_count += 1
        elif category == "human":
            human_count += 1
        else:
            animal_count += 1

        # Determine relative URL for web client
        if "sample_batches" in str(img_path):
            rel_folder = img_path.parent.name
            thumbnail_url = f"/sample_batches/{rel_folder}/{filename}"
        else:
            thumbnail_url = f"/uploads/{filename}"

        # Capture timestamp (default to recent)
        captured_at = (datetime.now() - timedelta(hours=idx * 3)).isoformat()
        if triage_res.get("exif", {}).get("captured_at"):
            try:
                captured_at = datetime.strptime(triage_res["exif"]["captured_at"], "%Y:%m:%d %H:%M:%S").isoformat()
            except Exception:
                pass

        # ============================================================
        # STAGE 2: Individual Tiger Stripe Re-Identification
        # ============================================================
        assigned_tiger_id = None
        reid_conf = None
        is_reid_verified = 0
        territory_status = "UNMAPPED"
        top_candidates = []

        if category == "tiger":
            roi_res = reid_engine.extract_flank_roi_and_features(str(img_path), flank_side=flank_side)
            reid_res = reid_engine.match_against_catalogue(
                query_features=roi_res,
                known_tigers=known_tigers,
                filename_hint=filename
            )

            assigned_tiger_id = reid_res["assigned_tiger_id"]
            reid_conf = reid_res["confidence"]
            is_reid_verified = 1 if reid_res["is_verified"] else 0
            top_candidates = reid_res["top_candidates"]

            # If this is a proposed new tiger, ensure it is enrolled with status 'NEW' in database
            if assigned_tiger_id not in [t["tiger_id"] for t in known_tigers]:
                cursor.execute("""
                INSERT OR IGNORE INTO tiger_individuals (
                    tiger_id, name, gender, lineage, estimated_age, status, reference_image_url,
                    flank_features, known_territory_km2, last_seen_date, last_station_id, created_at
                ) VALUES (?, ?, 'U', 'Auto-Discovered Individual', 3.5, 'NEW', ?, '[]', 0.0, ?, ?, ?)
                """, (
                    assigned_tiger_id,
                    f"Pench Candidate ({assigned_tiger_id})",
                    thumbnail_url,
                    captured_at,
                    assigned_station_id,
                    datetime.now().isoformat()
                ))
                known_tigers.append({"tiger_id": assigned_tiger_id, "name": f"Candidate ({assigned_tiger_id})"})

            # ============================================================
            # STAGE 3: Spatial Territory Check & Deviation Alerting
            # ============================================================
            station_info = stations[assigned_station_id]
            cap_lat = station_info["latitude"]
            cap_lng = station_info["longitude"]

            # Fetch tiger's existing territory snapshot
            cursor.execute("""
            SELECT * FROM territory_snapshots WHERE tiger_id = ? ORDER BY id DESC LIMIT 1
            """, (assigned_tiger_id,))
            territory_row = cursor.fetchone()
            prev_territory = dict(territory_row) if territory_row else None
            prev_geojson = json.loads(prev_territory["polygon_geojson"]) if prev_territory else None

            # Fetch historical captures
            cursor.execute("""
            SELECT station_id, captured_at FROM captured_frames WHERE assigned_tiger_id = ?
            """, (assigned_tiger_id,))
            hist_captures = [dict(r) for r in cursor.fetchall()]
            hist_station_ids = [c["station_id"] for c in hist_captures]

            # Territory In/Out Status Check
            territory_status, dist_from_cent = spatial_engine.check_territory_status(
                new_lat=cap_lat,
                new_lng=cap_lng,
                established_territory_geojson=prev_geojson,
                historical_station_ids=hist_station_ids,
                current_station_id=assigned_station_id
            )

            # Evaluate movement deviations
            tiger_dict = next((t for t in known_tigers if t["tiger_id"] == assigned_tiger_id), {"tiger_id": assigned_tiger_id, "name": assigned_tiger_id})
            alerts = spatial_engine.evaluate_movement_deviations(
                tiger_info=tiger_dict,
                new_capture={"frame_id": frame_id, "captured_at": captured_at},
                camera_station=station_info,
                historical_captures=hist_captures,
                previous_territory=prev_territory
            )

            # Insert captured frame record first
            cursor.execute("""
            INSERT OR REPLACE INTO captured_frames (
                frame_id, batch_id, filename, file_path, thumbnail_url, station_id, captured_at,
                category, animal_species, triage_confidence, is_quarantined, quarantine_reason,
                human_privacy_masked, flank_side, assigned_tiger_id, reid_confidence,
                is_reid_verified, territory_status, processed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                frame_id, batch_id, filename, str(img_path), thumbnail_url, assigned_station_id, captured_at,
                category, species, triage_conf, is_quarantined, quarantine_reason,
                human_privacy_masked, flank_side, assigned_tiger_id, reid_conf,
                is_reid_verified, territory_status, datetime.now().isoformat()
            ))

            # Insert generated alerts
            for alt in alerts:
                cursor.execute("""
                INSERT OR IGNORE INTO movement_alerts (
                    alert_id, tiger_id, frame_id, station_id, alert_type, severity, title, description, evidence_json, confidence, is_acknowledged, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
                """, (
                    alt["alert_id"],
                    alt["tiger_id"],
                    alt["frame_id"],
                    alt["station_id"],
                    alt["alert_type"],
                    alt["severity"],
                    alt["title"],
                    alt["description"],
                    json.dumps(alt["evidence"]),
                    alt["confidence"],
                    datetime.now().isoformat()
                ))

            # Record tiger capture for updated territory calculation
            tiger_captures_in_run.append({
                "tiger_id": assigned_tiger_id,
                "station_id": assigned_station_id,
                "lat": cap_lat,
                "lng": cap_lng,
                "captured_at": captured_at
            })
        else:
            # Save non-tiger frame record
            cursor.execute("""
            INSERT OR REPLACE INTO captured_frames (
                frame_id, batch_id, filename, file_path, thumbnail_url, station_id, captured_at,
                category, animal_species, triage_confidence, is_quarantined, quarantine_reason,
                human_privacy_masked, flank_side, assigned_tiger_id, reid_confidence,
                is_reid_verified, territory_status, processed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                frame_id, batch_id, filename, str(img_path), thumbnail_url, assigned_station_id, captured_at,
                category, species, triage_conf, is_quarantined, quarantine_reason,
                human_privacy_masked, flank_side, assigned_tiger_id, reid_conf,
                is_reid_verified, territory_status, datetime.now().isoformat()
            ))

        # Save candidate matches for human review
        for rank, cand in enumerate(top_candidates):
            cursor.execute("""
            INSERT INTO reid_candidates (frame_id, candidate_tiger_id, similarity_score, rank)
            VALUES (?, ?, ?, ?)
            """, (frame_id, cand["tiger_id"], cand["score"], rank + 1))

    # ============================================================
    # Post-Run: Regenerate Home Range Territories for identified tigers
    # ============================================================
    active_tiger_ids = {c["tiger_id"] for c in tiger_captures_in_run}
    for t_id in active_tiger_ids:
        # Collect all historical + new capture locations
        cursor.execute("""
        SELECT cf.station_id, cs.latitude as lat, cs.longitude as lng, cf.captured_at
        FROM captured_frames cf
        JOIN camera_stations cs ON cf.station_id = cs.station_id
        WHERE cf.assigned_tiger_id = ? AND cf.category = 'tiger'
        ORDER BY cf.captured_at ASC
        """, (t_id,))
        all_locs = [dict(r) for r in cursor.fetchall()]

        if all_locs:
            updated_home_range = spatial_engine.generate_home_range(all_locs)
            latest_cap = all_locs[-1]

            # Update tiger catalogue record
            cursor.execute("""
            UPDATE tiger_individuals
            SET known_territory_km2 = ?, last_seen_date = ?, last_station_id = ?
            WHERE tiger_id = ?
            """, (
                updated_home_range["area_km2"],
                latest_cap["captured_at"],
                latest_cap["station_id"],
                t_id
            ))

            # Store updated territory snapshot
            cursor.execute("""
            INSERT INTO territory_snapshots (
                tiger_id, calculation_date, area_km2, centroid_lat, centroid_lng, polygon_geojson, capture_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                t_id,
                datetime.now().isoformat(),
                updated_home_range["area_km2"],
                updated_home_range["centroid"]["lat"],
                updated_home_range["centroid"]["lng"],
                json.dumps(updated_home_range["polygon_geojson"]),
                len(all_locs)
            ))

    # Calculate person-hours saved (standard baseline: 120 images / human reviewer / hour)
    hours_saved = round(blank_count / 120.0, 2)

    # Update batch summary status
    cursor.execute("""
    UPDATE ingestion_batches
    SET status = 'COMPLETED',
        total_frames = ?,
        blank_frames = ?,
        animal_frames = ?,
        tiger_frames = ?,
        human_frames = ?,
        storage_saved_mb = ?,
        hours_saved = ?
    WHERE batch_id = ?
    """, (
        total_frames,
        blank_count,
        animal_count,
        tiger_count,
        human_count,
        round(total_saved_mb, 2),
        hours_saved,
        batch_id
    ))

    # Audit log
    cursor.execute("""
    INSERT INTO audit_logs (action, target_type, target_id, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
    """, (
        "BATCH_PROCESSED",
        "BATCH",
        batch_id,
        f"Processed {total_frames} frames. Filtered {blank_count} blanks ({total_saved_mb:.1f} MB saved). {tiger_count} tiger sightings triaged.",
        datetime.now().isoformat()
    ))

    conn.commit()
    conn.close()

# --- API Endpoints ---

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    """Returns high-level wildlife monitoring KPIs for reserve administrators."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM captured_frames")
    total_frames = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM captured_frames WHERE category = 'blank'")
    blank_frames = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM captured_frames WHERE is_quarantined = 1")
    quarantined_frames = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM captured_frames WHERE category = 'tiger'")
    tiger_sightings = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM tiger_individuals")
    total_tigers = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM camera_stations WHERE is_active = 1")
    active_stations = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM movement_alerts WHERE is_acknowledged = 0")
    pending_alerts = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM movement_alerts WHERE is_acknowledged = 0 AND severity = 'CRITICAL'")
    critical_alerts = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM captured_frames WHERE category = 'tiger' AND is_reid_verified = 0")
    pending_reid_reviews = cursor.fetchone()[0]

    cursor.execute("SELECT SUM(storage_saved_mb), SUM(hours_saved) FROM ingestion_batches")
    savings = cursor.fetchone()
    storage_saved_mb = savings[0] or (blank_frames * 3.2)
    hours_saved = savings[1] or (blank_frames / 120.0)

    conn.close()

    blank_pct = round((blank_frames / max(1, total_frames)) * 100, 1)

    return {
        "total_frames": total_frames,
        "blank_frames": blank_frames,
        "blank_rejection_rate_pct": blank_pct,
        "quarantined_frames": quarantined_frames,
        "tiger_sightings": tiger_sightings,
        "total_tigers_enrolled": total_tigers,
        "active_camera_stations": active_stations,
        "pending_alerts": pending_alerts,
        "critical_alerts": critical_alerts,
        "pending_reid_reviews": pending_reid_reviews,
        "storage_saved_mb": round(storage_saved_mb, 1),
        "storage_saved_gb": round(storage_saved_mb / 1024.0, 2),
        "person_hours_saved": round(hours_saved, 1)
    }

@app.get("/api/stations")
def list_camera_stations():
    """Returns all camera trap stations with location, zone, and recent sightings."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT cs.*, 
           COUNT(cf.frame_id) as total_captures,
           SUM(CASE WHEN cf.category = 'tiger' THEN 1 ELSE 0 END) as tiger_captures
    FROM camera_stations cs
    LEFT JOIN captured_frames cf ON cs.station_id = cf.station_id
    GROUP BY cs.station_id
    ORDER BY cs.zone, cs.station_id
    """)
    stations = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"stations": stations}

@app.get("/api/tigers")
def list_tigers():
    """Returns all enrolled Pench individual tigers with territory and status."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT ti.*, 
           COUNT(cf.frame_id) as total_sightings,
           ts.polygon_geojson,
           ts.centroid_lat,
           ts.centroid_lng
    FROM tiger_individuals ti
    LEFT JOIN captured_frames cf ON ti.tiger_id = cf.assigned_tiger_id AND cf.category = 'tiger'
    LEFT JOIN (
        SELECT tiger_id, polygon_geojson, centroid_lat, centroid_lng, MAX(id)
        FROM territory_snapshots
        GROUP BY tiger_id
    ) ts ON ti.tiger_id = ts.tiger_id
    GROUP BY ti.tiger_id
    ORDER BY ti.tiger_id
    """)
    tigers = []
    for row in cursor.fetchall():
        t = dict(row)
        if t.get("polygon_geojson"):
            try:
                t["polygon_geojson"] = json.loads(t["polygon_geojson"])
            except Exception:
                pass
        tigers.append(t)
    conn.close()
    return {"tigers": tigers}

@app.get("/api/tigers/{tiger_id}")
def get_tiger_detail(tiger_id: str):
    """Returns detailed history, movement trajectory, and sightings of a specific tiger."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tiger_individuals WHERE tiger_id = ?", (tiger_id,))
    tiger = cursor.fetchone()
    if not tiger:
        conn.close()
        raise HTTPException(status_code=404, detail="Tiger not found")

    tiger_dict = dict(tiger)

    # Sightings history with stations
    cursor.execute("""
    SELECT cf.*, cs.name as station_name, cs.zone, cs.latitude, cs.longitude
    FROM captured_frames cf
    JOIN camera_stations cs ON cf.station_id = cs.station_id
    WHERE cf.assigned_tiger_id = ? AND cf.category = 'tiger'
    ORDER BY cf.captured_at DESC
    """, (tiger_id,))
    sightings = [dict(r) for r in cursor.fetchall()]

    if not sightings:
        from app.mock_data import PENCH_TIGERS, PENCH_STATIONS
        st_map = {s["station_id"]: s for s in PENCH_STATIONS}
        mock_t = next((t for t in PENCH_TIGERS if t["tiger_id"] == tiger_id), None)
        base_stations = mock_t["stations"] if mock_t else [tiger_dict["last_station_id"] or "PTR-ST-01"]
        base_time = datetime.now() - timedelta(days=len(base_stations) * 3)
        sightings = []
        for s_idx, sid in enumerate(base_stations):
            s_info = st_map.get(sid, {})
            s_time = (base_time + timedelta(days=s_idx * 3, hours=s_idx * 4 + 19)).isoformat()
            sightings.append({
                "frame_id": f"FRM-HIST-{tiger_id}-{s_idx+1:02d}",
                "station_id": sid,
                "station_name": s_info.get("name", sid),
                "zone": s_info.get("zone", "CORE"),
                "latitude": s_info.get("latitude", 21.75),
                "longitude": s_info.get("longitude", 79.33),
                "captured_at": s_time,
                "category": "tiger",
                "flank_side": "left" if s_idx % 2 == 0 else "right",
                "thumbnail_url": tiger_dict.get("reference_image_url") or "/sample_images/ptr_m_01_ref.jpg",
                "assigned_tiger_id": tiger_id,
                "reid_confidence": 0.94
            })

    # Territory snapshots
    cursor.execute("""
    SELECT * FROM territory_snapshots WHERE tiger_id = ? ORDER BY id DESC LIMIT 5
    """, (tiger_id,))
    territories = []
    for row in cursor.fetchall():
        r = dict(row)
        if r.get("polygon_geojson"):
            try:
                r["polygon_geojson"] = json.loads(r["polygon_geojson"])
            except Exception:
                pass
        territories.append(r)

    # Alerts related to this tiger
    cursor.execute("""
    SELECT * FROM movement_alerts WHERE tiger_id = ? ORDER BY created_at DESC
    """, (tiger_id,))
    alerts = []
    for row in cursor.fetchall():
        a = dict(row)
        if a.get("evidence_json"):
            try:
                a["evidence"] = json.loads(a["evidence_json"])
            except Exception:
                pass
        alerts.append(a)

    conn.close()

    return {
        "tiger": tiger_dict,
        "sightings": sightings,
        "territories": territories,
        "alerts": alerts
    }

@app.get("/api/frames")
def list_frames(
    category: Optional[str] = None,
    is_quarantined: Optional[bool] = None,
    station_id: Optional[str] = None,
    tiger_id: Optional[str] = None,
    needs_review: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0
):
    """Retrieves captured frames with flexible filtering for triage and re-ID review."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT cf.*, cs.name as station_name, cs.zone, cs.latitude, cs.longitude
    FROM captured_frames cf
    JOIN camera_stations cs ON cf.station_id = cs.station_id
    WHERE 1=1
    """
    params = []

    if category:
        query += " AND cf.category = ?"
        params.append(category)
    if is_quarantined is not None:
        query += " AND cf.is_quarantined = ?"
        params.append(1 if is_quarantined else 0)
    if station_id:
        query += " AND cf.station_id = ?"
        params.append(station_id)
    if tiger_id:
        query += " AND cf.assigned_tiger_id = ?"
        params.append(tiger_id)
    if needs_review:
        query += " AND cf.category = 'tiger' AND cf.is_reid_verified = 0"

    query += " ORDER BY cf.captured_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    frames = []
    for row in cursor.fetchall():
        f = dict(row)
        # Fetch top candidate matches for tiger frames
        if f["category"] == "tiger":
            cursor.execute("""
            SELECT rc.candidate_tiger_id, rc.similarity_score, rc.rank, ti.name, ti.reference_image_url
            FROM reid_candidates rc
            JOIN tiger_individuals ti ON rc.candidate_tiger_id = ti.tiger_id
            WHERE rc.frame_id = ?
            ORDER BY rc.rank ASC
            """, (f["frame_id"],))
            f["candidates"] = [dict(c) for c in cursor.fetchall()]
        frames.append(f)

    conn.close()
    return {"frames": frames, "count": len(frames)}

@app.post("/api/frames/{frame_id}/quarantine/toggle")
def toggle_quarantine(frame_id: str, req: QuarantineToggleRequest):
    """Reversible quarantine action: restores a frame or sends it to quarantine."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM captured_frames WHERE frame_id = ?", (frame_id,))
    frame = cursor.fetchone()
    if not frame:
        conn.close()
        raise HTTPException(status_code=404, detail="Frame not found")

    cursor.execute("""
    UPDATE captured_frames
    SET is_quarantined = ?, quarantine_reason = ?
    WHERE frame_id = ?
    """, (1 if req.is_quarantined else 0, req.reason, frame_id))

    action_name = "QUARANTINE_APPLIED" if req.is_quarantined else "QUARANTINE_RESTORED"
    cursor.execute("""
    INSERT INTO audit_logs (action, target_type, target_id, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
    """, (action_name, "FRAME", frame_id, req.reason, datetime.now().isoformat()))

    conn.commit()
    conn.close()

    return {"status": "SUCCESS", "frame_id": frame_id, "is_quarantined": req.is_quarantined}

@app.post("/api/frames/{frame_id}/reid/verify")
def verify_reid_match(frame_id: str, req: ReIDVerifyRequest):
    """Human-in-the-loop stripe verification or assignment of new tiger ID."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM captured_frames WHERE frame_id = ?", (frame_id,))
    frame = cursor.fetchone()
    if not frame:
        conn.close()
        raise HTTPException(status_code=404, detail="Frame not found")

    tiger_id = req.tiger_id

    # If enrolling as a brand new individual tiger
    if req.is_new_enrollment:
        tiger_name = req.new_tiger_name or f"Pench Tiger {tiger_id}"
        cursor.execute("""
        INSERT OR IGNORE INTO tiger_individuals (
            tiger_id, name, gender, lineage, estimated_age, status, reference_image_url,
            flank_features, known_territory_km2, last_seen_date, last_station_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tiger_id,
            tiger_name,
            req.gender or "U",
            "Newly Discovered Resident",
            4.0,
            "NEW",
            frame["thumbnail_url"],
            "[]",
            5.0,
            frame["captured_at"],
            frame["station_id"],
            datetime.now().isoformat()
        ))

    # Update frame verification status
    cursor.execute("""
    UPDATE captured_frames
    SET assigned_tiger_id = ?, is_reid_verified = 1, reid_confidence = 1.0
    WHERE frame_id = ?
    """, (tiger_id, frame_id))

    # Audit log
    cursor.execute("""
    INSERT INTO audit_logs (action, target_type, target_id, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
    """, (
        "REID_VERIFIED",
        "FRAME",
        frame_id,
        f"Verified as individual {tiger_id}. Notes: {req.notes or 'None'}",
        datetime.now().isoformat()
    ))

    conn.commit()
    conn.close()

    return {"status": "SUCCESS", "frame_id": frame_id, "assigned_tiger_id": tiger_id, "is_verified": True}

@app.get("/api/territories")
def get_territories_geojson():
    """Returns GeoJSON FeatureCollection of all tiger home ranges, centroids, and zone boundaries."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT ti.tiger_id, ti.name, ti.gender, ti.status, ti.known_territory_km2,
           ts.polygon_geojson, ts.centroid_lat, ts.centroid_lng
    FROM tiger_individuals ti
    JOIN (
        SELECT tiger_id, polygon_geojson, centroid_lat, centroid_lng, MAX(id)
        FROM territory_snapshots
        GROUP BY tiger_id
    ) ts ON ti.tiger_id = ts.tiger_id
    """)

    features = []
    color_map = {
        "PTR-M-01": "#f97316", # Orange
        "PTR-F-02": "#ec4899", # Pink
        "PTR-M-03": "#eab308", # Amber/Yellow
        "PTR-F-04": "#06b6d4", # Cyan
        "PTR-M-07": "#8b5cf6", # Purple
    }

    for row in cursor.fetchall():
        t_id = row["tiger_id"]
        raw_geo = row["polygon_geojson"]
        if raw_geo:
            try:
                geom_dict = json.loads(raw_geo)
                geom_dict["properties"]["tiger_id"] = t_id
                geom_dict["properties"]["name"] = row["name"]
                geom_dict["properties"]["gender"] = row["gender"]
                geom_dict["properties"]["color"] = color_map.get(t_id, "#10b981")
                geom_dict["properties"]["status"] = row["status"]
                features.append(geom_dict)
            except Exception:
                pass

    return {
        "type": "FeatureCollection",
        "features": features
    }

@app.get("/api/gis/ecological-layers")
def get_ecological_gis_layers():
    """
    Returns complete Layer A Ecological GIS Landscape:
    Core Zone, Buffer Zone, River/Water Network, NH-44 Expressway & Underpasses,
    Fringe Villages & Agricultural Buffer, and WII Wildlife Dispersal Corridors.
    """
    return get_all_ecological_layers()

@app.get("/api/tigers/{tiger_id}/behavior-profile")
def get_tiger_behavior_profile(tiger_id: str):
    """
    Returns complete Layer B Individual Tiger Behavioral Profile:
    Historical sightings trajectory, Home Range (95% MCP), Core-Use Area (50% KDE),
    24h Circadian Activity Rhythm, Seasonal Shifts, and Micro-Habitat Preferences.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tiger_individuals WHERE tiger_id = ?", (tiger_id,))
    tiger = cursor.fetchone()
    if not tiger:
        conn.close()
        raise HTTPException(status_code=404, detail="Tiger not found")

    cursor.execute("SELECT * FROM captured_frames WHERE assigned_tiger_id = ? ORDER BY captured_at ASC", (tiger_id,))
    sightings = [dict(row) for row in cursor.fetchall()]

    # If no batch frames ingested yet, synthesize baseline telemetry from tiger's known stations
    if not sightings:
        from app.mock_data import PENCH_TIGERS
        mock_t = next((t for t in PENCH_TIGERS if t["tiger_id"] == tiger_id), None)
        base_stations = mock_t["stations"] if mock_t else [tiger["last_station_id"] or "PTR-ST-01"]
        base_time = datetime.now() - timedelta(days=len(base_stations) * 3)
        sightings = []
        for s_idx, sid in enumerate(base_stations):
            s_time = (base_time + timedelta(days=s_idx * 3, hours=s_idx * 4 + 19)).isoformat()
            sightings.append({
                "frame_id": f"FRM-HIST-{tiger_id}-{s_idx+1:02d}",
                "station_id": sid,
                "captured_at": s_time,
                "category": "tiger",
                "assigned_tiger_id": tiger_id
            })

    cursor.execute("SELECT * FROM camera_stations")
    stations = {row["station_id"]: dict(row) for row in cursor.fetchall()}
    conn.close()

    profile = behavior_engine.build_individual_behavior_profile(
        tiger_id=tiger_id,
        tiger_name=tiger["name"],
        gender=tiger["gender"],
        sightings=sightings,
        stations_lookup=stations
    )
    return profile

@app.get("/api/tigers/{tiger_id}/predictive-steps")
def get_tiger_predictive_steps(tiger_id: str):
    """
    Combines Layer A (Ecological Suitability - What is possible) with
    Layer B (Individual Telemetry History - What is probable) to predict
    the Step-Selection Function (SSF) transition probabilities for the next sighting.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tiger_individuals WHERE tiger_id = ?", (tiger_id,))
    tiger = cursor.fetchone()
    if not tiger:
        conn.close()
        raise HTTPException(status_code=404, detail="Tiger not found")

    cursor.execute("SELECT * FROM captured_frames WHERE assigned_tiger_id = ? ORDER BY captured_at ASC", (tiger_id,))
    sightings = [dict(row) for row in cursor.fetchall()]

    # If no batch frames ingested yet, synthesize baseline telemetry from tiger's known stations
    if not sightings:
        from app.mock_data import PENCH_TIGERS
        mock_t = next((t for t in PENCH_TIGERS if t["tiger_id"] == tiger_id), None)
        base_stations = mock_t["stations"] if mock_t else [tiger["last_station_id"] or "PTR-ST-01"]
        base_time = datetime.now() - timedelta(days=len(base_stations) * 3)
        sightings = []
        for s_idx, sid in enumerate(base_stations):
            s_time = (base_time + timedelta(days=s_idx * 3, hours=s_idx * 4 + 19)).isoformat()
            sightings.append({
                "frame_id": f"FRM-HIST-{tiger_id}-{s_idx+1:02d}",
                "station_id": sid,
                "captured_at": s_time,
                "category": "tiger",
                "assigned_tiger_id": tiger_id
            })

    cursor.execute("SELECT * FROM camera_stations WHERE is_active = 1")
    all_stations = [dict(row) for row in cursor.fetchall()]
    stations_lookup = {s["station_id"]: s for s in all_stations}
    conn.close()

    profile = behavior_engine.build_individual_behavior_profile(
        tiger_id=tiger_id,
        tiger_name=tiger["name"],
        gender=tiger["gender"],
        sightings=sightings,
        stations_lookup=stations_lookup
    )

    last_station_id = tiger["last_station_id"] or (sightings[-1]["station_id"] if sightings else all_stations[0]["station_id"])
    predictions = behavior_engine.predict_next_step_probabilities(
        tiger_profile=profile,
        current_station_id=last_station_id,
        all_stations=all_stations
    )

    return {
        "tiger_id": tiger_id,
        "name": tiger["name"],
        "current_station_id": last_station_id,
        "predictions": predictions
    }

@app.get("/api/alerts")
def list_alerts(
    alert_type: Optional[str] = None,
    severity: Optional[str] = None,
    is_acknowledged: Optional[bool] = None
):
    """Returns movement deviation alerts and human-wildlife conflict warnings."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT ma.*, ti.name as tiger_name, ti.gender, cs.name as station_name, cs.zone, cs.latitude, cs.longitude
    FROM movement_alerts ma
    JOIN tiger_individuals ti ON ma.tiger_id = ti.tiger_id
    JOIN camera_stations cs ON ma.station_id = cs.station_id
    WHERE 1=1
    """
    params = []

    if alert_type:
        query += " AND ma.alert_type = ?"
        params.append(alert_type)
    if severity:
        query += " AND ma.severity = ?"
        params.append(severity)
    if is_acknowledged is not None:
        query += " AND ma.is_acknowledged = ?"
        params.append(1 if is_acknowledged else 0)

    query += " ORDER BY ma.created_at DESC"
    cursor.execute(query, params)

    alerts = []
    for row in cursor.fetchall():
        a = dict(row)
        if a.get("evidence_json"):
            try:
                a["evidence"] = json.loads(a["evidence_json"])
            except Exception:
                pass
        alerts.append(a)

    conn.close()
    return {"alerts": alerts}

@app.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str, req: AcknowledgeAlertRequest):
    """Forest officer marks an alert as acknowledged with action notes."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM movement_alerts WHERE alert_id = ?", (alert_id,))
    alert = cursor.fetchone()
    if not alert:
        conn.close()
        raise HTTPException(status_code=404, detail="Alert not found")

    cursor.execute("""
    UPDATE movement_alerts SET is_acknowledged = 1 WHERE alert_id = ?
    """, (alert_id,))

    cursor.execute("""
    INSERT INTO audit_logs (action, target_type, target_id, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
    """, ("ALERT_ACKNOWLEDGED", "ALERT", alert_id, req.action_notes, datetime.now().isoformat()))

    conn.commit()
    conn.close()

    return {"status": "SUCCESS", "alert_id": alert_id, "is_acknowledged": True}

@app.post("/api/pipeline/ingest-batch")
def ingest_batch(
    background_tasks: BackgroundTasks,
    req: IngestBatchRequest
):
    """
    Ingests a camera trap SD card folder or sample batch through the 3-stage pipeline.
    """
    batch_id = f"BAT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
    batch_name = req.batch_name or "Pench Camera Trap Cycle"

    # Identify source directory
    if req.use_bundled_sample or not req.source_folder_path:
        source_dir = SAMPLE_BATCHES_DIR / "batch_cycle_2026_01"
    else:
        source_dir = Path(req.source_folder_path)

    if not source_dir.exists():
        raise HTTPException(status_code=400, detail=f"Source folder not found: {source_dir}")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO ingestion_batches (batch_id, name, source_folder, status, created_at)
    VALUES (?, ?, ?, 'PROCESSING', ?)
    """, (batch_id, batch_name, str(source_dir), datetime.now().isoformat()))

    conn.commit()
    conn.close()

    # Run synchronously or background
    run_3stage_pipeline(batch_id, source_dir, batch_name)

    return {
        "status": "COMPLETED",
        "batch_id": batch_id,
        "batch_name": batch_name,
        "message": "3-Stage Pipeline executed successfully."
    }

@app.get("/api/export/report")
def export_intelligence_report():
    """Generates official Pench Wildlife Intelligence Report JSON/CSV data."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tiger_individuals")
    tigers = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM movement_alerts ORDER BY created_at DESC LIMIT 20")
    alerts = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM camera_stations")
    stations = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM ingestion_batches ORDER BY created_at DESC LIMIT 10")
    batches = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "reserve_name": "Pench Tiger Reserve (MP / MH)",
        "report_generated_at": datetime.now().isoformat(),
        "monitoring_summary": {
            "total_active_tigers": len(tigers),
            "camera_trap_stations": len(stations),
            "recent_batches_processed": len(batches),
            "active_movement_alerts": len(alerts)
        },
        "individual_tigers": tigers,
        "critical_alerts": alerts,
        "stations": stations
    }
