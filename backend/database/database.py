"""
EdgeLite SQLite Database Module
Manages persistence for tasks, event logs, telemetry history, faults, and automatic reports.
"""
import os
import aiosqlite
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "edgelite.db")

async def init_db():
    """Initialize database tables and seed baseline tasks if empty."""
    async with aiosqlite.connect(DB_PATH) as db:
        # Tasks table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                priority TEXT NOT NULL,
                status TEXT NOT NULL,
                progress REAL DEFAULT 0.0,
                created_at TEXT NOT NULL,
                start_time TEXT,
                end_time TEXT,
                duration REAL DEFAULT 0.0,
                estimated_duration REAL DEFAULT 30.0,
                machine TEXT DEFAULT 'UR5e (Cell-01)',
                waiting_reason TEXT,
                result TEXT,
                is_motion_task INTEGER DEFAULT 1
            )
        """)

        # Events table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS task_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                task_id TEXT,
                event_type TEXT NOT NULL,
                description TEXT NOT NULL,
                severity TEXT NOT NULL
            )
        """)

        # Telemetry history table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                task_id TEXT,
                temperature REAL,
                vibration REAL,
                motor_load REAL,
                torque REAL,
                power REAL,
                cycle_time REAL,
                joint_angles TEXT
            )
        """)

        # Faults table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS faults (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                fault_type TEXT NOT NULL,
                problem TEXT NOT NULL,
                cause TEXT NOT NULL,
                affected_task_id TEXT,
                affected_task_name TEXT,
                recommended_action TEXT NOT NULL,
                status TEXT DEFAULT 'ACTIVE',
                cleared_at TEXT
            )
        """)

        # Reports table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                task_name TEXT NOT NULL,
                task_type TEXT NOT NULL,
                priority TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                duration REAL NOT NULL,
                status TEXT NOT NULL,
                robot TEXT DEFAULT 'Universal Robots UR5e',
                cycle_count INTEGER DEFAULT 1,
                avg_motor_load REAL DEFAULT 0.0,
                peak_motor_load REAL DEFAULT 0.0,
                avg_temperature REAL DEFAULT 0.0,
                peak_temperature REAL DEFAULT 0.0,
                avg_vibration REAL DEFAULT 0.0,
                peak_vibration REAL DEFAULT 0.0,
                avg_torque REAL DEFAULT 0.0,
                peak_torque REAL DEFAULT 0.0,
                avg_power REAL DEFAULT 0.0,
                peak_power REAL DEFAULT 0.0,
                edge_cpu_avg REAL DEFAULT 0.0,
                edge_ram_avg REAL DEFAULT 0.0,
                anomalies TEXT DEFAULT 'None',
                faults TEXT DEFAULT 'None',
                corrective_actions TEXT DEFAULT 'None',
                final_result TEXT DEFAULT 'Successful',
                created_at TEXT NOT NULL
            )
        """)

        # Settings table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)

        await db.commit()

        # Seed initial tasks if none exist
        async with db.execute("SELECT COUNT(*) FROM tasks") as cursor:
            count = (await cursor.fetchone())[0]

        if count == 0:
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            initial_tasks = [
                (
                    "TSK-101",
                    "Welding Part A",
                    "Welding",
                    "HIGH",
                    "QUEUED",
                    0.0,
                    now,
                    None,
                    None,
                    0.0,
                    28.0,
                    "UR5e (Cell-01)",
                    "Waiting — Click START to begin execution.",
                    None,
                    1
                ),
                (
                    "TSK-102",
                    "Inspection Part A",
                    "Inspection",
                    "HIGH",
                    "WAITING",
                    0.0,
                    now,
                    None,
                    None,
                    0.0,
                    15.0,
                    "UR5e (Cell-01)",
                    "Waiting — Robot occupied by higher-priority/preceding motion task.",
                    None,
                    1
                ),
                (
                    "TSK-103",
                    "Quality Analysis Part A",
                    "Quality Analysis",
                    "MEDIUM",
                    "QUEUED",
                    0.0,
                    now,
                    None,
                    None,
                    0.0,
                    10.0,
                    "EdgeLite-Node-01",
                    "Queued for edge execution.",
                    None,
                    0
                ),
                (
                    "TSK-104",
                    "Welding Part B",
                    "Welding",
                    "HIGH",
                    "QUEUED",
                    0.0,
                    now,
                    None,
                    None,
                    0.0,
                    32.0,
                    "UR5e (Cell-01)",
                    "Waiting in priority queue.",
                    None,
                    1
                ),
                (
                    "TSK-105",
                    "Maintenance Diagnostics",
                    "Maintenance",
                    "LOW",
                    "QUEUED",
                    0.0,
                    now,
                    None,
                    None,
                    0.0,
                    20.0,
                    "UR5e (Cell-01)",
                    "Scheduled after production queue.",
                    None,
                    1
                )
            ]
            await db.executemany("""
                INSERT INTO tasks (id, name, type, priority, status, progress, created_at, start_time, end_time, duration, estimated_duration, machine, waiting_reason, result, is_motion_task)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, initial_tasks)

            # Initial startup log
            await db.execute("""
                INSERT INTO task_events (timestamp, task_id, event_type, description, severity)
                VALUES (?, ?, ?, ?, ?)
            """, (now, None, "INFO", "EdgeLite system initialized. Edge Node EdgeLite-Node-01 active in LOCAL_EDGE_PROCESSING mode.", "INFO"))
            await db.commit()

