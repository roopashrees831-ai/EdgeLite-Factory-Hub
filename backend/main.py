"""
EdgeLite Industrial Edge AI Factory Digital Twin
Backend Application (FastAPI + WebSockets + SQLite + ML)
"""
import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database.database import (
    init_db,
    get_all_tasks,
    create_task,
    update_task,
    get_task_by_id,
    add_event,
    get_recent_events,
    get_recent_telemetry,
    get_all_reports,
    get_report_by_id,
    get_active_fault
)
from models.schemas import TaskCreate, JointAngles, ThresholdConfig
from monitoring.system_monitor import monitor
from robot.digital_twin import digital_twin
from ai.anomaly_detector import anomaly_detector
from reports.report_generator import ReportGenerator

# Background simulation runner
async def simulation_loop():
    while True:
        try:
            await digital_twin.tick()
        except Exception as e:
            print(f"Simulation tick error: {e}")
        await asyncio.sleep(0.04)  # 25 Hz update rate

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    sim_task = asyncio.create_task(simulation_loop())
    yield
    # Shutdown
    sim_task.cancel()

app = FastAPI(
    title="EdgeLite — Industrial Edge AI Digital Twin API",
    description="Cost-Effective Edge AI Factory Digital Twin for Shop-Floor Digitalization",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- SYSTEM & RESOURCE ENDPOINTS -----------------

@app.get("/api/system/status")
async def get_system_status():
    """Returns authentic local laptop host hardware metrics and edge node identity."""
    metrics = monitor.get_metrics()
    tasks = await get_all_tasks()
    active_count = len([t for t in tasks if t["status"] == "RUNNING"])
    queued_count = len([t for t in tasks if t["status"] in ("QUEUED", "WAITING")])
    metrics["active_tasks_count"] = active_count
    metrics["queued_tasks_count"] = queued_count
    return metrics

# ----------------- ROBOT DIGITAL TWIN ENDPOINTS -----------------

@app.get("/api/robot/state")
async def get_robot_state():
    """Returns full digital twin state, joint angles, telemetry, and AI health."""
    return digital_twin.get_state()

@app.post("/api/robot/start")
async def start_robot():
    """Start or resume robot execution and task scheduler."""
    res = await digital_twin.start()
    return res

@app.post("/api/robot/stop")
async def stop_robot():
    """Stop robot motion and pause current task."""
    res = await digital_twin.stop()
    return res

@app.post("/api/robot/reset")
async def reset_robot():
    """Reset robot to safe home pose without wiping historical data."""
    res = await digital_twin.reset()
    return res

@app.post("/api/robot/home")
async def home_robot():
    """Articulate robot to default Home pose."""
    res = await digital_twin.home()
    return res

@app.post("/api/robot/joints")
async def set_joints(angles: JointAngles):
    """Manually command joint angles."""
    res = digital_twin.set_joints(angles.model_dump())
    return res

# ----------------- TASK SCHEDULER ENDPOINTS -----------------

@app.get("/api/tasks")
async def list_tasks():
    """List all scheduled tasks with priority order and waiting explanations."""
    tasks = await get_all_tasks()
    return tasks

@app.post("/api/tasks")
async def add_new_task(task_input: TaskCreate):
    """Add a new task to the queue with automatic ID and physical constraint check."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    task_id = f"TSK-{int(datetime.now().timestamp() % 100000)}"
    is_motion = task_input.type in ("Welding", "Inspection", "Maintenance")
    machine = "UR5e (Cell-01)" if is_motion else "EdgeLite-Node-01"

    # Determine initial waiting reason based on robot occupancy
    if is_motion and digital_twin.status == "RUNNING" and digital_twin.current_task:
        reason = f"Waiting — UR5e is currently executing {digital_twin.current_task['name']}."
        status = "WAITING"
    elif is_motion and digital_twin.status in ("STOPPED", "PAUSED", "FAULT"):
        reason = f"Waiting — Robot currently {digital_twin.status.lower()}."
        status = "WAITING"
    else:
        reason = "Queued in priority queue."
        status = "QUEUED"

    task_record = {
        "id": task_id,
        "name": task_input.name,
        "type": task_input.type.value,
        "priority": task_input.priority.value,
        "status": status,
        "progress": 0.0,
        "created_at": now,
        "start_time": None,
        "end_time": None,
        "duration": 0.0,
        "estimated_duration": task_input.estimated_duration,
        "machine": machine,
        "waiting_reason": reason,
        "result": None,
        "is_motion_task": 1 if is_motion else 0
    }
    created = await create_task(task_record)
    await add_event(now, task_id, "INFO", f"New task created: {task_input.name} [{task_input.priority.value}].", "INFO")
    return created

@app.post("/api/tasks/{task_id}/restart")
async def restart_task(task_id: str):
    """Restart or re-queue an existing task."""
    task = await get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await update_task(task_id, {
        "status": "QUEUED",
        "progress": 0.0,
        "start_time": None,
        "end_time": None,
        "duration": 0.0,
        "waiting_reason": "Re-queued for execution.",
        "result": None
    })
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    await add_event(now, task_id, "INFO", f"Task {task['name']} re-queued.", "INFO")
    return {"success": True, "message": "Task re-queued"}

# ----------------- FAULT MANAGEMENT & DEMO INJECTION -----------------

@app.post("/api/faults/inject")
async def inject_demo_fault(payload: Dict[str, str]):
    """Demo Fault Injection (Requirement 15). Clearly labeled simulated test fault."""
    fault_type = payload.get("fault_type", "J3 Motor Overload")
    res = await digital_twin.inject_fault(fault_type)
    return res

@app.post("/api/faults/clear")
async def clear_fault():
    """Fault Recovery (Requirement 16). Clears fault; leaves robot stopped for safe resume."""
    res = await digital_twin.clear_fault()
    return res

@app.get("/api/faults/active")
async def get_current_fault():
    """Get currently active fault diagnostics."""
    fault = await get_active_fault()
    return fault

# ----------------- REPORTS ENDPOINTS -----------------

@app.get("/api/reports")
async def list_reports():
    """List all automatically generated task execution reports."""
    reports = await get_all_reports()
    return reports

@app.get("/api/reports/{report_id}")
async def get_report(report_id: str):
    """Get single report by ID."""
    report = await get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@app.get("/api/reports/{report_id}/pdf")
async def download_report_pdf(report_id: str):
    """Download report as a formatted PDF."""
    report = await get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    pdf_bytes = ReportGenerator.export_pdf(report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={report_id}.pdf"}
    )

@app.get("/api/reports/export/csv")
async def export_reports_csv():
    """Download all reports as CSV."""
    reports = await get_all_reports()
    csv_str = ReportGenerator.export_csv(reports)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=edgelite_task_reports.csv"}
    )

# ----------------- HISTORY & TIMELINE ENDPOINTS -----------------

@app.get("/api/history")
async def get_event_history(limit: int = 50, severity: Optional[str] = None):
    """Get chronological event log."""
    events = await get_recent_events(limit=limit, severity_filter=severity)
    return events

# ----------------- AI ANALYTICS ENDPOINTS -----------------

@app.get("/api/ai/analytics")
async def get_ai_analytics():
    """Return AI model health score, anomaly score, telemetry history, and feature importance."""
    state = digital_twin.get_state()
    history = await get_recent_telemetry(limit=60)
    return {
        "ai_health": state["ai_health"],
        "anomaly_score": state["anomaly_score"],
        "explanation": state["ai_explanation"],
        "feature_contributions": state["feature_contributions"],
        "thresholds": anomaly_detector.thresholds,
        "baseline_stats": anomaly_detector.baseline_stats,
        "telemetry_history": history,
        "data_source": anomaly_detector.data_source
    }

# ----------------- SETTINGS & CONFIGURATION -----------------

@app.get("/api/settings")
async def get_settings():
    return {
        "node_name": monitor.node_name,
        "processing_mode": monitor.processing_mode,
        "cloud_dependency": monitor.cloud_dependency,
        "simulation_mode": "ENABLED",
        "hardware_connection": "NOT CONNECTED (Digital Twin Active)",
        "thresholds": anomaly_detector.thresholds
    }

@app.post("/api/settings")
async def update_settings(cfg: ThresholdConfig):
    anomaly_detector.thresholds["temperature"] = cfg.temperature_limit
    anomaly_detector.thresholds["vibration"] = cfg.vibration_limit
    anomaly_detector.thresholds["motor_load"] = cfg.motor_load_limit
    anomaly_detector.thresholds["torque"] = cfg.torque_limit
    return {"success": True, "thresholds": anomaly_detector.thresholds}

# ----------------- WEBSOCKET TELEMETRY STREAM -----------------

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            robot_state = digital_twin.get_state()
            sys_metrics = monitor.get_metrics()
            payload = {
                **robot_state,
                "system": sys_metrics,
                "timestamp": datetime.now().strftime("%H:%M:%S")
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(0.04)  # 25 Hz stream
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
