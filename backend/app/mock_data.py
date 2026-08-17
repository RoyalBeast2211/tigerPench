import os
import json
import math
from pathlib import Path
from datetime import datetime, timedelta
from PIL import Image, ImageDraw, ImageFont
import numpy as np

from app.database import get_db_connection, init_db
from app.pipeline.stage2_reid import PoseGuidedTigerReIDEngine
from app.pipeline.stage3_spatial import SpatialTerritoryEngine

# Authentic Pench Tiger Reserve Camera Stations
PENCH_STATIONS = [
    {"station_id": "PTR-ST-01", "name": "Turia Main Waterhole", "zone": "CORE", "latitude": 21.7450, "longitude": 79.3250, "range_office": "Turia Range", "installed_at": "2025-11-01T08:00:00"},
    {"station_id": "PTR-ST-02", "name": "Alikatta Grassland Junction", "zone": "CORE", "latitude": 21.7620, "longitude": 79.3410, "range_office": "Turia Range", "installed_at": "2025-11-01T08:00:00"},
    {"station_id": "PTR-ST-03", "name": "Raiyakassa Fireline Nullah", "zone": "CORE", "latitude": 21.7380, "longitude": 79.3120, "range_office": "Turia Range", "installed_at": "2025-11-01T08:00:00"},
    {"station_id": "PTR-ST-04", "name": "Karmajhiri Watchtower Track", "zone": "CORE", "latitude": 21.8150, "longitude": 79.3180, "range_office": "Karmajhiri Range", "installed_at": "2025-11-05T09:00:00"},
    {"station_id": "PTR-ST-05", "name": "Bodhanala Reservoir Spillway", "zone": "CORE", "latitude": 21.8320, "longitude": 79.3350, "range_office": "Karmajhiri Range", "installed_at": "2025-11-05T09:00:00"},
    {"station_id": "PTR-ST-06", "name": "Jamtara Teak Ridge", "zone": "CORE", "latitude": 21.8480, "longitude": 79.4020, "range_office": "Jamtara Range", "installed_at": "2025-11-10T10:00:00"},
    {"station_id": "PTR-ST-07", "name": "Chhindimatta Riverbed", "zone": "CORE", "latitude": 21.8650, "longitude": 79.4210, "range_office": "Jamtara Range", "installed_at": "2025-11-10T10:00:00"},
    {"station_id": "PTR-ST-08", "name": "Gumtara Bamboo Canopy", "zone": "CORE", "latitude": 21.7220, "longitude": 79.2350, "range_office": "Gumtara Range", "installed_at": "2025-11-12T11:00:00"},
    {"station_id": "PTR-ST-09", "name": "Baghin Nala Crossing", "zone": "CORE", "latitude": 21.7580, "longitude": 79.2550, "range_office": "Gumtara Range", "installed_at": "2025-11-12T11:00:00"},
    {"station_id": "PTR-ST-10", "name": "Khawasa Buffer Village Boundary", "zone": "BUFFER", "latitude": 21.6880, "longitude": 79.3950, "range_office": "Khawasa Buffer", "installed_at": "2025-12-01T08:30:00"},
    {"station_id": "PTR-ST-11", "name": "Awarghani Corridor Culvert", "zone": "BUFFER", "latitude": 21.6720, "longitude": 79.4220, "range_office": "Khawasa Buffer", "installed_at": "2025-12-01T08:30:00"},
    {"station_id": "PTR-ST-12", "name": "Sillari Totladoh Reservoir Bank", "zone": "CORE", "latitude": 21.6420, "longitude": 79.2880, "range_office": "Sillari (MH)", "installed_at": "2025-12-05T09:00:00"},
    {"station_id": "PTR-ST-13", "name": "Mansinghdeo Corridor Pass", "zone": "BUFFER", "latitude": 21.6150, "longitude": 79.2450, "range_office": "Mansinghdeo Range", "installed_at": "2026-01-10T14:00:00"},
    {"station_id": "PTR-ST-14", "name": "Jamtara Village Fringe Trail", "zone": "BUFFER", "latitude": 21.8720, "longitude": 79.4380, "range_office": "Khawasa Buffer", "installed_at": "2026-02-01T10:00:00"},
]

