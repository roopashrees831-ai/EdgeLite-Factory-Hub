import { RobotState, Task, TaskReport, EventItem, SystemMetrics, AIAnalyticsData } from '../types';

const API_BASE = 'http://localhost:8000/api';
const WS_BASE = 'ws://localhost:8000/ws/telemetry';

export const api = {
  // System Status
  async getSystemStatus(): Promise<SystemMetrics> {
    const res = await fetch(`${API_BASE}/system/status`);
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
  },

  // Robot State
  async getRobotState(): Promise<RobotState> {
    const res = await fetch(`${API_BASE}/robot/state`);
    if (!res.ok) throw new Error('Failed to fetch robot state');
    return res.json();
  },

  // Robot Controls
  async startRobot(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/robot/start`, { method: 'POST' });
    return res.json();
  },

  async stopRobot(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/robot/stop`, { method: 'POST' });
    return res.json();
  },

  async resetRobot(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/robot/reset`, { method: 'POST' });
    return res.json();
  },

  async homeRobot(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/robot/home`, { method: 'POST' });
    return res.json();
  },

  async setJointAngles(angles: Record<string, number>): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/robot/joints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(angles),
    });
    return res.json();
  },

  // Tasks
  async getTasks(): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async addTask(data: { name: string; type: string; priority: string; estimated_duration: number }): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add task');
    return res.json();
  },

  async restartTask(taskId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/restart`, { method: 'POST' });
    return res.json();
  },

  // Faults
  async injectFault(faultType: string): Promise<any> {
    const res = await fetch(`${API_BASE}/faults/inject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fault_type: faultType }),
    });
    return res.json();
  },

  async clearFault(): Promise<any> {
    const res = await fetch(`${API_BASE}/faults/clear`, { method: 'POST' });
    return res.json();
  },

  async getActiveFault(): Promise<any> {
    const res = await fetch(`${API_BASE}/faults/active`);
    return res.json();
  },

  // Reports
  async getReports(): Promise<TaskReport[]> {
    const res = await fetch(`${API_BASE}/reports`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  async getReport(reportId: string): Promise<TaskReport> {
    const res = await fetch(`${API_BASE}/reports/${reportId}`);
    if (!res.ok) throw new Error('Failed to fetch report');
    return res.json();
  },

  getReportPdfUrl(reportId: string): string {
    return `${API_BASE}/reports/${reportId}/pdf`;
  },

  getCsvExportUrl(): string {
    return `${API_BASE}/reports/export/csv`;
  },

  // History
  async getHistory(severity?: string): Promise<EventItem[]> {
    const url = severity && severity !== 'ALL' 
      ? `${API_BASE}/history?severity=${severity}` 
      : `${API_BASE}/history`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  // AI Analytics
  async getAIAnalytics(): Promise<AIAnalyticsData> {
    const res = await fetch(`${API_BASE}/ai/analytics`);
    if (!res.ok) throw new Error('Failed to fetch AI analytics');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  async updateSettings(thresholds: {
    temperature_limit: number;
    vibration_limit: number;
    motor_load_limit: number;
    torque_limit: number;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thresholds),
    });
    return res.json();
  },
};

// WebSocket Telemetry Hook/Subscription
export function connectTelemetryWebSocket(
  onData: (data: RobotState) => void,
  onError?: (err: any) => void
): () => void {
  let ws: WebSocket | null = null;
  let isClosed = false;
  let reconnectTimeout: any = null;

  function connect() {
    if (isClosed) return;
    try {
      ws = new WebSocket(WS_BASE);

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onData(parsed);
        } catch (e) {
          // ignore parse error
        }
      };

      ws.onerror = (e) => {
        if (onError) onError(e);
      };

      ws.onclose = () => {
        if (!isClosed) {
          reconnectTimeout = setTimeout(connect, 1500);
        }
      };
    } catch (e) {
      if (!isClosed) {
        reconnectTimeout = setTimeout(connect, 2000);
      }
    }
  }

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) ws.close();
  };
}
