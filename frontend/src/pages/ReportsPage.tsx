import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  AlertOctagon,
  Search,
  Filter,
} from 'lucide-react';
import { TaskReport } from '../types';
import { api } from '../services/api';
import { ReportModal } from '../components/ReportModal';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<TaskReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<TaskReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await api.getReports();
      setReports(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filtered = reports.filter((r) =>
    r.task_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.task_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto select-none">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            AUTOMATIC TASK EXECUTION & QUALITY REPORTS
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-generated from recorded digital-twin telemetry, edge computing metrics, and AI logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={api.getCsvExportUrl()}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT ALL CSV
          </a>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-sm flex items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports by task name, ID, or type..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <span className="text-slate-500 font-mono text-[11px]">
          Total Reports: <b>{filtered.length}</b>
        </span>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Report ID</th>
                <th className="py-2.5 px-3">Task Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Peak Load</th>
                <th className="py-2.5 px-3">Peak Temp</th>
                <th className="py-2.5 px-3">Edge CPU</th>
                <th className="py-2.5 px-3">AI Result</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                    Loading reports...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                    No task reports recorded yet. Complete a scheduled task to trigger automatic report generation.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-bold text-blue-700">{r.id}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{r.task_name}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-700">{r.task_type}</td>
                    <td className="py-2.5 px-3 text-slate-800">{r.duration}s</td>
                    <td className="py-2.5 px-3 text-amber-600 font-bold">{r.peak_motor_load}%</td>
                    <td className="py-2.5 px-3 text-rose-600 font-bold">{r.peak_temperature}°C</td>
                    <td className="py-2.5 px-3 text-slate-700">{r.edge_cpu_avg}%</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded ${
                          r.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.status === 'COMPLETED' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <AlertOctagon className="w-3 h-3 text-rose-600" />
                        )}
                        {r.final_result}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-sans text-[10px]">{r.created_at}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedReport(r)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[10px] flex items-center gap-1 transition"
                          title="View Full Report Breakdown"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                        <a
                          href={api.getReportPdfUrl(r.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded font-bold text-[10px] flex items-center gap-1 transition"
                          title="Download Formatted PDF"
                        >
                          <Download className="w-3 h-3" />
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
};
