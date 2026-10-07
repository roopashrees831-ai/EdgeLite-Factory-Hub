"""
EdgeLite Universal Robots UR5e Digital Twin Core Engine
Manages robot state machine, trajectory execution, real-time telemetry generation,
safety checks, fault management, and task progression.
"""
import asyncio
import time
from datetime import datetime
from typing import Dict, Any, Optional, List

from robot.kinematics import UR5eKinematics
from robot.telemetry import TelemetryEngine
from ai.anomaly_detector import anomaly_detector
from ai.diagnostics import diagnostics
from monitoring.system_monitor import monitor
from reports.report_generator import ReportGenerator
from ai.workload_manager import workload_manager
from database.database import (
    get_all_tasks,
    create_task,
    update_task,
    get_task_by_id,
    add_event,
    save_telemetry_point,
    record_fault,
    clear_active_faults,
    save_report
)


class DigitalTwinEngine:
    # Four software-only robot tasks used by the competition prototype.
    DEMO_TASKS = [
        {
            "id": "TSK-100",
            "name": "Pick & Place Part A",
            "type": "Pick & Place",
            "priority": "CRITICAL",
            "estimated_duration": 14.0,
            "machine": "UR5e (Cell-01)",
            "is_motion_task": 1,
        },
        {
            "id": "TSK-101",
            "name": "Sorting Part B",
            "type": "Sorting",
            "priority": "HIGH",
            "estimated_duration": 12.0,
            "machine": "UR5e (Cell-01)",
            "is_motion_task": 1,
        },
        {
            "id": "TSK-102",
            "name": "Palletizing Part C",
            "type": "Palletizing",
            "priority": "HIGH",
            "estimated_duration": 13.0,
            "machine": "UR5e (Cell-01)",
            "is_motion_task": 1,
        },
        {
            "id": "TSK-103",
            "name": "Welding Path Part D",
            "type": "Welding Path",
            "priority": "MEDIUM",
            "estimated_duration": 15.0,
            "machine": "UR5e (Cell-01)",
            "is_motion_task": 1,
        },
    ]

    DEMO_IDS = {
        item["id"] for item in DEMO_TASKS
    }

    DEMO_IDS_ORDER = [
        item["id"] for item in DEMO_TASKS
    ]

    async def _ensure_demo_queue(self) -> None:
        now = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        for item in self.DEMO_TASKS:
            existing = await get_task_by_id(
                item["id"]
            )

            payload = {
                "id": item["id"],
                "name": item["name"],
                "type": item["type"],
                "priority": item["priority"],
                "status": "QUEUED",
                "progress": 0.0,
                "created_at": (
                    existing.get(
                        "created_at",
                        now
                    )
                    if existing
                    else now
                ),
                "start_time": None,
                "end_time": None,
                "duration": 0.0,
                "estimated_duration": item[
                    "estimated_duration"
                ],
                "machine": item["machine"],
                "waiting_reason": (
                    "Waiting for automatic "
                    "priority scheduler."
                ),
                "result": None,
                "is_motion_task": 1,
            }

            if existing:
                # Do not overwrite live status here.
                await update_task(
                    item["id"],
                    {
                        "name": item["name"],
                        "type": item["type"],
                        "priority": item["priority"],
                        "estimated_duration": item[
                            "estimated_duration"
                        ],
                        "machine": item["machine"],
                        "is_motion_task": 1,
                    },
                )
            else:
                await create_task(
                    payload
                )

        # Disable unrelated old synthetic motion jobs.
        all_tasks = await get_all_tasks()

        for task in all_tasks:
            if (
                task.get("id")
                not in self.DEMO_IDS
                and task.get("is_motion_task")
            ):
                try:
                    await update_task(
                        task["id"],
                        {
                            "is_motion_task": 0,
                            "status": "WAITING",
                            "waiting_reason": (
                                "Synthetic four-task "
                                "demo scheduler is active."
                            ),
                        },
                    )
                except Exception:
                    pass

    async def _reset_demo_queue(
        self
    ) -> None:
        """
        Only RESET should call this function.
        START must never rebuild the queue.
        """
        await self._ensure_demo_queue()

        for item in self.DEMO_TASKS:
            await update_task(
                item["id"],
                {
                    "status": "QUEUED",
                    "progress": 0.0,
                    "start_time": None,
                    "end_time": None,
                    "duration": 0.0,
                    "waiting_reason": (
                        "Waiting for automatic "
                        "priority scheduler."
                    ),
                    "result": None,
                },
            )

    async def _next_demo_task(
        self
    ) -> Optional[Dict[str, Any]]:
        """
        Return the next unfinished task.
        """
        await self._ensure_demo_queue()

        tasks = await get_all_tasks()

        candidates = [
            task
            for task in tasks
            if (
                task.get("id")
                in self.DEMO_IDS
                and task.get("status")
                in (
                    "QUEUED",
                    "WAITING",
                )
            )
        ]

        priority_rank = {
            "CRITICAL": 4,
            "HIGH": 3,
            "MEDIUM": 2,
            "LOW": 1,
        }

        candidates.sort(
            key=lambda task: (
                priority_rank.get(
                    str(
                        task.get(
                            "priority",
                            "LOW"
                        )
                    ).upper(),
                    1,
                ),
                -self.DEMO_IDS_ORDER.index(
                    task["id"]
                ),
            ),
            reverse=True,
        )

        return (
            candidates[0]
            if candidates
            else None
        )

    def __init__(self):
        self.status = "READY"

        self.joint_angles = (
            UR5eKinematics
            .HOME_POSE_DEG
            .copy()
        )

        self.target_angles = (
            UR5eKinematics
            .HOME_POSE_DEG
            .copy()
        )

        self.manual_override = False

        self.telemetry_engine = (
            TelemetryEngine()
        )

        self.current_task_id: Optional[
            str
        ] = None

        self.current_task: Optional[
            Dict[str, Any]
        ] = None

        self.task_progress = 0.0

        self.welding_active = False

        self.active_fault: Optional[
            Dict[str, Any]
        ] = None

        self.injected_fault_name: Optional[
            str
        ] = None

        # Standalone demo mode compatibility.
        self.demo_mode = False
        self.demo_progress = 0.0

        # Task report buffers.
        self.task_telemetry_samples: List[
            Dict[str, float]
        ] = []

        self.task_events_log: List[
            Dict[str, Any]
        ] = []

        self.task_had_fault = False

        # Timing.
        self.last_tick_time = time.time()
        self.last_db_save_time = time.time()
        self.last_ml_measurement_time = 0.0

        self.current_stage = "Idle"

        self.stage_history: List[
            str
        ] = []

        self.edge_samples: List[
            Dict[str, Any]
        ] = []

        self.edge_decision: Dict[
            str, Any
        ] = {}

        self.fault_report_generated = False

        # Tracks tasks that have already completed.
        # START does not clear this set.
        # RESET clears it.
        self.completed_demo_ids = set()

        self.demo_sequence_finished = False

    @staticmethod
    def get_task_stage(
        progress: float
    ) -> str:
        p = max(
            0.0,
            min(
                100.0,
                float(progress)
            )
        )

        if p < 12:
            return "Approaching Part"

        if p < 22:
            return "Aligning Gripper"

        if p < 32:
            return "Gripping Part"

        if p < 43:
            return "Lifting Part"

        if p < 72:
            return "Carrying Part"

        if p < 82:
            return "Placing Part"

        if p < 90:
            return "Releasing Part"

        if p < 100:
            return "Returning Home"

        return "Cycle Complete"

    async def _record_stage_transition(
        self,
        new_stage: str,
        now: str
    ) -> None:
        if new_stage == self.current_stage:
            return

        self.current_stage = new_stage

        if (
            new_stage
            not in self.stage_history
        ):
            self.stage_history.append(
                new_stage
            )

        if self.current_task:
            await add_event(
                now,
                self.current_task["id"],
                "INFO",
                (
                    f"Robot stage: "
                    f"{new_stage}."
                ),
                "INFO",
            )

    async def _generate_fault_report(
        self,
        now: str
    ) -> None:
        if (
            self.fault_report_generated
            or not self.current_task
        ):
            return

        task = dict(
            self.current_task
        )

        task["status"] = "PAUSED"
        task["end_time"] = now

        report = (
            ReportGenerator
            .generate_report_record(
                task=task,
                telemetry_samples=(
                    self.task_telemetry_samples
                ),
                events=self.task_events_log,
                edge_metrics=(
                    monitor.get_metrics()
                ),
                fault_occurred=True,
                fault_name=(
                    self.injected_fault_name
                    or "Safety Fault"
                ),
                edge_samples=(
                    self.edge_samples
                ),
                stage_summary=(
                    self.current_stage
                ),
                ai_mode=(
                    self.edge_decision.get(
                        "mode_label"
                    )
                ),
                status_override=(
                    "FAULT REPORT / PAUSED"
                ),
                end_time_override=now,
                final_result_override=(
                    "Fault detected — "
                    "task paused for recovery"
                ),
                report_suffix="-FAULT",
            )
        )

        await save_report(
            report
        )

        await add_event(
            now,
            self.current_task["id"],
            "INFO",
            (
                "Automatic fault report "
                f"generated ({report['id']})."
            ),
            "INFO",
        )

        self.fault_report_generated = True

    def get_state(
        self
    ) -> Dict[str, Any]:
        """
        Return current Digital Twin state.
        """

        (
            fk_x,
            fk_y,
            fk_z,
        ) = (
            UR5eKinematics
            .forward_kinematics(
                self.joint_angles
            )
        )

        current_op = "Idle"

        if (
            self.status == "RUNNING"
            and self.current_task
        ):
            current_op = (
                self.current_stage
                or
                f"Executing "
                f"{self.current_task['name']}"
            )

        elif (
            self.status == "RUNNING"
            and self.demo_mode
        ):
            phase = self.demo_progress

            if phase < 0.14:
                current_op = (
                    "Pick & Place — "
                    "Approaching Part A"
                )
            elif phase < 0.25:
                current_op = (
                    "Pick & Place — "
                    "Lowering Gripper"
                )
            elif phase < 0.38:
                current_op = (
                    "Pick & Place — "
                    "Gripping Part A"
                )
            elif phase < 0.45:
                current_op = (
                    "Pick & Place — "
                    "Lifting Part A"
                )
            elif phase < 0.77:
                current_op = (
                    "Pick & Place — "
                    "Carrying Part A"
                )
            elif phase < 0.84:
                current_op = (
                    "Pick & Place — "
                    "Lowering at Destination"
                )
            elif phase < 0.90:
                current_op = (
                    "Pick & Place — "
                    "Releasing Part A"
                )
            else:
                current_op = (
                    "Pick & Place — "
                    "Returning Home"
                )

        elif self.status == "FAULT":
            current_op = (
                "FAULT: "
                f"{self.injected_fault_name or 'Safety Tripped'}"
            )

        elif self.status == "PAUSED":
            current_op = "Motion Paused"

        elif self.status == "STOPPED":
            current_op = "Robot Stopped"

        elif self.status == "READY":
            if self.demo_sequence_finished:
                current_op = (
                    "All Tasks Complete"
                )
            else:
                current_op = "READY"

        latest_tel = {
            "temperature": round(
                self.telemetry_engine.temperature,
                2,
            ),
            "vibration": round(
                self.telemetry_engine.vibration,
                2,
            ),
            "motor_load": round(
                self.telemetry_engine.motor_load,
                1,
            ),
            "torque": round(
                self.telemetry_engine.torque,
                1,
            ),
            "power": round(
                self.telemetry_engine.power,
                1,
            ),
            "cycle_time": round(
                self.telemetry_engine.cycle_time,
                2,
            ),
        }

        ai_res = anomaly_detector.analyze(
            latest_tel
        )

        # ----------------------------------------------------------
        # TASK QUEUE
        # ----------------------------------------------------------

        demo_queue = []

        for item in self.DEMO_TASKS:
            task_id = item["id"]

            if (
                self.current_task_id
                == task_id
                and self.status
                == "RUNNING"
            ):
                q_status = "RUNNING"
                q_progress = round(
                    self.task_progress,
                    1,
                )

            elif (
                self.current_task_id
                == task_id
                and self.status
                in (
                    "PAUSED",
                    "STOPPED",
                    "FAULT",
                )
            ):
                q_status = "PAUSED"
                q_progress = round(
                    self.task_progress,
                    1,
                )

            elif (
                task_id
                in self.completed_demo_ids
            ):
                q_status = "COMPLETED"
                q_progress = 100.0

            else:
                q_status = "WAITING"
                q_progress = 0.0

            demo_queue.append(
                {
                    **item,
                    "status": q_status,
                    "progress": q_progress,
                }
            )

        return {
            "robot_status": self.status,
            "joint_angles": (
                self.joint_angles
            ),
            "cartesian_position": {
                "x": fk_x,
                "y": fk_y,
                "z": fk_z,
            },
            "telemetry": latest_tel,
            "welding_active": (
                self.welding_active
            ),
            "current_operation": (
                current_op
            ),
            "current_task": (
                self.current_task
            ),
            "task_progress": round(
                self.task_progress,
                1,
            ),
            "task_stage": (
                self.current_stage
            ),
            "edge_decision": (
                self.edge_decision
            ),
            "workload_manager": (
                workload_manager.status()
            ),
            "active_fault": (
                self.active_fault
            ),
            "ai_health": ai_res[
                "ai_health"
            ],
            "anomaly_score": ai_res[
                "anomaly_score"
            ],
            "ai_explanation": ai_res[
                "explanation"
            ],
            "feature_contributions": (
                ai_res[
                    "feature_contributions"
                ]
            ),
            "hardware_connected": False,
            "robot_source": (
                "EdgeLite Robot Simulator"
            ),
            "hardware_label": (
                "Software Digital Twin"
            ),
            "demo_queue": demo_queue,
            "demo_sequence_finished": (
                self.demo_sequence_finished
            ),
        }

    async def start(
        self
    ) -> Dict[str, Any]:
        """
        Start exactly ONE queued task.

        START does not reset the queue.
        START does not automatically start the next task.
        """

        if self.status == "FAULT":
            return {
                "success": False,
                "message": (
                    "Cannot start: "
                    "Clear active fault first."
                ),
            }

        now = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        # Already running.
        if (
            self.status == "RUNNING"
            and self.current_task
        ):
            return {
                "success": True,
                "message": (
                    f"{self.current_task['name']} "
                    "is already running."
                ),
            }

        # Resume a paused/stopped active task.
        if (
            self.current_task
            and self.status
            in (
                "PAUSED",
                "STOPPED",
            )
        ):
            self.status = "RUNNING"

            self.demo_mode = False

            await update_task(
                self.current_task["id"],
                {
                    "status": "RUNNING",
                    "waiting_reason": None,
                },
            )

            await add_event(
                now,
                self.current_task["id"],
                "RECOVERY",
                (
                    f"Resumed "
                    f"{self.current_task['name']} "
                    f"from "
                    f"{self.task_progress:.0f}%."
                ),
                "RECOVERY",
            )

            return {
                "success": True,
                "message": (
                    f"Resumed "
                    f"{self.current_task['name']}."
                ),
            }

        # Never automatically restart after all four.
        if self.demo_sequence_finished:
            return {
                "success": False,
                "message": (
                    "All four robot tasks are complete. "
                    "Press RESET to start a new cycle."
                ),
            }

        # ----------------------------------------------------------
        # START NEVER RESETS THE QUEUE
        # ----------------------------------------------------------

        if self.current_task is None:

            # Recover completion state from SQLite if
            # the backend was restarted.
            all_tasks = (
                await get_all_tasks()
            )

            self.completed_demo_ids = {
                str(
                    task.get("id")
                )
                for task in all_tasks
                if (
                    task.get("id")
                    in self.DEMO_IDS
                    and str(
                        task.get(
                            "status",
                            "",
                        )
                    ).upper()
                    == "COMPLETED"
                )
            }

            self.demo_sequence_finished = (
                len(
                    self.completed_demo_ids
                )
                >= len(self.DEMO_IDS)
            )

            if self.demo_sequence_finished:
                self.status = "READY"

                self.joint_angles = (
                    UR5eKinematics
                    .HOME_POSE_DEG
                    .copy()
                )

                self.target_angles = (
                    UR5eKinematics
                    .HOME_POSE_DEG
                    .copy()
                )

                return {
                    "success": False,
                    "message": (
                        "All four robot tasks are complete. "
                        "Press RESET to start a new cycle."
                    ),
                }

            self.task_progress = 0.0
            self.current_stage = "Idle"

        # ----------------------------------------------------------
        # Select next waiting task.
        # ----------------------------------------------------------

        next_task = (
            await self._next_demo_task()
        )

        if not next_task:
            self.status = "READY"

            self.demo_sequence_finished = True

            self.current_task = None
            self.current_task_id = None

            self.task_progress = 100.0

            self.current_stage = (
                "All Tasks Complete"
            )

            self.joint_angles = (
                UR5eKinematics
                .HOME_POSE_DEG
                .copy()
            )

            self.target_angles = (
                UR5eKinematics
                .HOME_POSE_DEG
                .copy()
            )

            return {
                "success": False,
                "message": (
                    "All four robot tasks are complete. "
                    "Press RESET to start again."
                ),
            }

        # ----------------------------------------------------------
        # Start selected task.
        # ----------------------------------------------------------

        self.current_task_id = (
            next_task["id"]
        )

        self.current_task = (
            next_task
        )

        self.task_progress = float(
            next_task.get(
                "progress",
                0.0,
            )
            or 0.0
        )

        self.task_telemetry_samples = []
        self.task_events_log = []

        self.task_had_fault = False
        self.fault_report_generated = False

        self.current_stage = (
            self.get_task_stage(
                self.task_progress
            )
        )

        self.stage_history = [
            self.current_stage
        ]

        self.edge_samples = []
        self.edge_decision = {}

        self.demo_mode = False
        self.demo_progress = 0.0

        self.manual_override = False

        self.status = "RUNNING"

        self.welding_active = False

        self.injected_fault_name = None
        self.active_fault = None

        self.telemetry_engine.cycle_time = 0.0

        await update_task(
            next_task["id"],
            {
                "status": "RUNNING",
                "progress": round(
                    self.task_progress,
                    1,
                ),
                "start_time": now,
                "end_time": None,
                "duration": 0.0,
                "waiting_reason": None,
                "result": None,
            },
        )

        await add_event(
            now,
            next_task["id"],
            "AI",
            (
                f"EdgeLite automatically selected "
                f"{next_task['name']} because "
                f"{next_task['priority']} priority "
                "is next."
            ),
            "AI",
        )

        await add_event(
            now,
            next_task["id"],
            "INFO",
            (
                f"{next_task['name']} started "
                "on UR5e (Cell-01)."
            ),
            "INFO",
        )

        return {
            "success": True,
            "message": (
                f"Started "
                f"{next_task['name']}."
            ),
        }

    async def stop(
        self
    ) -> Dict[str, Any]:
        """
        Stop/pause current task.
        """

        now = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        self.status = "STOPPED"
        self.welding_active = False
        self.demo_mode = False

        if self.current_task:
            await update_task(
                self.current_task["id"],
                {
                    "status": "PAUSED",
                    "progress": round(
                        self.task_progress,
                        1,
                    ),
                    "waiting_reason": (
                        "Paused by operator "
                        "STOP action."
                    ),
                },
            )

            await add_event(
                now,
                self.current_task["id"],
                "INFO",
                (
                    f"Task "
                    f"{self.current_task['name']} "
                    "paused."
                ),
                "INFO",
            )

        await add_event(
            now,
            None,
            "INFO",
            "Robot stopped by operator.",
            "INFO",
        )

        return {
            "success": True,
            "message": "Robot stopped.",
        }

    async def reset(
        self
    ) -> Dict[str, Any]:
        """
        Reset the Digital Twin and all four tasks.
        """

        now = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        self.status = "READY"

        self.demo_mode = False
        self.demo_progress = 0.0

        self.joint_angles = (
            UR5eKinematics
            .HOME_POSE_DEG
            .copy()
        )

        self.target_angles = (
            UR5eKinematics
            .HOME_POSE_DEG
            .copy()
        )

        self.welding_active = False
        self.task_progress = 0.0

        self.telemetry_engine.reset()

        if self.current_task:
            try:
                await update_task(
                    self.current_task["id"],
                    {
                        "status": "QUEUED",
                        "progress": 0.0,
                        "waiting_reason": (
                            "Reset by operator."
                        ),
                    },
                )
            except Exception:
                pass

        self.current_task = None
        self.current_task_id = None

        self.current_stage = "Idle"
        self.stage_history = []

        self.edge_samples = []
        self.edge_decision = {}

        self.active_fault = None
        self.injected_fault_name = None

        self.task_had_fault = False
        self.fault_report_generated = False

        self.manual_override = False

        # RESET is the only place that clears
        # the completed-task history.
        self.completed_demo_ids.clear()

        self.demo_sequence_finished = False

        await self._reset_demo_queue()

        await add_event(
            now,
            None,
            "INFO",
            (
                "Robot reset to Home. "
                "Four-task queue reset to "
                "CRITICAL → HIGH → HIGH → MEDIUM."
            ),
            "INFO",
        )

        return {
            "success": True,
            "message": (
                "Robot reset to Home and "
                "four-task queue."
            ),
        }

    async def home(
        self
    ) -> Dict[str, Any]:
        """
        Move robot to Home.
        """

        self.demo_mode = False
        self.demo_progress = 0.0

        self.joint_angles = (
            UR5eKinematics
            .HOME_POSE_DEG
            .copy()
        )

        self.target_angles = (
            UR5eKinematics
            .HOME_POSE_DEG
            .copy()
        )

        self.welding_active = False

        now = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        await add_event(
            now,
            None,
            "INFO",
            "Robot articulated to safe Home pose.",
            "INFO",
        )

        return {
            "success": True,
            "message": (
                "Robot moved to Home pose."
            ),
        }

    def set_joints(
        self,
        angles: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Manual joint slider control.
        """

        for key, value in angles.items():

            if key in self.joint_angles:

                low, high = (
                    UR5eKinematics
                    .JOINT_LIMITS[key]
                )

                self.joint_angles[key] = round(
                    max(
                        low,
                        min(
                            high,
                            float(value),
                        ),
                    ),
                    2,
                )

        self.manual_override = True

        return {
            "success": True,
            "joint_angles": (
                self.joint_angles
            ),
        }

    async def inject_fault(
        self,
        fault_type: str
    ) -> Dict[str, Any]:
        """
        Deliberate software Digital Twin fault injection.
        """

        now = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        self.status = "FAULT"

        self.welding_active = False

        self.demo_mode = False
        self.demo_progress = 0.0

        self.injected_fault_name = (
            fault_type
        )

        self.task_had_fault = True

        task_id = (
            self.current_task["id"]
            if self.current_task
            else None
        )

        task_name = (
            self.current_task["name"]
            if self.current_task
            else "No Active Task"
        )

        if self.current_task:
            await update_task(
                self.current_task["id"],
                {
                    "status": "PAUSED",
                    "progress": round(
                        self.task_progress,
                        1,
                    ),
                    "waiting_reason": (
                        "Halted by Demo Fault: "
                        f"{fault_type}"
                    ),
                },
            )

        diag = diagnostics.diagnose_fault(
            fault_type,
            task_id,
            task_name,
        )

        diag["timestamp"] = now

        self.active_fault = diag

        fault_id = await record_fault(
            diag
        )

        diag["id"] = fault_id

        await add_event(
            now,
            task_id,
            "FAULT",
            (
                f"Demo Fault Injected: "
                f"{fault_type}. "
                f"Problem: {diag['problem']}"
            ),
            "FAULT",
        )

        await add_event(
            now,
            task_id,
            "AI",
            (
                f"AI Diagnostics: "
                f"{diag['cause']} "
                "Recommended action: "
                f"{diag['recommended_action']}"
            ),
            "AI",
        )

        await self._generate_fault_report(
            now
        )

        return {
            "success": True,
            "fault": diag,
        }

    async def clear_fault(
        self
    ) -> Dict[str, Any]:
        """
        Clear current fault.
        Robot remains STOPPED.
        """

        now = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        await clear_active_faults(
            now
        )

        self.active_fault = None
        self.injected_fault_name = None

        self.demo_mode = False
        self.demo_progress = 0.0

        self.status = "STOPPED"
        self.welding_active = False

        task_id = (
            self.current_task["id"]
            if self.current_task
            else None
        )

        await add_event(
            now,
            task_id,
            "RECOVERY",
            (
                "Active fault cleared by operator. "
                "Robot in STOPPED safety state. "
                "Ready for START/RESUME."
            ),
            "RECOVERY",
        )

        return {
            "success": True,
            "message": (
                "Fault cleared. "
                "Press START to resume operation."
            ),
        }

    async def tick(
        self
    ):
        """
        Main Digital Twin update called by
        the background worker.
        """

        now_time = time.time()

        dt = max(
            0.01,
            min(
                now_time
                - self.last_tick_time,
                0.1,
            ),
        )

        self.last_tick_time = now_time

        task_type = (
            self.current_task["type"]
            if self.current_task
            else None
        )

        # ==========================================================
        # ACTIVE SCHEDULED TASK
        # ==========================================================

        if (
            self.status == "RUNNING"
            and self.current_task
            and self.current_task.get(
                "is_motion_task",
                True,
            )
        ):
            est_dur = float(
                self.current_task.get(
                    "estimated_duration",
                    30.0,
                )
            )

            progress_step = (
                dt / est_dur
            ) * 100.0

            self.task_progress = min(
                100.0,
                self.task_progress
                + progress_step,
            )

            now_str = datetime.now().strftime(
                "%Y-%m-%d %H:%M:%S"
            )

            # Update stage.
            await self._record_stage_transition(
                self.get_task_stage(
                    self.task_progress
                ),
                now_str,
            )

            # Update robot trajectory.
            norm_progress = (
                self.task_progress
                / 100.0
            )

            if not self.manual_override:
                (
                    new_angles,
                    is_weld,
                ) = (
                    UR5eKinematics
                    .get_trajectory_pose(
                        task_type,
                        norm_progress,
                    )
                )

                self.joint_angles = (
                    new_angles
                )

                self.welding_active = (
                    is_weld
                )

            # Save progress periodically.
            if (
                int(
                    self.task_progress
                )
                % 5
                == 0
            ):
                await update_task(
                    self.current_task["id"],
                    {
                        "progress": round(
                            self.task_progress,
                            1,
                        ),
                        "duration": round(
                            self.current_task.get(
                                "duration",
                                0.0,
                            )
                            + dt,
                            1,
                        ),
                    },
                )

            # Complete exactly one task.
            if (
                self.task_progress
                >= 100.0
            ):
                await self._complete_active_task()

        # ==========================================================
        # STANDALONE DEMO MODE
        # ==========================================================

        elif (
            self.status == "RUNNING"
            and self.demo_mode
            and not self.manual_override
        ):
            demo_duration = 14.0

            self.demo_progress += (
                dt
                / demo_duration
            )

            # Standalone demo never loops.
            if (
                self.demo_progress
                >= 1.0
            ):
                self.demo_progress = 1.0
                self.demo_mode = False
                self.status = "READY"

                self.joint_angles = (
                    UR5eKinematics
                    .HOME_POSE_DEG
                    .copy()
                )

                self.target_angles = (
                    UR5eKinematics
                    .HOME_POSE_DEG
                    .copy()
                )

            def smoothstep(
                value: float
            ) -> float:
                value = max(
                    0.0,
                    min(
                        1.0,
                        value,
                    ),
                )

                return (
                    value
                    * value
                    * (
                        3.0
                        - 2.0
                        * value
                    )
                )

            # Existing built-in demo trajectory.
            waypoints = [
                (
                    0.00,
                    {
                        "j1": 0.0,
                        "j2": -90.0,
                        "j3": 0.0,
                        "j4": -90.0,
                        "j5": 0.0,
                        "j6": 0.0,
                    },
                ),
                (
                    0.14,
                    {
                        "j1": 43.26,
                        "j2": -75.64,
                        "j3": -22.99,
                        "j4": -95.97,
                        "j5": 0.0,
                        "j6": 0.0,
                    },
                ),
                (
                    0.25,
                    {
                        "j1": 43.26,
                        "j2": -57.92,
                        "j3": -15.30,
                        "j4": -96.60,
                        "j5": 0.0,
                        "j6": 0.0,
                    },
                ),
                (
                    0.38,
                    {
                        "j1": 43.26,
                        "j2": -57.92,
                        "j3": -15.30,
                        "j4": -96.60,
                        "j5": 0.0,
                        "j6": 0.0,
                    },
                ),
                (
                    0.45,
                    {
                        "j1": 43.26,
                        "j2": -81.08,
                        "j3": -33.02,
                        "j4": -97.27,
                        "j5": 0.0,
                        "j6": 0.0,
                    },
                ),
                (
                    0.55,
                    {
                        "j1": 20.96,
                        "j2": -95.81,
                        "j3": -18.31,
                        "j4": -92.50,
                        "j5": 0.0,
                        "j6": 0.0,
                    },
                ),
                (
                    0.60,
                    {
                        "j1": -2.43,
                        "j2": -99.98,
                        "j3": -14.80,
                        "j4": -91.31,
                        "j5": 0.0,
                        "j6": 0.0,
                    },
                ),
                (
                    0.65,
                    {
                        "j1": -25.46,
                        "j2": -95.83,
                        "j3": -18.29,
                        "j4": -92.49,
                        "j5": 0.0,
                        "j6": 0.0,
                    },
                ),
                (
                    0.72,
                    {
                        "j1": -46.74,
                        "j2": -81.02,
                        "j3": -33.11,
                        "j4": -97.24,
                        "j5": 0.0,
                        "j6": 0.0,
                    },
                ),
                (
                    0.77,
                    {
                        "j1": -46.74,
                        "j2": -75.64,
                        "j3": -22.99,
                        "j4": -95.97,
                        "j5": 0.0,
                        "j6": 0.0,
                    },
                ),
                (
                    0.84,
                    {
                        "j1": -46.74,
                        "j2": -57.95,
                        "j3": -15.28,
                        "j4": -96.34,
                        "j5": 0.0,
                        "j6": 0.0,
                    },
                ),
                (
                    0.90,
                    {
                        "j1": -46.74,
                        "j2": -57.95,
                        "j3": -15.28,
                        "j4": -96.34,
                        "j5": 0.0,
                        "j6": 0.0,
                    },
                ),
                (
                    1.00,
                    {
                        "j1": 0.0,
                        "j2": -90.0,
                        "j3": 0.0,
                        "j4": -90.0,
                        "j5": 0.0,
                        "j6": 0.0,
                    },
                ),
            ]

            p = self.demo_progress

            for index in range(
                len(waypoints) - 1
            ):
                (
                    start_p,
                    start_pose,
                ) = waypoints[index]

                (
                    end_p,
                    end_pose,
                ) = waypoints[
                    index + 1
                ]

                if (
                    p <= end_p
                    or index
                    == len(
                        waypoints
                    )
                    - 2
                ):
                    span = max(
                        0.0001,
                        end_p
                        - start_p,
                    )

                    local = smoothstep(
                        (
                            p
                            - start_p
                        )
                        / span
                    )

                    self.joint_angles = {
                        joint: round(
                            start_pose[
                                joint
                            ]
                            + (
                                end_pose[
                                    joint
                                ]
                                - start_pose[
                                    joint
                                ]
                            )
                            * local,
                            2,
                        )
                        for joint in start_pose
                    }

                    break

            self.welding_active = False

            task_type = (
                "Material Handling"
            )

        # ==========================================================
        # TELEMETRY
        # ==========================================================

        tel = self.telemetry_engine.update(
            robot_status=self.status,
            task_type=task_type,
            task_progress=self.task_progress,
            current_angles=self.joint_angles,
            welding_active=self.welding_active,
            injected_fault=(
                self.injected_fault_name
            ),
        )

        if (
            self.status == "RUNNING"
            and self.current_task
        ):
            self.task_telemetry_samples.append(
                tel
            )

        # ==========================================================
        # EDGE / AI
        # ==========================================================

        current_resources = (
            monitor.get_metrics()
        )

        all_tasks_for_ml = (
            await get_all_tasks()
        )

        active_count = len(
            [
                task
                for task in all_tasks_for_ml
                if task["status"]
                == "RUNNING"
            ]
        )

        queue_count = len(
            [
                task
                for task in all_tasks_for_ml
                if task["status"]
                in (
                    "QUEUED",
                    "WAITING",
                )
            ]
        )

        ml_priority = (
            self.current_task.get(
                "priority",
                "CRITICAL",
            )
            if self.current_task
            else "CRITICAL"
        )

        self.edge_decision = (
            workload_manager.decide(
                job_type=(
                    "Telemetry Analysis"
                ),
                priority=ml_priority,
                deadline_ms=120.0,
                resources=current_resources,
                active_tasks=active_count,
                queue_length=queue_count,
            )
        )

        import time as _time

        inference_start = (
            _time.perf_counter()
        )

        ai_res = (
            anomaly_detector.analyze_lite(
                tel
            )
            if self.edge_decision.get(
                "mode"
            ) == "LITE"
            else anomaly_detector.analyze(
                tel
            )
        )

        inference_ms = (
            _time.perf_counter()
            - inference_start
        ) * 1000.0

        ai_res[
            "inference_latency_ms"
        ] = round(
            inference_ms,
            3,
        )

        if (
            now_time
            - self.last_ml_measurement_time
            >= 1.0
        ):
            self.last_ml_measurement_time = (
                now_time
            )

            self.edge_samples.append(
                dict(
                    current_resources
                )
            )

            version = (
                self.edge_decision.get(
                    "mode"
                )
                if self.edge_decision.get(
                    "mode"
                )
                in (
                    "FULL",
                    "LITE",
                )
                else "LITE"
            )

            workload_manager.record_measurement(
                job_type=(
                    "Telemetry Analysis"
                ),
                version=version,
                resources=current_resources,
                active_tasks=active_count,
                queue_length=queue_count,
                elapsed_ms=max(
                    0.1,
                    inference_ms,
                ),
            )

        # ==========================================================
        # NORMAL ANOMALY MONITOR
        # ==========================================================
        #
        # Normal anomaly monitoring records the event but does not
        # freeze the robot. Explicit Demo Fault Injection is the
        # safety-stop demonstration.
        # ==========================================================

        if (
            ai_res["threshold_breached"]
            and self.status
            == "RUNNING"
            and not self.active_fault
        ):
            now_str = datetime.now().strftime(
                "%Y-%m-%d %H:%M:%S"
            )

            task_id = (
                self.current_task["id"]
                if self.current_task
                else None
            )

            task_name = (
                self.current_task["name"]
                if self.current_task
                else None
            )

            metric_key = (
                ai_res[
                    "threshold_breached"
                ]
                .lower()
                .replace(
                    " ",
                    "_",
                )
            )

            threshold = (
                anomaly_detector
                .thresholds.get(
                    metric_key,
                    999999.0,
                )
            )

            diag = (
                diagnostics
                .diagnose_threshold_breach(
                    ai_res[
                        "threshold_breached"
                    ],
                    tel.get(
                        metric_key,
                        0.0,
                    ),
                    threshold,
                    task_name,
                )
            )

            diag[
                "timestamp"
            ] = now_str

            diag[
                "origin_label"
            ] = (
                "Digital Twin anomaly monitor"
            )

            self.active_fault = diag

            await record_fault(
                diag
            )

            await add_event(
                now_str,
                task_id,
                "WARNING",
                (
                    "Anomaly monitored: "
                    f"{diag['problem']}"
                ),
                "WARNING",
            )

            await add_event(
                now_str,
                task_id,
                "AI",
                (
                    "AI Diagnostics: "
                    f"{diag['recommended_action']}"
                ),
                "AI",
            )

        # ==========================================================
        # PERIODIC TELEMETRY SAVE
        # ==========================================================

        if (
            now_time
            - self.last_db_save_time
            >= 1.0
        ):
            self.last_db_save_time = (
                now_time
            )

            now_str = datetime.now().strftime(
                "%Y-%m-%d %H:%M:%S"
            )

            task_id = (
                self.current_task["id"]
                if self.current_task
                else None
            )

            await save_telemetry_point(
                now_str,
                task_id,
                tel["temperature"],
                tel["vibration"],
                tel["motor_load"],
                tel["torque"],
                tel["power"],
                tel["cycle_time"],
                self.joint_angles,
            )

    # ==============================================================
    # COMPLETE EXACTLY ONE TASK
    # ==============================================================

    async def _complete_active_task(
        self
    ):
        """
        Complete the current task and STOP.

        The next task does not start automatically.
        """

        now = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        task = self.current_task

        if not task:
            return

        task_id = task["id"]

        # ----------------------------------------------------------
        # Mark task completed
        # ----------------------------------------------------------

        await update_task(
            task_id,
            {
                "status": "COMPLETED",
                "progress": 100.0,
                "end_time": now,
                "duration": round(
                    self.telemetry_engine
                    .cycle_time,
                    1,
                ),
                "result": (
                    "COMPLETED_SUCCESS"
                ),
                "waiting_reason": None,
            },
        )

        await add_event(
            now,
            task_id,
            "SUCCESS",
            (
                f"Task {task['name']} "
                "successfully completed."
            ),
            "SUCCESS",
        )

        # ----------------------------------------------------------
        # Generate report
        # ----------------------------------------------------------

        edge_metrics = (
            monitor.get_metrics()
        )

        report_data = (
            ReportGenerator
            .generate_report_record(
                task=task,
                telemetry_samples=(
                    self.task_telemetry_samples
                ),
                events=self.task_events_log,
                edge_metrics=edge_metrics,
                fault_occurred=(
                    self.task_had_fault
                ),
                fault_name=(
                    self.injected_fault_name
                ),
                edge_samples=(
                    self.edge_samples
                ),
                stage_summary=", ".join(
                    self.stage_history
                ),
                ai_mode=(
                    self.edge_decision.get(
                        "mode_label"
                    )
                ),
            )
        )

        await save_report(
            report_data
        )

        await add_event(
            now,
            task_id,
            "INFO",
            (
                "Automatic task report "
                f"generated ({report_data['id']})."
            ),
            "INFO",
        )

        # ----------------------------------------------------------
        # Remember completed task
        # ----------------------------------------------------------

        self.completed_demo_ids.add(
            task_id
        )

        # ----------------------------------------------------------
        # RETURN HOME / READY / STOP
        # ----------------------------------------------------------

        self.status = "READY"

        self.joint_angles = (
            UR5eKinematics
            .HOME_POSE_DEG
            .copy()
        )

        self.target_angles = (
            UR5eKinematics
            .HOME_POSE_DEG
            .copy()
        )

        self.current_task = None
        self.current_task_id = None

        # Keep the finished task at 100%.
        self.task_progress = 100.0

        self.current_stage = (
            "Cycle Complete"
        )

        self.welding_active = False

        self.demo_mode = False
        self.demo_progress = 0.0

        self.stage_history = []
        self.edge_samples = []
        self.edge_decision = {}

        self.telemetry_engine.cycle_time = (
            0.0
        )

        self.active_fault = None
        self.injected_fault_name = None
        self.fault_report_generated = False

        self.manual_override = False

        # ----------------------------------------------------------
        # All four finished?
        # ----------------------------------------------------------

        self.demo_sequence_finished = (
            len(
                self.completed_demo_ids
            )
            >= len(
                self.DEMO_IDS
            )
        )

        if self.demo_sequence_finished:

            self.current_stage = (
                "All Tasks Complete"
            )

            await add_event(
                now,
                None,
                "SUCCESS",
                (
                    "All four scheduled robot tasks "
                    "completed. Robot returned to "
                    "Home/READY. Press RESET to start "
                    "a new cycle."
                ),
                "SUCCESS",
            )

        else:

            await add_event(
                now,
                None,
                "INFO",
                (
                    f"{task['name']} finished. "
                    "Robot returned to Home/READY. "
                    "Press START for the next queued task."
                ),
                "INFO",
            )


# Single Digital Twin instance.
digital_twin = DigitalTwinEngine()