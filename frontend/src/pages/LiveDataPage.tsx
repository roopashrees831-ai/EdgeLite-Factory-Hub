import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Activity, Thermometer, Waves, Gauge, Zap, Cpu, HardDrive } from 'lucide-react';
import { RobotState } from '../types';

interface LiveDataPageProps {
  state: RobotState;
}

export const LiveDataPage: React.FC<LiveDataPageProps> = ({ state }) => {
  const [dataPoints, setDataPoints] = useState<any[]>([]);

  useEffect(() => {
    const now = new Date().toLocaleTimeString('en-US', { hour12: false });
    const newPoint = {
      time: now,
      temperature: state.telemetry.temperature,
      vibration: state.telemetry.vibration,
      motor_load: state.telemetry.motor_load,
      torque: state.telemetry.torque,
      power: state.telemetry.power,
      cpu: state.system?.cpu_percent ?? 0,
      ram: state.system?.memory_percent ?? 0,
      latency: state.system?.latency_ms ?? 1.5,
    };

    setDataPoints((prev) => {
      const updated = [...prev, newPoint];
      return updated.slice(-30); // maintain last 30 samples (~30 seconds)
    });
  }, [state.telemetry, state.system]);

  const tel = state.telemetry;

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto select-none">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            HIGH-FREQUENCY DIGITAL TWIN TELEMETRY & HARDWARE METRICS
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-variable telemetry stream with safety boundary monitoring
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-slate-100 px-3 py-1.5 rounded border border-slate-200">
            <span className="text-slate-500 font-sans block text-[10px]">Sampling Rate</span>
            <b className="text-slate-800">25 Hz (Stream)</b>
          </div>
          <div className="bg-slate-100 px-3 py-1.5 rounded border border-slate-200">
            <span className="text-slate-500 font-sans block text-[10px]">Processing Node</span>
            <b className="text-blue-600">{state.system?.node_name || 'EdgeLite-Node-01'}</b>
          </div>
        </div>
      </div>

      {/* 4 Telemetry Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Temperature Chart */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-rose-500" />
              <h3 className="font-bold text-xs uppercase text-slate-900">
                Robot Cell Temperature (°C)
              </h3>
            </div>
            <div className="font-mono text-xs">
              <span className="text-slate-500 text-[10px] font-sans">Current: </span>
              <b className="text-rose-600 font-bold">{tel.temperature.toFixed(1)}°C</b>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis domain={[35, 95]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip />
                <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Safety Limit: 85°C', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="temperature" stroke="#f43f5e" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vibration Chart */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-blue-500" />
              <h3 className="font-bold text-xs uppercase text-slate-900">
                Mechanical Vibration (mm/s)
              </h3>
            </div>
            <div className="font-mono text-xs">
              <span className="text-slate-500 text-[10px] font-sans">Current: </span>
              <b className="text-blue-600 font-bold">{tel.vibration.toFixed(2)} mm/s</b>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip />
                <ReferenceLine y={3.5} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Vibration Limit: 3.5 mm/s', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="vibration" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Motor Load Chart */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" />
              <h3 className="font-bold text-xs uppercase text-slate-900">
                Aggregate Motor Load (%)
              </h3>
            </div>
            <div className="font-mono text-xs">
              <span className="text-slate-500 text-[10px] font-sans">Current: </span>
              <b className="text-purple-600 font-bold">{tel.motor_load.toFixed(1)}%</b>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip />
                <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Load Limit: 90%', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="motor_load" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Power Chart */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-xs uppercase text-slate-900">
                Cell Power Draw (W)
              </h3>
            </div>
            <div className="font-mono text-xs">
              <span className="text-slate-500 text-[10px] font-sans">Current: </span>
              <b className="text-amber-600 font-bold">{tel.power.toFixed(0)} W</b>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis domain={[100, 700]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="power" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Edge Node Real Hardware Footprint */}
      <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm space-y-3 text-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 tracking-wide uppercase">
              AUTHENTIC LAPTOP / HOST RESOURCE TIMELINE (psutil)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Live Operating System Probes</span>
        </div>

        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="cpu" name="CPU Usage %" stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="ram" name="RAM Usage %" stroke="#7c3aed" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
