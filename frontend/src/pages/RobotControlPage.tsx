import React, { useState } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Home,
  Sliders,
  Compass,
  Flame,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { RobotState, JointAngles } from '../types';
import { UR5eViewer } from '../robot/UR5eViewer';
import { api } from '../services/api';

interface RobotControlPageProps {
  state: RobotState;
  onRefreshData: () => void;
}

export const RobotControlPage: React.FC<RobotControlPageProps> = ({ state, onRefreshData }) => {
  const [manualAngles, setManualAngles] = useState<JointAngles>(state.joint_angles);
  const [jogStep, setJogStep] = useState<number>(5);

  const handleSliderChange = (joint: keyof JointAngles, val: number) => {
    const updated = { ...manualAngles, [joint]: val };
    setManualAngles(updated);
    api.setJointAngles(updated);
  };

  const handleJog = (joint: keyof JointAngles, delta: number) => {
    const currentVal = manualAngles[joint] ?? 0;
    const updated = { ...manualAngles, [joint]: Math.round(currentVal + delta) };
    setManualAngles(updated);
    api.setJointAngles(updated);
  };

  const handleHome = async () => {
    const homeAngles: JointAngles = { j1: 0, j2: -90, j3: 0, j4: -90, j5: 0, j6: 0 };
    setManualAngles(homeAngles);
    await api.homeRobot();
    onRefreshData();
  };

  const handleApplyPreset = (preset: JointAngles) => {
    setManualAngles(preset);
    api.setJointAngles(preset);
  };

  const jointsConfig: { id: keyof JointAngles; name: string; min: number; max: number; desc: string }[] = [
    { id: 'j1', name: 'J1 — Shoulder Pan', min: -360, max: 360, desc: 'Base azimuthal rotation around Z axis' },
    { id: 'j2', name: 'J2 — Shoulder Lift', min: -360, max: 360, desc: 'Primary vertical elevation arm articulation' },
    { id: 'j3', name: 'J3 — Elbow', min: -360, max: 360, desc: 'Forearm reach articulation' },
    { id: 'j4', name: 'J4 — Wrist 1', min: -360, max: 360, desc: 'Wrist pitch orientation' },
    { id: 'j5', name: 'J5 — Wrist 2', min: -360, max: 360, desc: 'Wrist yaw tilt orientation' },
    { id: 'j6', name: 'J6 — Wrist 3', min: -360, max: 360, desc: 'Continuous tool roll flange' },
  ];

  const presets = [
    { name: 'Safe Home Pose', angles: { j1: 0, j2: -90, j3: 0, j4: -90, j5: 0, j6: 0 } },
    { name: 'Welding Seam Start', angles: { j1: 35, j2: -65, j3: 40, j4: -105, j5: 35, j6: 0 } },
    { name: 'Overhead Inspection', angles: { j1: 0, j2: -110, j3: 60, j4: -90, j5: 45, j6: 90 } },
    { name: 'Horizontal Reach Calibration', angles: { j1: -45, j2: -45, j3: 30, j4: -75, j5: 0, j6: 0 } },
  ];

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto select-none">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            UR5e 6-AXIS DIRECT KINEMATIC CONTROL CONSOLE
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time joint manipulation, jog micro-stepping, and tool trajectory presets
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => api.startRobot().then(onRefreshData)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            START
          </button>
          <button
            onClick={() => api.stopRobot().then(onRefreshData)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            STOP
          </button>
          <button
            onClick={handleHome}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <Home className="w-3.5 h-3.5" />
            HOME POSE
          </button>
          <button
            onClick={() => api.resetRobot().then(onRefreshData)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RESET
          </button>
        </div>
      </div>

      {/* Main Grid: Left 3D View + Right Sliders & Jog Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: 3D Visualization (7 Cols) */}
        <div className="xl:col-span-7 flex flex-col bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold border-b border-slate-800">
            <span>REAL-TIME 3D DIGITAL TWIN POSE</span>
            <span className="font-mono text-blue-400">STATUS: {state.robot_status}</span>
          </div>

          <div className="h-[520px] w-full relative">
            <UR5eViewer
              jointAngles={state.joint_angles}
              robotStatus={state.robot_status}
              weldingActive={state.welding_active}
              taskProgress={state.task_progress}
              currentTaskName={state.current_task?.name}
            />
          </div>

          {/* Cartesian FK Readout */}
          <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600" />
              <span className="font-sans font-bold text-slate-700">TCP Cartesian (FK):</span>
            </div>
            <div className="flex items-center gap-4 text-slate-900 font-bold">
              <span>X: <span className="text-blue-600">{state.cartesian_position.x.toFixed(3)} m</span></span>
              <span>Y: <span className="text-blue-600">{state.cartesian_position.y.toFixed(3)} m</span></span>
              <span>Z: <span className="text-blue-600">{state.cartesian_position.z.toFixed(3)} m</span></span>
            </div>
          </div>
        </div>

        {/* Right: Joint Sliders & Jog Stepper (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* Step Size Selector */}
          <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-sm flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Jog Step Increment:</span>
            <div className="flex items-center gap-1.5">
              {[1, 5, 15, 45].map((step) => (
                <button
                  key={step}
                  onClick={() => setJogStep(step)}
                  className={`px-2.5 py-1 rounded font-mono font-bold text-xs transition ${
                    jogStep === step
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ±{step}°
                </button>
              ))}
            </div>
          </div>

          {/* 6 Joint Sliders */}
          <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm space-y-3.5 text-xs">
            <h3 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 flex items-center justify-between">
              <span>Independent Axis Articulation</span>
              <span className="text-[10px] text-slate-400 font-mono">Limits: ±360°</span>
            </h3>

            <div className="space-y-3">
              {jointsConfig.map((j) => {
                const angle = state.joint_angles[j.id] ?? 0;
                return (
                  <div key={j.id} className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{j.name}</span>
                        <span className="block text-[10px] text-slate-500 font-sans">{j.desc}</span>
                      </div>
                      <span className="font-mono font-bold text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {angle.toFixed(1)}°
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleJog(j.id, -jogStep)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700"
                        title={`Step -${jogStep}°`}
                      >
                        -{jogStep}°
                      </button>

                      <input
                        type="range"
                        min={j.min}
                        max={j.max}
                        step="1"
                        value={angle}
                        onChange={(e) => handleSliderChange(j.id, parseFloat(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />

                      <button
                        onClick={() => handleJog(j.id, jogStep)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700"
                        title={`Step +${jogStep}°`}
                      >
                        +{jogStep}°
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Motion Presets */}
          <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm space-y-2 text-xs">
            <h3 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">
              Operational Trajectory Presets
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(p.angles)}
                  className="p-2 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded text-left transition"
                >
                  <div className="font-bold text-slate-800 text-[11px]">{p.name}</div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    J1:{p.angles.j1}°, J2:{p.angles.j2}°
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
