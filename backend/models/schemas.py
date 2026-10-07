"""
EdgeLite Data Models & Pydantic Schemas
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

class TaskStatus(str, Enum):
    QUEUED = "QUEUED"
    WAITING = "WAITING"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class TaskPriority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class TaskType(str, Enum):
    WELDING = "Welding"
    INSPECTION = "Inspection"
    MAINTENANCE = "Maintenance"
    ANOMALY_DETECTION = "Anomaly Detection"
    QUALITY_ANALYSIS = "Quality Analysis"
    REPORT_GENERATION = "Report Generation"

class RobotStatus(str, Enum):
    READY = "READY"
    RUNNING = "RUNNING"
    STOPPED = "STOPPED"
    PAUSED = "PAUSED"
    FAULT = "FAULT"

class FaultType(str, Enum):
    J3_OVERLOAD = "J3 Motor Overload"
    OVERHEATING = "Overheating"
    HIGH_VIBRATION = "High Vibration"
    HIGH_TORQUE = "High Torque"

class Severity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    AI = "AI"
    SUCCESS = "SUCCESS"
    FAULT = "FAULT"
    RECOVERY = "RECOVERY"

class JointAngles(BaseModel):
    j1: float = 0.0  # Shoulder Pan (rad or deg)
    j2: float = -90.0 # Shoulder Lift
    j3: float = 0.0  # Elbow
    j4: float = -90.0 # Wrist 1
    j5: float = 0.0  # Wrist 2
    j6: float = 0.0  # Wrist 3

class RobotTelemetry(BaseModel):
    temperature: float = 42.0       # °C
    vibration: float = 0.40          # mm/s
    motor_load: float = 0.0          # %
    torque: float = 8.0              # Nm
    power: float = 120.0             # W
    cycle_time: float = 0.0          # s
    joint_angles: Dict[str, float] = Field(default_factory=dict)
    task_progress: float = 0.0       # %
    robot_status: RobotStatus = RobotStatus.READY
    current_operation: str = "Idle"
    welding_active: bool = False
    ai_health: str = "NORMAL"
    anomaly_score: float = 0.02
    active_fault: Optional[str] = None

class SystemResources(BaseModel):
    node_name: str = "EdgeLite-Node-01"
    processing_mode: str = "LOCAL_EDGE_PROCESSING"
    cloud_dependency: str = "NONE"
    hardware_connected: bool = False
    robot_source: str = "EdgeLite Robot Simulator"
    hardware_label: str = "Software Digital Twin"
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    memory_used_mb: float = 0.0
    memory_total_mb: float = 0.0
    disk_percent: float = 0.0
    disk_used_gb: float = 0.0
    disk_total_gb: float = 0.0
    latency_ms: float = 1.4
    active_tasks_count: int = 0
    queued_tasks_count: int = 0

class TaskCreate(BaseModel):
    name: str
    type: TaskType
    priority: TaskPriority = TaskPriority.MEDIUM
    estimated_duration: float = 30.0 # seconds

class TaskOut(BaseModel):
    id: str
    name: str
    type: TaskType
    priority: TaskPriority
    status: TaskStatus
    progress: float
    created_at: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration: float = 0.0
    estimated_duration: float = 30.0
    machine: str = "UR5e (Cell-01)"
    waiting_reason: Optional[str] = None
    result: Optional[str] = None
    is_motion_task: bool = True

class EventLog(BaseModel):
    id: Optional[int] = None
    timestamp: str
    task_id: Optional[str] = None
    event_type: Severity
    description: str
    severity: Severity

class FaultDetail(BaseModel):
    id: Optional[int] = None
    timestamp: str
    fault_type: str
    problem: str
    cause: str
    affected_task_id: Optional[str] = None
    affected_task_name: Optional[str] = None
    recommended_action: str
    status: str = "ACTIVE"
    cleared_at: Optional[str] = None

class TaskReportOut(BaseModel):
    id: str
    task_id: str
    task_name: str
    task_type: str
    priority: str
    start_time: str
    end_time: str
    duration: float
    status: str
    robot: str = "Universal Robots UR5e"
    cycle_count: int = 1
    avg_motor_load: float = 0.0
    peak_motor_load: float = 0.0
    avg_temperature: float = 0.0
    peak_temperature: float = 0.0
    avg_vibration: float = 0.0
    peak_vibration: float = 0.0
    avg_torque: float = 0.0
    peak_torque: float = 0.0
    avg_power: float = 0.0
    peak_power: float = 0.0
    edge_cpu_avg: float = 0.0
    edge_ram_avg: float = 0.0
    anomalies: str = "None"
    faults: str = "None"
    corrective_actions: str = "None"
    final_result: str = "Successful"
    created_at: str

class ThresholdConfig(BaseModel):
    temperature_limit: float = 85.0   # °C
    vibration_limit: float = 3.5      # mm/s
    motor_load_limit: float = 90.0    # %
    torque_limit: float = 50.0        # Nm
