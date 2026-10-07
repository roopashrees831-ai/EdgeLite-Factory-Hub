import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  Shield,
  Sliders,
  CheckCircle2,
  HardDrive,
  Database,
  Moon,
  Sun,
} from 'lucide-react';
import { api } from '../services/api';

interface SettingsPageProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ isDarkMode, onToggleDarkMode }) => {
  const [tempLimit, setTempLimit] = useState(85);
  const [vibLimit, setVibLimit] = useState(3.5);
  const [loadLimit, setLoadLimit] = useState(90);
  const [torqueLimit, setTorqueLimit] = useState(50);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api.getSettings().then((data) => {
      if (data.thresholds) {
        setTempLimit(data.thresholds.temperature || 85);
        setVibLimit(data.thresholds.vibration || 3.5);
        setLoadLimit(data.thresholds.motor_load || 90);
        setTorqueLimit(data.thresholds.torque || 50);
      }
    });
  }, []);

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        temperature_limit: Number(tempLimit),
        vibration_limit: Number(vibLimit),
        motor_load_limit: Number(loadLimit),
        torque_limit: Number(torqueLimit),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-[1200px] mx-auto select-none text-xs">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-blue-600" />
            EDGELITE NODE CONFIGURATION & THRESHOLDS
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Local edge computing configuration, deterministic safety boundaries, and operating parameters
          </p>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-2 transition"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      {/* Edge Node Identity Card (Requirement 6 & 29) */}
      <div className="bg-white p-5 rounded-lg border border-slate-300 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          <span>Edge Node System Identity</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">Node Hostname</span>
            <b className="text-slate-900 text-sm">EdgeLite-Node-01</b>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">Processing Mode</span>
            <b className="text-emerald-700 text-sm">LOCAL_EDGE_PROCESSING</b>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">Cloud Dependency</span>
            <b className="text-slate-700 text-sm">DISABLED (None)</b>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">Digital Twin Simulation</span>
            <b className="text-blue-700 text-sm">ENABLED</b>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">Physical Hardware Connection</span>
            <b className="text-slate-600 text-sm">NOT CONNECTED (Software Twin)</b>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 font-sans block">Persistence Layer</span>
            <b className="text-slate-800 text-sm">SQLite (Embedded)</b>
          </div>
        </div>
      </div>

      {/* Safety Thresholds Configuration Form (Requirement 29) */}
      <form onSubmit={handleSaveThresholds} className="bg-white p-5 rounded-lg border border-slate-300 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Deterministic Safety Threshold Configuration</span>
          </h3>
          {savedSuccess && (
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Thresholds Updated!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Temperature Trip Limit (°C)
            </label>
            <input
              type="number"
              value={tempLimit}
              onChange={(e) => setTempLimit(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold"
              min="50"
              max="120"
              step="1"
              required
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Standard: 85°C</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Vibration Trip Limit (mm/s)
            </label>
            <input
              type="number"
              value={vibLimit}
              onChange={(e) => setVibLimit(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold"
              min="1.0"
              max="10.0"
              step="0.1"
              required
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Standard: 3.5 mm/s</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Motor Load Ceiling (%)
            </label>
            <input
              type="number"
              value={loadLimit}
              onChange={(e) => setLoadLimit(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold"
              min="50"
              max="100"
              step="1"
              required
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Standard: 90%</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Joint Torque Trip Limit (Nm)
            </label>
            <input
              type="number"
              value={torqueLimit}
              onChange={(e) => setTorqueLimit(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold"
              min="20"
              max="150"
              step="1"
              required
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Standard: 50 Nm</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition shadow"
          >
            Save Safety Configuration
          </button>
        </div>
      </form>
    </div>
  );
};