async def get_all_tasks() -> List[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM tasks ORDER BY CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, created_at ASC") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def get_task_by_id(task_id: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def create_task(task_data: Dict[str, Any]) -> Dict[str, Any]:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO tasks (id, name, type, priority, status, progress, created_at, start_time, end_time, duration, estimated_duration, machine, waiting_reason, result, is_motion_task)
            VALUES (:id, :name, :type, :priority, :status, :progress, :created_at, :start_time, :end_time, :duration, :estimated_duration, :machine, :waiting_reason, :result, :is_motion_task)
        """, task_data)
        await db.commit()
    return task_data

async def update_task(task_id: str, updates: Dict[str, Any]):
    set_clause = ", ".join([f"{k} = :{k}" for k in updates.keys()])
    params = {**updates, "task_id": task_id}
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE tasks SET {set_clause} WHERE id = :task_id", params)
        await db.commit()

async def add_event(timestamp: str, task_id: Optional[str], event_type: str, description: str, severity: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO task_events (timestamp, task_id, event_type, description, severity)
            VALUES (?, ?, ?, ?, ?)
        """, (timestamp, task_id, event_type, description, severity))
        await db.commit()

async def get_recent_events(limit: int = 50, severity_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if severity_filter and severity_filter != "ALL":
            async with db.execute("SELECT * FROM task_events WHERE severity = ? ORDER BY id DESC LIMIT ?", (severity_filter, limit)) as cursor:
                rows = await cursor.fetchall()
        else:
            async with db.execute("SELECT * FROM task_events ORDER BY id DESC LIMIT ?", (limit,)) as cursor:
                rows = await cursor.fetchall()
        return [dict(row) for row in rows]

async def save_telemetry_point(timestamp: str, task_id: Optional[str], temp: float, vib: float, load: float, torque: float, power: float, cycle: float, joints: Dict[str, float]):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO telemetry_history (timestamp, task_id, temperature, vibration, motor_load, torque, power, cycle_time, joint_angles)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (timestamp, task_id, temp, vib, load, torque, power, cycle, json.dumps(joints)))
        await db.commit()

async def get_recent_telemetry(limit: int = 60) -> List[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM telemetry_history ORDER BY id DESC LIMIT ?", (limit,)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in reversed(rows)]

async def record_fault(fault_data: Dict[str, Any]) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("""
            INSERT INTO faults (timestamp, fault_type, problem, cause, affected_task_id, affected_task_name, recommended_action, status)
            VALUES (:timestamp, :fault_type, :problem, :cause, :affected_task_id, :affected_task_name, :recommended_action, 'ACTIVE')
        """, fault_data)
        fault_id = cursor.lastrowid
        await db.commit()
        return fault_id

async def clear_active_faults(timestamp: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE faults SET status = 'CLEARED', cleared_at = ? WHERE status = 'ACTIVE'", (timestamp,))
        await db.commit()

async def get_active_fault() -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM faults WHERE status = 'ACTIVE' ORDER BY id DESC LIMIT 1") as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def save_report(report_data: Dict[str, Any]):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO reports (id, task_id, task_name, task_type, priority, start_time, end_time, duration, status, robot, cycle_count, avg_motor_load, peak_motor_load, avg_temperature, peak_temperature, avg_vibration, peak_vibration, avg_torque, peak_torque, avg_power, peak_power, edge_cpu_avg, edge_ram_avg, anomalies, faults, corrective_actions, final_result, created_at)
            VALUES (:id, :task_id, :task_name, :task_type, :priority, :start_time, :end_time, :duration, :status, :robot, :cycle_count, :avg_motor_load, :peak_motor_load, :avg_temperature, :peak_temperature, :avg_vibration, :peak_vibration, :avg_torque, :peak_torque, :avg_power, :peak_power, :edge_cpu_avg, :edge_ram_avg, :anomalies, :faults, :corrective_actions, :final_result, :created_at)
        """, report_data)
        await db.commit()

async def get_all_reports() -> List[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM reports ORDER BY created_at DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def get_report_by_id(report_id: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM reports WHERE id = ?", (report_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None
