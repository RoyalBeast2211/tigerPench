import sqlite3
import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

DB_PATH = os.environ.get("DB_PATH", str(Path(__file__).parent.parent / "data" / "pench_wildlife.db"))

def get_db_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS camera_stations (
        station_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        zone TEXT NOT NULL, -- CORE, BUFFER, CORRIDOR
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        range_office TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        installed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tiger_individuals (
        tiger_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gender TEXT NOT NULL, -- M, F
        lineage TEXT,
        estimated_age REAL,
        status TEXT DEFAULT 'RESIDENT', -- RESIDENT, DISPERSING, MISSING, NEW
        reference_image_url TEXT,
        flank_features TEXT, -- JSON vector
        known_territory_km2 REAL DEFAULT 0.0,
        last_seen_date TEXT,
        last_station_id TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ingestion_batches (
        batch_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source_folder TEXT,
        status TEXT NOT NULL, -- PROCESSING, COMPLETED, FAILED
        total_frames INTEGER DEFAULT 0,
        blank_frames INTEGER DEFAULT 0,
        animal_frames INTEGER DEFAULT 0,
        tiger_frames INTEGER DEFAULT 0,
        human_frames INTEGER DEFAULT 0,
        storage_saved_mb REAL DEFAULT 0.0,
        hours_saved REAL DEFAULT 0.0,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS captured_frames (
        frame_id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        thumbnail_url TEXT,
        station_id TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        category TEXT NOT NULL, -- blank, tiger, animal_other, human
        animal_species TEXT,
        triage_confidence REAL NOT NULL,
        is_quarantined BOOLEAN DEFAULT 0,
        quarantine_reason TEXT,
        human_privacy_masked BOOLEAN DEFAULT 0,
        flank_side TEXT DEFAULT 'unknown', -- left, right, both, unknown
        assigned_tiger_id TEXT,
        reid_confidence REAL,
        is_reid_verified BOOLEAN DEFAULT 0,
        territory_status TEXT DEFAULT 'UNMAPPED', -- INSIDE_TERRITORY, OUTSIDE_TERRITORY, FIRST_CAPTURE, UNMAPPED
        processed_at TEXT NOT NULL,
        FOREIGN KEY (station_id) REFERENCES camera_stations (station_id),
        FOREIGN KEY (batch_id) REFERENCES ingestion_batches (batch_id)
    );

    CREATE TABLE IF NOT EXISTS reid_candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        frame_id TEXT NOT NULL,
        candidate_tiger_id TEXT NOT NULL,
        similarity_score REAL NOT NULL,
        rank INTEGER NOT NULL,
        FOREIGN KEY (frame_id) REFERENCES captured_frames (frame_id),
        FOREIGN KEY (candidate_tiger_id) REFERENCES tiger_individuals (tiger_id)
    );

    CREATE TABLE IF NOT EXISTS territory_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tiger_id TEXT NOT NULL,
        calculation_date TEXT NOT NULL,
        area_km2 REAL NOT NULL,
        centroid_lat REAL NOT NULL,
        centroid_lng REAL NOT NULL,
        polygon_geojson TEXT NOT NULL,
        capture_count INTEGER NOT NULL,
        FOREIGN KEY (tiger_id) REFERENCES tiger_individuals (tiger_id)
    );

    CREATE TABLE IF NOT EXISTS movement_alerts (
        alert_id TEXT PRIMARY KEY,
        tiger_id TEXT NOT NULL,
        frame_id TEXT,
        station_id TEXT NOT NULL,
        alert_type TEXT NOT NULL, -- BUFFER_DISPERSAL, CENTROID_SHIFT, FIRST_STATION_CAPTURE, PROLONGED_ABSENCE, TERRITORIAL_OVERLAP
        severity TEXT NOT NULL, -- CRITICAL, WARNING, INFO
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        confidence REAL NOT NULL,
        is_acknowledged BOOLEAN DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (tiger_id) REFERENCES tiger_individuals (tiger_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        details TEXT,
        performed_by TEXT DEFAULT 'Forest Officer (Field)',
        timestamp TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
