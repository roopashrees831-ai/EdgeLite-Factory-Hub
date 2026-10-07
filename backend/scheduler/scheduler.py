"""
EdgeLite Intelligent Priority Task Scheduler
Enforces physical single-robot constraint for motion tasks while allowing concurrent edge analytics.
Maintains clear, human-understandable waiting explanations for every queued task.
"""
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from database.database import (
    get_all_tasks,
    update_task,
    get_task_by_id,
    add_event
)

class TaskScheduler:
    MOTION_TASK_TYPES = {"Welding", "Inspection", "Maintenance"}
    EDGE_COMPUTE_TYPES = {"Anomaly Detection", "Quality Analysis", "Report Generation"}

    PRIORITY_WEIGHTS = {
        "CRITICAL": 100,
        "HIGH": 75,
        "MEDIUM": 50,
        "LOW": 25
    }

    def __init__(self):
        pass

    async def evaluate_queue(self, robot_status: str, active_motion_task_id: Optional[str]) -> Optional[Dict[str, Any]]:
        """
        Evaluates the task queue and determines which task should run next or update waiting reasons.
        Returns next task to start if robot is ready.
        """
        all_tasks = await get_all_tasks()
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Find currently running motion task
        running_motion_task = None
        for t in all_tasks:
            if t["status"] == "RUNNING" and t["is_motion_task"]:
                running_motion_task = t
                break

        # If robot is FAULT or STOPPED or PAUSED
        if robot_status in ("STOPPED", "PAUSED", "FAULT"):
            for t in all_tasks:
                if t["status"] == "WAITING" or (t["status"] == "QUEUED" and t["is_motion_task"]):
                    reason = f"Waiting — Robot currently {robot_status.lower()}. Press START to resume cell operation."
                    if t.get("waiting_reason") != reason:
                        await update_task(t["id"], {"waiting_reason": reason, "status": "WAITING"})
            return None

        # Sort candidate tasks: status in (QUEUED, WAITING)
        # Priority sort: CRITICAL > HIGH > MEDIUM > LOW, then by created_at
        candidates = [t for t in all_tasks if t["status"] in ("QUEUED", "WAITING")]
        candidates.sort(
            key=lambda t: (
                self.PRIORITY_WEIGHTS.get(t["priority"], 0),
                -1 * datetime.strptime(t["created_at"], "%Y-%m-%d %H:%M:%S").timestamp()
            ),
            reverse=True
        )

        next_task_to_run = None

        for candidate in candidates:
            is_motion = candidate["is_motion_task"]

            if is_motion:
                if running_motion_task is None:
                    # Robot is free! This top candidate can start
                    if next_task_to_run is None:
                        next_task_to_run = candidate
                else:
                    # Robot is occupied by running_motion_task
                    reason = f"Waiting — UR5e is currently executing {running_motion_task['name']}."
                    if candidate.get("waiting_reason") != reason or candidate["status"] != "WAITING":
                        await update_task(candidate["id"], {
                            "status": "WAITING",
                            "waiting_reason": reason
                        })
            else:
                # Edge computing task (can run concurrently on edge node!)
                # If queued, it can start immediately on edge node
                if candidate["status"] == "QUEUED" and next_task_to_run is None:
                    next_task_to_run = candidate

        return next_task_to_run

    async def advance_task_progress(self, task_id: str, dt_progress: float, current_progress: float) -> Tuple[float, bool]:
        """
        Increments task progress. Returns (new_progress, is_completed).
        """
        new_progress = min(100.0, current_progress + dt_progress)
        is_completed = (new_progress >= 100.0)
        return round(new_progress, 1), is_completed

scheduler = TaskScheduler()
