import React, { useState } from 'react';
import { X, PlusCircle, Clock, Tag, Flag } from 'lucide-react';
import { api } from '../services/api';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskAdded: () => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onTaskAdded }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('Welding');
  const [priority, setPriority] = useState('HIGH');
  const [duration, setDuration] = useState('30');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Task name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await api.addTask({
        name: name.trim(),
        type,
        priority,
        estimated_duration: parseFloat(duration) || 30,
      });
      onTaskAdded();
      onClose();
      // Reset form
      setName('');
      setType('Welding');
      setPriority('HIGH');
      setDuration('30');
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-sm tracking-wide">Schedule New Production Task</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Task Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Welding Chassis Joint #3"
              className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                Task Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
              >
                <option value="Welding">Welding</option>
                <option value="Inspection">Inspection</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Anomaly Detection">Anomaly Detection</option>
                <option value="Quality Analysis">Quality Analysis</option>
                <option value="Report Generation">Report Generation</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-slate-500" />
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Estimated Duration (seconds)
            </label>
            <input
              type="number"
              min="5"
              max="300"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
          </div>

          {/* Physical Constraint Notice */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-[11px] leading-relaxed">
            <span className="font-bold">Edge Scheduler Rule:</span> If a motion task is currently running on the UR5e, new motion tasks will automatically queue in <b>WAITING</b> status until the robot is available.
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Enqueue Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