# Iconic and resident Pench individual tigers
PENCH_TIGERS = [
    {
        "tiger_id": "PTR-M-01",
        "name": "Raiyakassa Male (Kingfisher)",
        "gender": "M",
        "lineage": "Collarwali (T-15) 3rd Litter",
        "estimated_age": 7.5,
        "status": "RESIDENT",
        "reference_image_url": "/sample_images/ptr_m_01_ref.jpg",
        "stations": ["PTR-ST-01", "PTR-ST-02", "PTR-ST-03"],
        "color": "#f97316"
    },
    {
        "tiger_id": "PTR-F-02",
        "name": "Langdi Tigress (T-30)",
        "gender": "F",
        "lineage": "Karmajhiri Resident",
        "estimated_age": 6.0,
        "status": "RESIDENT",
        "reference_image_url": "/sample_images/ptr_f_02_ref.jpg",
        "stations": ["PTR-ST-04", "PTR-ST-05"],
        "color": "#ec4899"
    },
    {
        "tiger_id": "PTR-M-03",
        "name": "L-Mark Dominant Male",
        "gender": "M",
        "lineage": "Gumtara Dominant Lineage",
        "estimated_age": 8.0,
        "status": "RESIDENT",
        "reference_image_url": "/sample_images/ptr_m_03_ref.jpg",
        "stations": ["PTR-ST-08", "PTR-ST-09", "PTR-ST-03"],
        "color": "#eab308"
    },
    {
        "tiger_id": "PTR-F-04",
        "name": "Bari Mada Tigress",
        "gender": "F",
        "lineage": "Jamtara Teak Queen",
        "estimated_age": 5.5,
        "status": "RESIDENT",
        "reference_image_url": "/sample_images/ptr_f_04_ref.jpg",
        "stations": ["PTR-ST-06", "PTR-ST-07"],
        "color": "#06b6d4"
    },
    {
        "tiger_id": "PTR-M-07",
        "name": "Chhota Ambewali Sub-Adult",
        "gender": "M",
        "lineage": "T-15 Grandson",
        "estimated_age": 3.0,
        "status": "DISPERSING",
        "reference_image_url": "/sample_images/ptr_m_07_ref.jpg",
        "stations": ["PTR-ST-01", "PTR-ST-10", "PTR-ST-11"],
        "color": "#8b5cf6"
    }
]

