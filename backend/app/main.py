from pathlib import Path
from datetime import date, datetime, timezone
import sqlite3

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="AISG Building Intelligence API",
    description="Digital Building Management Platform",
    version="0.3.0"
)

DB_PATH = Path(__file__).resolve().parent.parent / "aisg.db"


def connect():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def initialize_database():
    with connect() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS buildings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                address TEXT NOT NULL,
                city TEXT NOT NULL,
                building_type TEXT NOT NULL,
                area_sqm REAL NOT NULL,
                notes TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migrazione compatibile con gli edifici già registrati
        existing = {
            row["name"]
            for row in db.execute("PRAGMA table_info(buildings)")
        }

        migrations = {
            "cadastral_reference": "TEXT DEFAULT ''",
            "construction_year": "INTEGER",
            "floors": "INTEGER DEFAULT 1",
            "energy_class": "TEXT DEFAULT ''",
            "occupancy_type": "TEXT DEFAULT ''"
        }

        for column, definition in migrations.items():
            if column not in existing:
                db.execute(
                    f"ALTER TABLE buildings ADD COLUMN {column} {definition}"
                )

        db.execute("""
            CREATE TABLE IF NOT EXISTS building_zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                building_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                zone_type TEXT NOT NULL,
                area_sqm REAL NOT NULL,
                floor_number INTEGER DEFAULT 0,
                notes TEXT DEFAULT '',
                FOREIGN KEY(building_id) REFERENCES buildings(id)
                    ON DELETE CASCADE
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS building_systems (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                building_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                manufacturer TEXT DEFAULT '',
                model TEXT DEFAULT '',
                installation_year INTEGER,
                notes TEXT DEFAULT '',
                FOREIGN KEY(building_id) REFERENCES buildings(id)
                    ON DELETE CASCADE
            )
        """)

        system_columns = {
            row["name"]
            for row in db.execute("PRAGMA table_info(building_systems)").fetchall()
        }

        if "zone_id" not in system_columns:
            db.execute("""
                ALTER TABLE building_systems
                ADD COLUMN zone_id INTEGER REFERENCES building_zones(id)
                ON DELETE SET NULL
            """) 

        db.execute("""
            CREATE TABLE IF NOT EXISTS maintenance_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                system_id INTEGER NOT NULL,
                maintenance_date TEXT NOT NULL,
                maintenance_type TEXT NOT NULL,
                description TEXT NOT NULL,
                technician TEXT DEFAULT '',
                cost_eur REAL NOT NULL DEFAULT 0,
                next_maintenance_date TEXT,
                status TEXT NOT NULL DEFAULT 'completata',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(system_id)
                    REFERENCES building_systems(id)
                    ON DELETE CASCADE
            )
        """)

        db.execute("""
            CREATE INDEX IF NOT EXISTS idx_maintenance_system_date
            ON maintenance_records(system_id, maintenance_date)
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                building_id INTEGER NOT NULL,
                system_id INTEGER,
                zone_id INTEGER,
                name TEXT NOT NULL,
                external_id TEXT NOT NULL,
                device_type TEXT NOT NULL,
                manufacturer TEXT DEFAULT '',
                model TEXT DEFAULT '',
                protocol TEXT DEFAULT '',
                last_seen_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                UNIQUE(building_id, external_id),

                FOREIGN KEY(building_id)
                    REFERENCES buildings(id)
                    ON DELETE CASCADE,

                FOREIGN KEY(system_id)
                    REFERENCES building_systems(id)
                    ON DELETE SET NULL,

                FOREIGN KEY(zone_id)
                    REFERENCES building_zones(id)
                    ON DELETE SET NULL
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL,
                metric TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT NOT NULL,
                measured_at TIMESTAMP NOT NULL,
                received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                quality TEXT DEFAULT 'unknown',
                source TEXT DEFAULT 'device',

                FOREIGN KEY(device_id)
                    REFERENCES devices(id)
                    ON DELETE CASCADE
            )
        """)

        db.execute("""
            CREATE INDEX IF NOT EXISTS idx_telemetry_device_time
            ON telemetry_readings(device_id, measured_at)
        """)

initialize_database()


