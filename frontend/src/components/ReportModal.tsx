import React from 'react';
import { X, FileText, Download, CheckCircle2, AlertOctagon, Cpu, ShieldCheck } from 'lucide-react';
import { TaskReport } from '../types';
import { api } from '../services/api';

interface ReportModalProps {
  report: TaskReport | null;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ report, onClose }) => {
  if (!report) return null;

  const handleDownloadPdf = () => {
    window.open(api.getReportPdfUrl(report.id), '_blank');
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `${report.id}.json`);
    dlAnchorElem.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 text-xs">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="font-bold text-sm tracking-wide">TASK EXECUTION REPORT</h2>
              <span className="text-[10px] text-slate-400 font-mono">{report.id}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Task Designation</span>
              <h3 className="text-sm font-bold text-slate-900">{report.task_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                  {report.task_type}
                </span>
                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono">
                  Priority: {report.priority}
                </span>
                <span className="text-slate-500 text-[10px]">
                  Robot: {report.robot}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Final Outcome</span>
              <span
                className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded ${
                  report.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {report.status === 'COMPLETED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                )}
                {report.final_result}
              </span>
            </div>
          </div>

          {/* Execution Timestamps */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center font-mono">
            <div>
              <span className="text-[10px] font-sans text-slate-500 block">Start Time</span>
              <b className="text-slate-800">{report.start_time}</b>
            </div>
            <div>
              <span className="text-[10px] font-sans text-slate-500 block">End Time</span>
              <b className="text-slate-800">{report.end_time}</b>
            </div>
            <div>
              <span className="text-[10px] font-sans text-slate-500 block">Total Duration</span>
              <b className="text-blue-600">{report.duration} seconds</b>
            </div>
          </div>

          {/* Telemetry Metrics Table */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2 uppercase text-[11px] tracking-wide flex items-center gap-1.5">
              <span>Recorded Performance Telemetry</span>
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Metric</th>
                    <th className="py-2 px-3">Average Value</th>
                    <th className="py-2 px-3">Peak Value</th>
                    <th className="py-2 px-3">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">Motor Load</td>
                    <td className="py-2 px-3 text-slate-700">{report.avg_motor_load}%</td>
                    <td className="py-2 px-3 font-bold text-amber-600">{report.peak_motor_load}%</td>
                    <td className="py-2 px-3 text-slate-500">%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">Temperature</td>
                    <td className="py-2 px-3 text-slate-700">{report.avg_temperature}°C</td>
                    <td className="py-2 px-3 font-bold text-rose-600">{report.peak_temperature}°C</td>
                    <td className="py-2 px-3 text-slate-500">°C</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">Mechanical Vibration</td>
                    <td className="py-2 px-3 text-slate-700">{report.avg_vibration} mm/s</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{report.peak_vibration} mm/s</td>
                    <td className="py-2 px-3 text-slate-500">mm/s</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">Joint Torque</td>
                    <td className="py-2 px-3 text-slate-700">{report.avg_torque} Nm</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{report.peak_torque} Nm</td>
                    <td className="py-2 px-3 text-slate-500">Nm</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">Electrical Power</td>
                    <td className="py-2 px-3 text-slate-700">{report.avg_power} W</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{report.peak_power} W</td>
                    <td className="py-2 px-3 text-slate-500">W</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Edge Node Hardware Context */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-2 uppercase text-[11px] tracking-wide flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>Edge Node Hardware Footprint (Authentic Host Measurements)</span>
            </h4>
            <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 font-sans block text-[10px]">Average CPU Utilization</span>
                <b className="text-slate-900">{report.edge_cpu_avg}%</b>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 font-sans block text-[10px]">Average RAM Utilization</span>
                <b className="text-slate-900">{report.edge_ram_avg}%</b>
              </div>
            </div>
          </div>

          {/* AI Anomaly & Fault Recovery Log */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Anomaly & Diagnostics Log</span>
            </h4>
            <div className="text-[11px] space-y-1">
              <div>
                <span className="text-slate-500">AI Anomalies: </span>
                <b className="text-slate-800">{report.anomalies}</b>
              </div>
              <div>
                <span className="text-slate-500">Faults Logged: </span>
                <b className="text-slate-800">{report.faults}</b>
              </div>
              <div>
                <span className="text-slate-500">Corrective Actions: </span>
                <span className="text-slate-700">{report.corrective_actions}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Download Buttons */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between sticky bottom-0">
          <button
            onClick={handleDownloadJson}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded font-semibold text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Download JSON
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-slate-700 hover:bg-slate-200 rounded font-semibold text-xs transition"
            >
              Close
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center gap-1.5 transition shadow"
            >
              <Download className="w-3.5 h-3.5" />
              Download Official PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