def generate_synthetic_camera_trap_image(
    output_path: str,
    title: str,
    category: str,
    station_id: str,
    tiger_id: Optional[str] = None,
    stripe_seed: int = 42
):
    """
    Generates a realistic synthetic camera trap image with infrared night/day styling,
    camera trap data stamp (timestamp, temperature, camera station ID),
    and stripe patterns for individual tigers.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    width, height = 800, 533 # Standard 3:2 camera trap aspect ratio

    if category == "blank":
        # Greenish/brownish vegetation or heat shimmer blank
        bg = np.zeros((height, width, 3), dtype=np.uint8)
        bg[:, :, 0] = np.random.randint(25, 45, (height, width)) # Red
        bg[:, :, 1] = np.random.randint(40, 70, (height, width)) # Green foliage
        bg[:, :, 2] = np.random.randint(20, 35, (height, width)) # Blue
        img = Image.fromarray(bg)
        draw = ImageDraw.Draw(img)
        # Add random grass stalks & branches
        for _ in range(40):
            x1 = np.random.randint(0, width)
            y1 = np.random.randint(int(height * 0.4), height)
            x2 = x1 + np.random.randint(-30, 30)
            y2 = y1 - np.random.randint(60, 220)
            draw.line([(x1, y1), (x2, y2)], fill=(50, 95, 40), width=np.random.randint(1, 4))
    
    elif category == "human":
        # Forest patrol staff in olive green / khaki with blue bag
        img = Image.new("RGB", (width, height), color=(40, 50, 35))
        draw = ImageDraw.Draw(img)
        # Forest background trees
        for x in range(0, width, 80):
            draw.rectangle([x, 0, x + 35, height - 100], fill=(25, 35, 20))
        # Human figure
        hx, hy = width // 2, int(height * 0.35)
        # Head
        draw.ellipse([hx - 25, hy, hx + 25, hy + 50], fill=(210, 175, 140))
        # Body (Khaki patrol uniform)
        draw.rectangle([hx - 35, hy + 50, hx + 35, hy + 180], fill=(95, 105, 65))
        # Blue patrol backpack
        draw.rectangle([hx + 10, hy + 60, hx + 45, hy + 140], fill=(30, 70, 160))
        # Legs
        draw.rectangle([hx - 30, hy + 180, hx - 10, hy + 300], fill=(50, 60, 45))
        draw.rectangle([hx + 10, hy + 180, hx + 30, hy + 300], fill=(50, 60, 45))
        # Flash tag
        draw.text((hx - 60, hy - 30), "[PRIVACY MASK ACTIVE]", fill=(255, 100, 100))

    elif category == "animal_other":
        # Spotted Deer (Chital) / Sambar in forest
        img = Image.new("RGB", (width, height), color=(30, 45, 25))
        draw = ImageDraw.Draw(img)
        # Background foliage
        for i in range(15):
            draw.ellipse([i * 60, 50, i * 60 + 100, 250], fill=(45, 65, 35))
        # Deer body (warm brown with white spots)
        dx, dy = width // 2 - 50, int(height * 0.45)
        draw.ellipse([dx, dy, dx + 180, dy + 100], fill=(160, 95, 45))
        draw.ellipse([dx + 130, dy - 40, dx + 190, dy + 30], fill=(150, 90, 40)) # Neck/head
        # White spots
        np.random.seed(stripe_seed)
        for _ in range(25):
            sx = dx + np.random.randint(20, 160)
            sy = dy + np.random.randint(15, 80)
            draw.ellipse([sx, sy, sx + 5, sy + 5], fill=(240, 240, 230))
        # Legs
        draw.line([(dx + 30, dy + 90), (dx + 30, dy + 180)], fill=(130, 75, 35), width=6)
        draw.line([(dx + 150, dy + 90), (dx + 150, dy + 180)], fill=(130, 75, 35), width=6)

    else: # category == "tiger"
        # Bengal Tiger flank capture with unique stripe signatures
        img = Image.new("RGB", (width, height), color=(25, 35, 20))
        draw = ImageDraw.Draw(img)

        # Forest ambient backdrop
        for bx in range(0, width, 100):
            draw.rectangle([bx, 0, bx + 50, height - 80], fill=(35, 45, 25))

        tx, ty = int(width * 0.2), int(height * 0.3)
        tw, th = int(width * 0.6), int(height * 0.45)

        # Tiger flank body base (Vibrant Bengal Orange/Gold)
        draw.ellipse([tx, ty, tx + tw, ty + th], fill=(220, 110, 25))
        # White belly trim
        draw.ellipse([tx + 40, ty + th - 40, tx + tw - 40, ty + th + 10], fill=(245, 240, 230))
        # Tiger head
        draw.ellipse([tx + tw - 80, ty - 30, tx + tw + 40, ty + 70], fill=(210, 100, 20))
        # Tiger legs
        draw.rectangle([tx + 50, ty + th - 20, tx + 90, ty + th + 100], fill=(200, 95, 20))
        draw.rectangle([tx + tw - 120, ty + th - 20, tx + tw - 80, ty + th + 100], fill=(200, 95, 20))

        # Generate unique flank stripe pattern based on stripe_seed / tiger_id
        np.random.seed(stripe_seed)
        num_stripes = 10 + (stripe_seed % 5)
        for s in range(num_stripes):
            sx = tx + 70 + int(s * ((tw - 160) / num_stripes)) + np.random.randint(-8, 8)
            sy_top = ty + np.random.randint(15, 45)
            sy_bot = ty + th - np.random.randint(25, 55)

            # Curved stripe contour
            mid_x = sx + np.random.randint(-20, 25)
            mid_y = (sy_top + sy_bot) // 2
            stripe_width = np.random.randint(8, 16)

            draw.line([(sx, sy_top), (mid_x, mid_y), (sx - 5, sy_bot)], fill=(20, 15, 12), width=stripe_width)

            # Stripe bifurcation (branch) characteristic of tiger re-id
            if (s + stripe_seed) % 3 == 0:
                draw.line([(mid_x, mid_y), (mid_x + 25, mid_y + 35)], fill=(20, 15, 12), width=max(4, stripe_width - 4))

    # Add standard Camera Trap OSD (On-Screen Display) Data Stamp at bottom
    draw = ImageDraw.Draw(img)
    osd_y = height - 35
    draw.rectangle([0, osd_y - 5, width, height], fill=(10, 10, 10))

    timestamp_str = datetime.now().strftime("%Y-%m-%d  %H:%M:%S")
    osd_text = f"PENCH TIGER RESERVE  |  STATION: {station_id}  |  {timestamp_str}  |  TEMP: 26°C  |  FRAME: {title}"
    draw.text((15, osd_y), osd_text, fill=(255, 255, 255))

    img.save(output_path, "JPEG", quality=88)

def generate_sample_camera_trap_batch(batch_folder_name: str = "batch_cycle_2026_01"):
    """Generates a realistic camera trap SD card image batch with blanks, tigers, and wildlife."""
    batch_dir = Path(__file__).parent.parent / "data" / "sample_batches" / batch_folder_name
    batch_dir.mkdir(parents=True, exist_ok=True)

    samples = [
        # Tigers with various flank angles at different stations
        {"filename": "PTR_ST01_20260216_061500_TIGER_PTR_M_01.jpg", "title": "PTR-M-01 Turia Crossing", "cat": "tiger", "st": "PTR-ST-01", "tiger": "PTR-M-01", "seed": 101},
        {"filename": "PTR_ST02_20260216_072000_TIGER_PTR_M_01.jpg", "title": "PTR-M-01 Alikatta Waterhole", "cat": "tiger", "st": "PTR-ST-02", "tiger": "PTR-M-01", "seed": 101},
        {"filename": "PTR_ST04_20260216_184500_TIGER_PTR_F_02.jpg", "title": "PTR-F-02 Karmajhiri Trail", "cat": "tiger", "st": "PTR-ST-04", "tiger": "PTR-F-02", "seed": 118},
        {"filename": "PTR_ST10_20260217_023000_TIGER_PTR_M_07_DISPERSAL.jpg", "title": "PTR-M-07 Khawasa Buffer Fringe", "cat": "tiger", "st": "PTR-ST-10", "tiger": "PTR-M-07", "seed": 169},
        {"filename": "PTR_ST06_20260217_051500_TIGER_AMBIGUOUS_FLANK.jpg", "title": "Ambiguous Tiger Flank Jamtara", "cat": "tiger", "st": "PTR-ST-06", "tiger": "PTR-F-04", "seed": 150},
        {"filename": "PTR_ST14_20260217_083000_TIGER_UNENROLLED_NEW.jpg", "title": "Uncatalogued Tiger Jamtara Fringe", "cat": "tiger", "st": "PTR-ST-14", "tiger": None, "seed": 299},
        
        # Blanks / False Triggers (Heat shimmer, moving grass, canopy light)
        {"filename": "PTR_ST01_20260216_113000_BLANK_GRASS_BREEZE.jpg", "title": "Blank Vegetation Movement", "cat": "blank", "st": "PTR-ST-01", "tiger": None, "seed": 1},
        {"filename": "PTR_ST03_20260216_134000_BLANK_HEAT_SHIMMER.jpg", "title": "Blank Heat Shimmer", "cat": "blank", "st": "PTR-ST-03", "tiger": None, "seed": 2},
        {"filename": "PTR_ST05_20260216_145500_BLANK_FALSE_TRIGGER.jpg", "title": "Blank Insect Trigger", "cat": "blank", "st": "PTR-ST-05", "tiger": None, "seed": 3},
        {"filename": "PTR_ST08_20260217_101200_BLANK_CANOPY_SHADOW.jpg", "title": "Blank Canopy Shift", "cat": "blank", "st": "PTR-ST-08", "tiger": None, "seed": 4},
        {"filename": "PTR_ST11_20260217_122200_BLANK_LEAF_FALL.jpg", "title": "Blank Falling Foliage", "cat": "blank", "st": "PTR-ST-11", "tiger": None, "seed": 5},

        # Other Wildlife
        {"filename": "PTR_ST02_20260216_163000_CHITAL_HERD.jpg", "title": "Chital Herd Grazing", "cat": "animal_other", "st": "PTR-ST-02", "tiger": None, "seed": 55},
        {"filename": "PTR_ST07_20260217_011000_SAMBAR_CROSSING.jpg", "title": "Sambar Stag Riverbed", "cat": "animal_other", "st": "PTR-ST-07", "tiger": None, "seed": 56},

        # Human Forest Patrol (Privacy Safeguard)
        {"filename": "PTR_ST03_20260216_094500_PATROL_STAFF.jpg", "title": "Forest Range Patrol", "cat": "human", "st": "PTR-ST-03", "tiger": None, "seed": 99}
    ]

    for item in samples:
        target = batch_dir / item["filename"]
        generate_synthetic_camera_trap_image(
            output_path=str(target),
            title=item["title"],
            category=item["cat"],
            station_id=item["st"],
            tiger_id=item["tiger"],
            stripe_seed=item["seed"]
        )

    print(f"Generated sample SD card batch with {len(samples)} images at {batch_dir}")

def seed_database():
    """Seeds the SQLite database with Pench Tiger Reserve stations, baseline tigers, and sample images."""
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Clear tables in foreign-key safe order
    cursor.execute("DELETE FROM reid_candidates")
    cursor.execute("DELETE FROM movement_alerts")
    cursor.execute("DELETE FROM captured_frames")
    cursor.execute("DELETE FROM territory_snapshots")
    cursor.execute("DELETE FROM ingestion_batches")
    cursor.execute("DELETE FROM tiger_individuals")
    cursor.execute("DELETE FROM camera_stations")

    # Insert camera stations
    for st in PENCH_STATIONS:
        cursor.execute("""
        INSERT INTO camera_stations (station_id, name, zone, latitude, longitude, range_office, is_active, installed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (st["station_id"], st["name"], st["zone"], st["latitude"], st["longitude"], st["range_office"], 1, st["installed_at"]))

    spatial_engine = SpatialTerritoryEngine()
    sample_img_dir = Path(__file__).parent.parent / "data" / "sample_images"
    sample_img_dir.mkdir(parents=True, exist_ok=True)

    station_lookup = {st["station_id"]: st for st in PENCH_STATIONS}

    for idx, tiger in enumerate(PENCH_TIGERS):
        t_id = tiger["tiger_id"]
        # Generate reference synthetic image
        ref_filename = f"{t_id.lower().replace('-', '_')}_ref.jpg"
        ref_path = sample_img_dir / ref_filename
        generate_synthetic_camera_trap_image(
            output_path=str(ref_path),
            title=f"Catalogue Ref {t_id}",
            category="tiger",
            station_id=tiger["stations"][0],
            tiger_id=t_id,
            stripe_seed=idx * 17 + 101
        )

        # Extract part-based embeddings using PoseGuidedTigerReIDEngine
        reid_engine_init = PoseGuidedTigerReIDEngine()
        emb_data = reid_engine_init.extract_part_based_embeddings(str(ref_path))

        # Compute territory polygon
        locs = [{"lat": station_lookup[sid]["latitude"], "lng": station_lookup[sid]["longitude"]} for sid in tiger["stations"] if sid in station_lookup]
        territory_res = spatial_engine.generate_home_range(locs)

        cursor.execute("""
        INSERT INTO tiger_individuals (
            tiger_id, name, gender, lineage, estimated_age, status, reference_image_url,
            flank_features, known_territory_km2, last_seen_date, last_station_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            t_id,
            tiger["name"],
            tiger["gender"],
            tiger["lineage"],
            tiger["estimated_age"],
            tiger["status"],
            f"/sample_images/{ref_filename}",
            json.dumps(emb_data),
            territory_res["area_km2"],
            "2026-02-14T18:45:00",
            tiger["stations"][-1],
            "2025-10-01T00:00:00"
        ))

        # Save territory snapshot
        cursor.execute("""
        INSERT INTO territory_snapshots (
            tiger_id, calculation_date, area_km2, centroid_lat, centroid_lng, polygon_geojson, capture_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            t_id,
            "2026-02-14T18:45:00",
            territory_res["area_km2"],
            territory_res["centroid"]["lat"],
            territory_res["centroid"]["lng"],
            json.dumps(territory_res["polygon_geojson"]),
            len(locs)
        ))

    conn.commit()
    conn.close()
    print(f"Successfully seeded {len(PENCH_STATIONS)} camera stations and {len(PENCH_TIGERS)} individual tigers.")

    # Generate sample SD card batch
    generate_sample_camera_trap_batch()

if __name__ == "__main__":
    seed_database()
