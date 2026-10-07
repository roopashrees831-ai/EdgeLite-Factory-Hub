export interface JointAngles {
  j1: number;
  j2: number;
  j3: number;
  j4: number;
  j5: number;
  j6: number;
  [key: string]: number;
}

export interface Telemetry {
  temperature: number;
  vibration: number;
  motor_load: number;
  torque: number;
  power: number;
  cycle_time: number;
}

export interface SystemMetrics {
  node_name: string;
  processing_mode: string;
  cloud_dependency: string;
  hardware_connected: boolean;
  robot_source: string;
  hardware_label: string;
  cpu_percent: number;
  memory_percent: number;
  memory_used_mb: number;
  memory_total_mb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  latency_ms: number;
  active_tasks_count?: number;
  queued_tasks_count?: number;
}

export interface Task {
  id: string;
  name: string;
  type: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'QUEUED' | 'WAITING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  progress: number;
  created_at: string;
  start_time?: string | null;
  end_time?: string | null;
  duration: number;
  estimated_duration: number;
  machine: string;
  waiting_reason?: string | null;
  result?: string | null;
  is_motion_task: number;
}

export interface FaultDetail {
  id?: number;
  timestamp: string;
  fault_type: string;
  problem: string;
  cause: string;
  affected_task_id?: string | null;
  affected_task_name?: string | null;
  recommended_action: string;
  severity: string;
  status: string;
  origin_label?: string;
  is_demo_fault?: boolean;
}

export interface RobotState {
  robot_status: 'READY' | 'RUNNING' | 'STOPPED' | 'PAUSED' | 'FAULT';
  joint_angles: JointAngles;
  cartesian_position: { x: number; y: number; z: number };
  telemetry: Telemetry;
  welding_active: boolean;
  current_operation: string;
  task_stage?: string;
  current_task: Task | null;
  task_progress: number;
  active_fault: FaultDetail | null;
  ai_health: string;
  anomaly_score: number;
  ai_explanation: string;
  feature_contributions: Record<string, number>;
  hardware_connected: boolean;
  robot_source: string;
  hardware_label: string;
  edge_decision?: WorkloadDecision;
  workload_manager?: WorkloadManagerStatus;
  system?: SystemMetrics;
  timestamp?: string;
  demo_queue?: Task[];
  demo_sequence_finished?: boolean;
}

export interface EventItem {
  id: number;
  timestamp: string;
  task_id?: string | null;
  event_type: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'AI' | 'SUCCESS' | 'FAULT' | 'RECOVERY';
}

export interface TaskReport {
  id: string;
  task_id: string;
  task_name: string;
  task_type: string;
  priority: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  robot: string;
  cycle_count: number;
  avg_motor_load: number;
  peak_motor_load: number;
  avg_temperature: number;
  peak_temperature: number;
  avg_vibration: number;
  peak_vibration: number;
  avg_torque: number;
  peak_torque: number;
  avg_power: number;
  peak_power: number;
  edge_cpu_avg: number;
  edge_ram_avg: number;
  anomalies: string;
  faults: string;
  corrective_actions: string;
  final_result: string;
  created_at: string;
}

export interface WorkloadDecision {
  job_type?: string;
  priority?: string;
  mode?: string;
  mode_label?: string;
  predicted_ms?: number;
  predicted_full_ms?: number;
  predicted_lite_ms?: number;
  deadline_ms?: number;
  resource_pressure?: string;
  cpu_percent?: number;
  memory_percent?: number;
  reason?: string;
  model_name?: string;
  training_source?: string;
  training_samples?: number;
}

export interface WorkloadManagerStatus {
  model_name: string;
  feature_names: string[];
  training_source: string;
  training_samples: number;
  measurements_file: string;
  last_retrain: number;
  last_decision: WorkloadDecision;
}

export interface AIAnalyticsData {
  ai_health: string;
  anomaly_score: number;
  explanation: string;
  feature_contributions: Record<string, number>;
  thresholds: Record<string, number>;
  baseline_stats: Record<string, any>;
  telemetry_history: any[];
  data_source: string;
  workload_decision?: WorkloadDecision;
  workload_manager?: WorkloadManagerStatus;
}
