import React, { useState, useEffect } from 'react';
import {
  History as HistoryIcon,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { EventItem } from '../types';
import { api } from '../services/api';

export const HistoryPage: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getHistory(selectedSeverity === 'ALL' ? undefined : selectedSeverity);
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedSeverity]);

  const filtered = events.filter((ev) =>
    ev.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.timestamp.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const severities = ['ALL', 'INFO', 'WARNING', 'AI', 'SUCCESS', 'FAULT', 'RECOVERY'];

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto select-none">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
            <HistoryIcon className="w-4 h-4 text-blue-600" />
            HISTORICAL AUDIT LOG & CELL EVENT TIMELINE
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable SQLite transaction record of all robot state transitions, tasks, AI checks, and faults
          </p>
        </div>

        <button
          onClick={fetchEvents}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-semibold text-xs text-slate-700 transition"
        >
          Refresh Log
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1 text-[11px]">
            <Filter className="w-3.5 h-3.5" />
            Severity:
          </span>
          {severities.map((sev) => {
            const isSelected = selectedSeverity === sev;
            return (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition font-mono ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sev}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by keyword..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          />
        </div>
      </div>

      {/* Chronological Timeline Container */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4 text-xs">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading audit history...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium">No events found matching filter.</div>
        ) : (
          <div className="relative pl-6 border-l-2 border-slate-200 space-y-4 my-2">
            {filtered.map((ev) => {
              const sev = ev.severity;
              return (
                <div key={ev.id} className="relative group">
                  {/* Timeline bullet dot */}
                  <div
                    className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow flex items-center justify-center ${
                      sev === 'FAULT'
                        ? 'bg-rose-600'
                        : sev === 'WARNING'
                        ? 'bg-amber-500'
                        : sev === 'AI'
                        ? 'bg-purple-600'
                        : sev === 'SUCCESS'
                        ? 'bg-emerald-600'
                        : sev === 'RECOVERY'
                        ? 'bg-blue-600'
                        : 'bg-slate-500'
                    }`}
                  ></div>

                  {/* Event Box */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            sev === 'FAULT'
                              ? 'bg-rose-100 text-rose-800'
                              : sev === 'WARNING'
                              ? 'bg-amber-100 text-amber-800'
                              : sev === 'AI'
                              ? 'bg-purple-100 text-purple-800'
                              : sev === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sev === 'RECOVERY'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {sev}
                        </span>
                        {ev.task_id && (
                          <span className="font-mono text-[10px] text-blue-600 font-semibold">
                            {ev.task_id}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">{ev.timestamp}</span>
                    </div>

                    <p className="text-slate-800 text-[11px] font-medium leading-relaxed">
                      {ev.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
