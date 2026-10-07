import React from 'react';
import {
  BrainCircuit,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Cpu,
  HelpCircle,
  BarChart3,
  Layers,
} from 'lucide-react';
import { RobotState } from '../types';

interface AIAnalyticsPageProps {
  state: RobotState;
}

export const AIAnalyticsPage: React.FC<AIAnalyticsPageProps> = ({ state }) => {
  const isNormal = state.ai_health === 'NORMAL';
  const anomalyPct = Math.round(state.anomaly_score * 100);

  const featureDevs = [
    { name: 'Temperature', key: 'temperature', val: state.feature_contributions?.temperature ?? 0, unit: '°C' },
    { name: 'Vibration', key: 'vibration', val: state.feature_contributions?.vibration ?? 0, unit: 'mm/s' },
    { name: 'Motor Load', key: 'motor_load', val: state.feature_contributions?.motor_load ?? 0, unit: '%' },
    { name: 'Joint Torque', key: 'torque', val: state.feature_contributions?.torque ?? 0, unit: 'Nm' },
    { name: 'Power Consumption', key: 'power', val: state.feature_contributions?.power ?? 0, unit: 'W' },
  ];

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto select-none">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-purple-600" />
            EDGE AI ANOMALY DETECTION & EXPLAINABLE DIAGNOSTICS
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Local Isolation Forest ML Model • Explainable Feature Deviations • Zero Cloud Dependency
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono bg-purple-50 text-purple-700 px-3 py-1 rounded border border-purple-200 font-semibold">
            Inference Latency: 1.2 ms
          </span>
        </div>
      </div>

      {/* AI Health & Anomaly Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: AI Health Status */}
        <div className="bg-white p-5 rounded-lg border border-slate-300 shadow-sm flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow ${
              isNormal ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600 animate-pulse'
            }`}
          >
            {isNormal ? <ShieldCheck className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
              Inferred Cell Health
            </span>
            <div
              className={`text-lg font-extrabold tracking-tight ${
                isNormal ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {state.ai_health}
            </div>
            <span className="text-[11px] text-slate-500">
              {isNormal ? 'All multi-axis signals nominal' : 'Telemetry divergence detected'}
            </span>
          </div>
        </div>

        {/* Card 2: Anomaly Score */}
        <div className="bg-white p-5 rounded-lg border border-slate-300 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              Composite Anomaly Score
            </span>
            <b
              className={`text-sm font-mono ${
                anomalyPct > 65 ? 'text-rose-600' : anomalyPct > 40 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {anomalyPct}%
            </b>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                anomalyPct > 65 ? 'bg-rose-600' : anomalyPct > 40 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${anomalyPct}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-400 block">
            Isolation Forest decision hyperplane distance
          </span>
        </div>

        {/* Card 3: Model Architecture */}
        <div className="bg-white p-5 rounded-lg border border-slate-300 shadow-sm space-y-1 text-xs">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
            Inference Architecture
          </span>
          <div className="font-bold text-slate-800">Scikit-learn IsolationForest</div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Trained on digital-twin baseline normal operation profile. Runs 100% locally on laptop CPU.
          </p>
        </div>
      </div>

      {/* Explainable AI: Why Was This Detected? (Requirement 28) */}
      <div className="bg-white p-5 rounded-lg border border-slate-300 shadow-sm space-y-3 text-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 uppercase tracking-wide">
              EXPLAINABLE AI DIAGNOSIS: "WHY WAS THIS DETECTED?"
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">SHAP-style Feature Attribution</span>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed font-medium">
          {state.ai_explanation}
        </div>

        {/* Feature Deviations Bar Chart */}
        <div className="space-y-2 pt-2">
          <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
            Normalized Standard Deviations From Nominal Baseline (Z-Score σ):
          </span>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1">
            {featureDevs.map((f) => {
              const absVal = Math.abs(f.val);
              const isHigh = absVal >= 3.0;
              const isMed = absVal >= 2.0;
              return (
                <div key={f.key} className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px]">{f.name}</span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        isHigh ? 'text-rose-600' : isMed ? 'text-amber-600' : 'text-slate-700'
                      }`}
                    >
                      {f.val > 0 ? `+${f.val.toFixed(1)}σ` : `${f.val.toFixed(1)}σ`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, (absVal / 4.0) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Deterministic Safety Envelope Card */}
      <div className="bg-white p-5 rounded-lg border border-slate-300 shadow-sm space-y-3 text-xs">
        <h3 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">
          Deterministic Safety Threshold Boundary Matrix
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center font-mono">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] font-sans text-slate-500 block">Temperature Threshold</span>
            <b className="text-sm text-slate-900">85.0 °C</b>
            <span className="text-[9px] text-slate-400 font-sans block mt-1">Thermal safety trip</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] font-sans text-slate-500 block">Vibration Threshold</span>
            <b className="text-sm text-slate-900">3.5 mm/s</b>
            <span className="text-[9px] text-slate-400 font-sans block mt-1">Harmonic resonance ceiling</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] font-sans text-slate-500 block">Motor Load Threshold</span>
            <b className="text-sm text-slate-900">90.0 %</b>
            <span className="text-[9px] text-slate-400 font-sans block mt-1">Inverter over-current trip</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] font-sans text-slate-500 block">Joint Torque Limit</span>
            <b className="text-sm text-slate-900">50.0 Nm</b>
            <span className="text-[9px] text-slate-400 font-sans block mt-1">Mechanical payload boundary</span>
          </div>
        </div>
      </div>
    </div>
  );
};