with connect() as db:
    db.execute("""
        CREATE TABLE IF NOT EXISTS energy_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            building_id INTEGER NOT NULL,
            energy_type TEXT NOT NULL,
            period_start TEXT NOT NULL,
            period_end TEXT NOT NULL,
            consumption_kwh REAL NOT NULL,
            cost_eur REAL NOT NULL DEFAULT 0,
            source TEXT NOT NULL DEFAULT 'manuale',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(building_id) REFERENCES buildings(id)
                ON DELETE CASCADE
        )
    """)


class BuildingCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    address: str = Field(min_length=2, max_length=200)
    city: str = Field(min_length=2, max_length=100)
    building_type: str = Field(min_length=2, max_length=100)
    area_sqm: float = Field(gt=0, le=10000000)
    notes: str = Field(default="", max_length=2000)
    cadastral_reference: str = Field(default="", max_length=150)
    construction_year: int | None = Field(default=None, ge=1000, le=2100)
    floors: int = Field(default=1, ge=1, le=300)
    energy_class: str = Field(default="", max_length=10)
    occupancy_type: str = Field(default="", max_length=100)


class ZoneCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    zone_type: str = Field(min_length=2, max_length=100)
    area_sqm: float = Field(gt=0, le=1000000)
    floor_number: int = Field(default=0, ge=-20, le=300)
    notes: str = Field(default="", max_length=2000)


class SystemCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: str = Field(min_length=2, max_length=100)
    manufacturer: str = Field(default="", max_length=120)
    model: str = Field(default="", max_length=120)
    installation_year: int | None = Field(default=None, ge=1000, le=2100)
    notes: str = Field(default="", max_length=2000)
    zone_id: int | None = Field(default=None, ge=1)




class MaintenanceCreate(BaseModel):
    maintenance_date: date
    maintenance_type: str = Field(min_length=2, max_length=50)
    description: str = Field(min_length=2, max_length=2000)
    technician: str = Field(default="", max_length=120)
    cost_eur: float = Field(default=0, ge=0)
    next_maintenance_date: date | None = None
    status: str = Field(default="completata", max_length=30)


class EnergyReadingCreate(BaseModel):
    energy_type: str = Field(min_length=2, max_length=30)
    period_start: date
    period_end: date
    consumption_kwh: float = Field(gt=0, le=1000000000)
    cost_eur: float = Field(default=0, ge=0, le=1000000000)
    source: str = Field(default="manuale", max_length=40)
    notes: str = Field(default="", max_length=2000)


class DeviceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    external_id: str = Field(min_length=1, max_length=150)
    device_type: str = Field(min_length=2, max_length=80)
    system_id: int | None = Field(default=None, ge=1)
    zone_id: int | None = Field(default=None, ge=1)
    manufacturer: str = Field(default="", max_length=120)
    model: str = Field(default="", max_length=120)
    protocol: str = Field(default="", max_length=50)


class TelemetryCreate(BaseModel):
    metric: str = Field(min_length=1, max_length=100)
    value: float
    unit: str = Field(min_length=1, max_length=30)
    measured_at: datetime
    quality: str = Field(default="unknown", max_length=30)
    source: str = Field(default="device", max_length=50)


def ensure_building(building_id: int):
    with connect() as db:
        row = db.execute(
            "SELECT id FROM buildings WHERE id = ?",
            (building_id,)
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Edificio non trovato")


@app.get("/")
def home():
    return {
        "application": "AISG Building Intelligence",
        "status": "online",
        "version": "0.3.0"
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.get("/api/portfolio/overview")
def get_portfolio_overview():
    with connect() as db:
        buildings = db.execute("""
            SELECT COUNT(*) AS buildings_count,
                   COALESCE(SUM(area_sqm), 0) AS total_area_sqm
            FROM buildings
        """).fetchone()

        systems = db.execute("""
            SELECT COUNT(*) AS systems_count
            FROM building_systems
        """).fetchone()

        energy = db.execute("""
            SELECT COUNT(*) AS readings_count,
                   COALESCE(SUM(consumption_kwh), 0) AS total_consumption_kwh,
                   COALESCE(SUM(cost_eur), 0) AS total_cost_eur
            FROM energy_readings
        """).fetchone()

        maintenance = db.execute("""
            SELECT COUNT(*) AS maintenance_count,
                   COALESCE(SUM(cost_eur), 0) AS maintenance_cost_eur,
                   SUM(CASE WHEN status = 'Completata'
                       THEN 1 ELSE 0 END) AS completed_count
            FROM maintenance_records
        """).fetchone()

    return {
        "buildings_count": buildings["buildings_count"],
        "total_area_sqm": round(float(buildings["total_area_sqm"]), 2),
        "systems_count": systems["systems_count"],
        "energy": {
            "readings_count": energy["readings_count"],
            "total_consumption_kwh": round(float(energy["total_consumption_kwh"]), 2),
            "total_cost_eur": round(float(energy["total_cost_eur"]), 2)
        },
        "maintenance": {
            "maintenance_count": maintenance["maintenance_count"],
            "completed_count": maintenance["completed_count"] or 0,
            "maintenance_cost_eur": round(float(maintenance["maintenance_cost_eur"]), 2)
        }
    }


@app.get("/api/buildings")
def list_buildings():
    with connect() as db:
        rows = db.execute(
            "SELECT * FROM buildings ORDER BY id DESC"
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/buildings", status_code=201)
def create_building(building: BuildingCreate):
    with connect() as db:
        cursor = db.execute("""
            INSERT INTO buildings (
                name, address, city, building_type, area_sqm, notes,
                cadastral_reference, construction_year, floors,
                energy_class, occupancy_type
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            building.name, building.address, building.city,
            building.building_type, building.area_sqm, building.notes,
            building.cadastral_reference, building.construction_year,
            building.floors, building.energy_class, building.occupancy_type
        ))

        row = db.execute(
            "SELECT * FROM buildings WHERE id = ?",
            (cursor.lastrowid,)
        ).fetchone()

    return dict(row)


@app.get("/api/buildings/{building_id}")
def get_building(building_id: int):
    with connect() as db:
        row = db.execute(
            "SELECT * FROM buildings WHERE id = ?",
            (building_id,)
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Edificio non trovato")

    return dict(row)


@app.post("/api/buildings/{building_id}/devices")
def create_device(building_id: int, payload: DeviceCreate):
    ensure_building(building_id)

    with connect() as db:
        if payload.system_id is not None:
            system = db.execute(
                "SELECT id FROM building_systems WHERE id=? AND building_id=?",
                (payload.system_id, building_id)
            ).fetchone()

            if system is None:
                raise HTTPException(
                    status_code=400,
                    detail="Impianto non appartenente all'edificio"
                )

        if payload.zone_id is not None:
            zone = db.execute(
                "SELECT id FROM building_zones WHERE id=? AND building_id=?",
                (payload.zone_id, building_id)
            ).fetchone()

            if zone is None:
                raise HTTPException(
                    status_code=400,
                    detail="Zona non appartenente all'edificio"
                )

        try:
            cursor = db.execute("""
                INSERT INTO devices (
                    building_id, system_id, zone_id, name,
                    external_id, device_type, manufacturer,
                    model, protocol
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                building_id,
                payload.system_id,
                payload.zone_id,
                payload.name,
                payload.external_id,
                payload.device_type,
                payload.manufacturer,
                payload.model,
                payload.protocol
            ))
        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="Identificativo dispositivo già registrato nell'edificio"
            )

        device = db.execute(
            "SELECT * FROM devices WHERE id=?",
            (cursor.lastrowid,)
        ).fetchone()

    return dict(device)


@app.get("/api/buildings/{building_id}/devices")
def list_devices(building_id: int):
    ensure_building(building_id)

    with connect() as db:
        rows = db.execute("""
            SELECT
                d.*,
                CASE
                    WHEN d.last_seen_at IS NULL THEN 'never_connected'
                    WHEN datetime(d.last_seen_at) >=
                         datetime('now', '-5 minutes') THEN 'online'
                    ELSE 'offline'
                END AS connection_status
            FROM devices d
            WHERE d.building_id = ?
            ORDER BY d.id DESC
        """, (building_id,)).fetchall()

    return [dict(row) for row in rows]


@app.post("/api/devices/{device_id}/telemetry")
def receive_telemetry(device_id: int, payload: TelemetryCreate):
    with connect() as db:
        device = db.execute(
            "SELECT id FROM devices WHERE id = ?",
            (device_id,)
        ).fetchone()

        if device is None:
            raise HTTPException(
                status_code=404,
                detail="Dispositivo non trovato"
            )

        cursor = db.execute("""
            INSERT INTO telemetry_readings (
                device_id, metric, value, unit,
                measured_at, quality, source
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            device_id,
            payload.metric,
            payload.value,
            payload.unit,
            payload.measured_at.isoformat(),
            payload.quality,
            payload.source
        ))

        db.execute("""
            UPDATE devices
            SET last_seen_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (device_id,))

        reading = db.execute(
            "SELECT * FROM telemetry_readings WHERE id = ?",
            (cursor.lastrowid,)
        ).fetchone()

    return dict(reading)

@app.get("/api/devices/{device_id}/telemetry")
def list_telemetry(device_id: int, limit: int = 100):
    if limit < 1 or limit > 1000:
        raise HTTPException(
            status_code=400,
            detail="Il limite deve essere compreso tra 1 e 1000"
        )

    with connect() as db:
        device = db.execute(
            "SELECT id FROM devices WHERE id = ?",
            (device_id,)
        ).fetchone()

        if device is None:
            raise HTTPException(
                status_code=404,
                detail="Dispositivo non trovato"
            )

        rows = db.execute("""
            SELECT *
            FROM telemetry_readings
            WHERE device_id = ?
            ORDER BY measured_at DESC
            LIMIT ?
        """, (device_id, limit)).fetchall()

    return [dict(row) for row in rows]


@app.put("/api/buildings/{building_id}")
def update_building(building_id: int, building: BuildingCreate):
    with connect() as db:
        cursor = db.execute("""
            UPDATE buildings SET
                name=?, address=?, city=?, building_type=?,
                area_sqm=?, notes=?, cadastral_reference=?,
                construction_year=?, floors=?, energy_class=?,
                occupancy_type=?
            WHERE id=?
        """, (
            building.name, building.address, building.city,
            building.building_type, building.area_sqm, building.notes,
            building.cadastral_reference, building.construction_year,
            building.floors, building.energy_class,
            building.occupancy_type, building_id
        ))

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Edificio non trovato")

        row = db.execute(
            "SELECT * FROM buildings WHERE id=?",
            (building_id,)
        ).fetchone()

    return dict(row)


@app.delete("/api/buildings/{building_id}")
def delete_building(building_id: int):
    with connect() as db:
        cursor = db.execute(
            "DELETE FROM buildings WHERE id=?",
            (building_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Edificio non trovato")

    return {"message": "Edificio eliminato", "id": building_id}


@app.get("/api/buildings/{building_id}/zones")
def list_zones(building_id: int):
    ensure_building(building_id)

    with connect() as db:
        rows = db.execute(
            "SELECT * FROM building_zones WHERE building_id=? ORDER BY id DESC",
            (building_id,)
        ).fetchall()

    return [dict(row) for row in rows]


@app.post("/api/buildings/{building_id}/zones", status_code=201)
def create_zone(building_id: int, zone: ZoneCreate):
    ensure_building(building_id)

    with connect() as db:
        cursor = db.execute("""
            INSERT INTO building_zones
            (building_id, name, zone_type, area_sqm, floor_number, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            building_id, zone.name, zone.zone_type,
            zone.area_sqm, zone.floor_number, zone.notes
        ))

        row = db.execute(
            "SELECT * FROM building_zones WHERE id=?",
            (cursor.lastrowid,)
        ).fetchone()

    return dict(row)


@app.delete("/api/buildings/{building_id}/zones/{zone_id}")
def delete_zone(building_id: int, zone_id: int):
    with connect() as db:
        cursor = db.execute(
            "DELETE FROM building_zones WHERE id=? AND building_id=?",
            (zone_id, building_id)
        )

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Zona non trovata")

    return {"message": "Zona eliminata"}


@app.get("/api/buildings/{building_id}/systems")
def list_systems(building_id: int):
    ensure_building(building_id)

    with connect() as db:
        rows = db.execute(
            "SELECT * FROM building_systems WHERE building_id=? ORDER BY id DESC",
            (building_id,)
        ).fetchall()

    return [dict(row) for row in rows]


@app.post("/api/buildings/{building_id}/systems", status_code=201)
def create_system(building_id: int, system: SystemCreate):
    ensure_building(building_id)

    with connect() as db:
        if system.zone_id is not None:
            zone = db.execute(
                "SELECT id FROM building_zones WHERE id=? AND building_id=?",
                (system.zone_id, building_id)
            ).fetchone()

            if zone is None:
                raise HTTPException(
                    status_code=400,
                    detail="La zona selezionata non appartiene a questo edificio"
                )

        cursor = db.execute("""
            INSERT INTO building_systems
            (building_id, name, category, manufacturer, model,
             installation_year, notes, zone_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            building_id, system.name, system.category,
            system.manufacturer, system.model,
            system.installation_year, system.notes, system.zone_id
        ))

        row = db.execute(
            "SELECT * FROM building_systems WHERE id=?",
            (cursor.lastrowid,)
        ).fetchone()

    return dict(row)


@app.get("/api/buildings/{building_id}/systems/{system_id}/maintenance")
def list_maintenance(building_id: int, system_id: int):
    with connect() as db:
        system = db.execute(
            "SELECT id FROM building_systems WHERE id=? AND building_id=?",
            (system_id, building_id)
        ).fetchone()

        if system is None:
            raise HTTPException(status_code=404, detail="Impianto non trovato")

        rows = db.execute("""
            SELECT * FROM maintenance_records
            WHERE system_id=?
            ORDER BY maintenance_date DESC, id DESC
        """, (system_id,)).fetchall()

    return [dict(row) for row in rows]


@app.post(
    "/api/buildings/{building_id}/systems/{system_id}/maintenance",
    status_code=201
)
def create_maintenance(
    building_id: int,
    system_id: int,
    maintenance: MaintenanceCreate
):
    with connect() as db:
        system = db.execute(
            "SELECT id FROM building_systems WHERE id=? AND building_id=?",
            (system_id, building_id)
        ).fetchone()

        if system is None:
            raise HTTPException(status_code=404, detail="Impianto non trovato")

        cursor = db.execute("""
            INSERT INTO maintenance_records
            (system_id, maintenance_date, maintenance_type, description,
             technician, cost_eur, next_maintenance_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            system_id,
            maintenance.maintenance_date.isoformat(),
            maintenance.maintenance_type,
            maintenance.description,
            maintenance.technician,
            maintenance.cost_eur,
            maintenance.next_maintenance_date.isoformat()
                if maintenance.next_maintenance_date else None,
            maintenance.status
        ))

        row = db.execute(
            "SELECT * FROM maintenance_records WHERE id=?",
            (cursor.lastrowid,)
        ).fetchone()

    return dict(row)


@app.delete("/api/buildings/{building_id}/systems/{system_id}")
def delete_system(building_id: int, system_id: int):
    with connect() as db:
        cursor = db.execute(
            "DELETE FROM building_systems WHERE id=? AND building_id=?",
            (system_id, building_id)
        )

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Impianto non trovato")

    return {"message": "Impianto eliminato"}


@app.get("/api/buildings/{building_id}/energy-readings")
def list_energy_readings(building_id: int):
    ensure_building(building_id)

    with connect() as db:
        rows = db.execute(
            """
            SELECT * FROM energy_readings
            WHERE building_id=?
            ORDER BY period_end DESC, id DESC
            """,
            (building_id,)
        ).fetchall()

    return [dict(row) for row in rows]


@app.get("/api/buildings/{building_id}/energy-analysis")
def get_energy_analysis(building_id: int):
    ensure_building(building_id)

    with connect() as db:
        totals = db.execute(
            """
            SELECT
                COUNT(*) AS readings_count,
                COALESCE(SUM(consumption_kwh), 0) AS total_consumption_kwh,
                COALESCE(SUM(cost_eur), 0) AS total_cost_eur
            FROM energy_readings
            WHERE building_id=?
            """,
            (building_id,)
        ).fetchone()

        breakdown_rows = db.execute(
            """
            SELECT
                energy_type,
                COUNT(*) AS readings_count,
                COALESCE(SUM(consumption_kwh), 0) AS consumption_kwh,
                COALESCE(SUM(cost_eur), 0) AS cost_eur
            FROM energy_readings
            WHERE building_id=?
            GROUP BY energy_type
            ORDER BY energy_type
            """,
            (building_id,)
        ).fetchall()

    total_consumption = float(totals["total_consumption_kwh"])
    total_cost = float(totals["total_cost_eur"])

    average_cost = (
        total_cost / total_consumption
        if total_consumption > 0
        else 0
    )

    breakdown = []

    for row in breakdown_rows:
        consumption = float(row["consumption_kwh"])
        cost = float(row["cost_eur"])

        breakdown.append({
            "energy_type": row["energy_type"],
            "readings_count": row["readings_count"],
            "consumption_kwh": round(consumption, 2),
            "cost_eur": round(cost, 2),
            "average_cost_per_kwh": round(
                cost / consumption if consumption > 0 else 0,
                4
            )
        })

    return {
        "building_id": building_id,
        "readings_count": totals["readings_count"],
        "total_consumption_kwh": round(total_consumption, 2),
        "total_cost_eur": round(total_cost, 2),
        "average_cost_per_kwh": round(average_cost, 4),
        "breakdown": breakdown
    }


@app.post("/api/buildings/{building_id}/energy-readings", status_code=201)
def create_energy_reading(building_id: int, reading: EnergyReadingCreate):
    ensure_building(building_id)

    if reading.energy_type not in ("elettricita", "gas", "altro"):
        raise HTTPException(
            status_code=400,
            detail="Tipo energia non valido"
        )

    if reading.period_start > reading.period_end:
        raise HTTPException(
            status_code=400,
            detail="La data iniziale non può essere successiva a quella finale"
        )

    with connect() as db:
        cursor = db.execute(
            """
            INSERT INTO energy_readings (
                building_id, energy_type, period_start, period_end,
                consumption_kwh, cost_eur, source, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                building_id,
                reading.energy_type,
                reading.period_start.isoformat(),
                reading.period_end.isoformat(),
                reading.consumption_kwh,
                reading.cost_eur,
                reading.source,
                reading.notes
            )
        )

        row = db.execute(
            "SELECT * FROM energy_readings WHERE id=?",
            (cursor.lastrowid,)
        ).fetchone()

    return dict(row)




@app.get("/api/buildings/{building_id}/energy-trends")
def get_energy_trends(building_id: int):
    ensure_building(building_id)

    with connect() as db:
        rows = db.execute(
            """
            SELECT energy_type, period_start, period_end,
                   consumption_kwh, cost_eur
            FROM energy_readings
            WHERE building_id=?
            ORDER BY period_start
            """,
            (building_id,)
        ).fetchall()

    months = {}

    for row in rows:
        start = date.fromisoformat(row["period_start"])
        end = date.fromisoformat(row["period_end"])

        if start > end:
            continue

        total_days = (end - start).days + 1
        current = date(start.year, start.month, 1)

        while current <= end:
            if current.month == 12:
                next_month = date(current.year + 1, 1, 1)
            else:
                next_month = date(current.year, current.month + 1, 1)

            month_end = date.fromordinal(next_month.toordinal() - 1)

            overlap_start = max(start, current)
            overlap_end = min(end, month_end)
            overlap_days = (overlap_end - overlap_start).days + 1

            key = current.strftime("%Y-%m")

            if key not in months:
                months[key] = {
                    "month": key,
                    "electricity_kwh": 0.0,
                    "gas_kwh": 0.0,
                    "other_kwh": 0.0,
                    "total_consumption_kwh": 0.0,
                    "total_cost_eur": 0.0,
                    "has_estimated_allocation": False
                }

            consumption = float(row["consumption_kwh"]) * overlap_days / total_days
            cost = float(row["cost_eur"]) * overlap_days / total_days

            item = months[key]

            if row["energy_type"] == "elettricita":
                item["electricity_kwh"] += consumption
            elif row["energy_type"] == "gas":
                item["gas_kwh"] += consumption
            else:
                item["other_kwh"] += consumption

            item["total_consumption_kwh"] += consumption
            item["total_cost_eur"] += cost

            if start.year != end.year or start.month != end.month:
                item["has_estimated_allocation"] = True

            current = next_month

    trends = []

    for key in sorted(months):
        item = months[key]

        for field in (
            "electricity_kwh",
            "gas_kwh",
            "other_kwh",
            "total_consumption_kwh",
            "total_cost_eur"
        ):
            item[field] = round(item[field], 2)

        trends.append(item)

    return {
        "building_id": building_id,
        "months_count": len(trends),
        "trends": trends
    }

@app.delete("/api/buildings/{building_id}/energy-readings/{reading_id}")
def delete_energy_reading(building_id: int, reading_id: int):
    with connect() as db:
        cursor = db.execute(
            """
            DELETE FROM energy_readings
            WHERE id=? AND building_id=?
            """,
            (reading_id, building_id)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Registrazione energetica non trovata"
            )

    return {"message": "Registrazione energetica eliminata"}
