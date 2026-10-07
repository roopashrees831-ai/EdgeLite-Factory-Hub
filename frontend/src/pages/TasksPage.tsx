import React, { useMemo, useState } from 'react';
import {
  Activity,
  Factory,
  Gauge,
  ListChecks,
  ShieldCheck,
  Timer,
  Zap,
} from 'lucide-react';
import { RobotState, Task } from '../types';

interface TasksPageProps {
  state: RobotState;
  tasks: Task[];
  onOpenAddTask: () => void;
  onRefreshData: () => void;
}

type Filter = 'ALL' | 'RUNNING' | 'WAITING' | 'COMPLETED';

const DEMO_IDS = ['TSK-100', 'TSK-101', 'TSK-102', 'TSK-103'];

const descriptions: Record<string, string> = {
  'TSK-100': 'Pick component from the input station, move to the target position, release and return home.',
  'TSK-101': 'Detect Part B, transfer it to the assigned sorting location and release.',
  'TSK-102': 'Pick the part and place it at the next synthetic pallet position.',
  'TSK-103': 'Follow a predefined synthetic welding path while monitoring machine health.',
};

const icons: Record<string, React.ReactNode> = {
  'TSK-100': <Factory className="w-4 h-4" />,
  'TSK-101': <ListChecks className="w-4 h-4" />,
  'TSK-102': <Gauge className="w-4 h-4" />,
  'TSK-103': <Zap className="w-4 h-4" />,
};

const priorityRank: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const TasksPage: React.FC<TasksPageProps> = ({ state, tasks }) => {
  const [filter, setFilter] = useState<Filter>('ALL');

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const demoTasks = useMemo(() => {
    const byId = new Map(safeTasks.map((task) => [task.id, task]));
    const queue = Array.isArray((state as any)?.demo_queue)
      ? (state as any).demo_queue
      : [];

    return DEMO_IDS.map((id, index) => {
      const backend = byId.get(id);
      const queueItem = queue.find((item: any) => item.id === id);

      // SQLite task state is authoritative for completed/queued/running rows.
      // The live state is used only to refine the currently executing task.
      const isCurrentTask = state.current_task?.id === id;

      const status = isCurrentTask
        ? (state.robot_status === 'RUNNING'
            ? 'RUNNING'
            : state.robot_status === 'PAUSED' || state.robot_status === 'FAULT' || state.robot_status === 'STOPPED'
            ? 'PAUSED'
            : backend?.status || queueItem?.status || 'READY')
        : backend?.status || queueItem?.status || 'WAITING';

      const progress = Math.max(
        0,
        Math.min(
          100,
          Number(
            isCurrentTask
              ? state.task_progress
              : backend?.progress ?? queueItem?.progress ?? 0
          )
        )
      );

      const names = [
        'Pick & Place Part A',
        'Sorting Part B',
        'Palletizing Part C',
        'Welding Path Part D',
      ];

      const types = [
        'Material Handling',
        'Sorting',
        'Palletizing',
        'Welding Path',
      ];

      const priorities = [
        'CRITICAL',
        'HIGH',
        'HIGH',
        'MEDIUM',
      ] as const;

      const durations = [14, 12, 13, 15];

      return {
        id,
        name: backend?.name || names[index],
        type: backend?.type || types[index],
        priority: backend?.priority || priorities[index],
        status,
        progress,
        estimatedDuration: Number(backend?.estimated_duration || durations[index]),
        description: descriptions[id],
        machine: backend?.machine || 'UR5e (Cell-01)',
      };
    });
  }, [safeTasks, state]);

  const ranked = useMemo(() => {
    return [...demoTasks].sort((a, b) => {
      if (a.status === 'RUNNING' && b.status !== 'RUNNING') return -1;
      if (b.status === 'RUNNING' && a.status !== 'RUNNING') return 1;
      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
      if (b.status === 'COMPLETED' && a.status !== 'COMPLETED') return -1;
      return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
    });
  }, [demoTasks]);

  const filtered = ranked.filter((task) => {
    if (filter === 'RUNNING') return task.status === 'RUNNING';
    if (filter === 'COMPLETED') return task.status === 'COMPLETED';
    if (filter === 'WAITING') {
      return task.status === 'WAITING' || task.status === 'READY' || task.status === 'PAUSED';
    }
    return true;
  });

  const counts = {
    all: demoTasks.length,
    running: demoTasks.filter((t) => t.status === 'RUNNING').length,
    waiting: demoTasks.filter((t) => ['WAITING', 'READY', 'PAUSED'].includes(t.status)).length,
    completed: demoTasks.filter((t) => t.status === 'COMPLETED').length,
  };

  const current = demoTasks.find((t) => t.status === 'RUNNING' || t.status === 'PAUSED');
  const next = ranked.find((t) => t.status !== 'COMPLETED' && t.id !== current?.id);

  const priorityClass = (priority: string) => {
    if (priority === 'CRITICAL') return 'bg-rose-50 border-rose-200 text-rose-700';
    if (priority === 'HIGH') return 'bg-orange-50 border-orange-200 text-orange-700';
    return 'bg-blue-50 border-blue-200 text-blue-700';
  };

  const statusClass = (status: string) => {
    if (status === 'RUNNING') return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    if (status === 'COMPLETED') return 'bg-blue-50 border-blue-200 text-blue-700';
    if (status === 'PAUSED') return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-slate-50 border-slate-200 text-slate-600';
  };

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto">
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm px-5 py-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                INTELLIGENT EDGE TASK SCHEDULER &amp; QUEUE
              </h1>
              <p className="text-[11px] text-slate-500 mt-1">
                One robot task at a time • automatically selected by priority
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-[10px] font-black">
            <Factory className="w-3.5 h-3.5" /> SOFTWARE DIGITAL TWIN
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-300 rounded-xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${current ? 'bg-emerald-50 border border-emerald-200' : 'bg-blue-50 border border-blue-200'}`}>
              <Activity className={`w-5 h-5 ${current ? 'text-emerald-600' : 'text-blue-700'}`} />
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-black">Current Scheduled Task</div>
              <div className="text-base font-black text-slate-900 mt-1">{current?.name || (state.demo_sequence_finished ? 'All 4 Tasks Completed' : next?.name || 'Robot Ready')}</div>
              <div className="text-[10px] text-slate-500 mt-1">
                {current ? state.current_operation : state.demo_sequence_finished ? 'UR5e returned to Home / READY.' : 'Automatic scheduler will start the highest-priority unfinished task.'}
              </div>
            </div>
          </div>
          {current && (
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1.5 rounded-md border text-[9px] font-black ${priorityClass(current.priority)}`}>{current.priority}</span>
              <span className={`px-2.5 py-1.5 rounded-md border text-[9px] font-black ${statusClass(current.status)}`}>{current.status}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
          {([
            ['ALL', counts.all],
            ['RUNNING', counts.running],
            ['WAITING', counts.waiting],
            ['COMPLETED', counts.completed],
          ] as const).map(([name, count]) => (
            <button
              key={name}
              onClick={() => setFilter(name)}
              className={`px-3 py-2 rounded-md border text-[10px] font-black ${filter === name ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >
              {name} <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                {['Rank', 'Task', 'Type', 'Priority', 'Status', 'Progress', 'Duration', 'Machine', 'Execution'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-[9px] uppercase tracking-widest font-black text-slate-400">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const rank = ranked.findIndex((item) => item.id === task.id) + 1;
                const running = task.status === 'RUNNING';
                const completed = task.status === 'COMPLETED';
                const isCurrent = current?.id === task.id;

                return (
                  <tr key={task.id} className={`border-b border-slate-100 ${running ? 'bg-emerald-50/60' : isCurrent ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${rank === 1 ? 'bg-rose-100 text-rose-700' : rank === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{rank}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${running ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{icons[task.id]}</div>
                        <div>
                          <div className="text-xs font-black text-slate-900">{task.name}</div>
                          <div className="text-[9px] font-mono text-blue-600 mt-0.5">{task.id.replace('TSK-', 'MOTION-')}</div>
                          <div className="text-[10px] text-slate-500 mt-1 max-w-[330px] leading-4">{task.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[10px] font-bold text-slate-700">{task.type}</td>
                    <td className="px-4 py-4"><span className={`inline-flex px-2 py-1 rounded-md border text-[9px] font-black ${priorityClass(task.priority)}`}>{task.priority}</span></td>
                    <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-black ${statusClass(task.status)}`}><span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-emerald-500 animate-pulse' : completed ? 'bg-blue-500' : 'bg-slate-400'}`} />{task.status}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-300 ${running ? 'bg-emerald-500' : completed ? 'bg-blue-500' : 'bg-slate-300'}`} style={{ width: `${task.progress}%` }} /></div>
                        <span className="text-[10px] font-mono font-black text-slate-700">{task.progress.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-700"><Timer className="w-3.5 h-3.5 text-slate-400" />{running ? `${(task.estimatedDuration * task.progress / 100).toFixed(1)} s` : `${task.estimatedDuration}s`}</div></td>
                    <td className="px-4 py-4 text-[10px] font-semibold text-slate-700">{task.machine}</td>
                    <td className="px-4 py-4">
                      {running ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black"><Activity className="w-3 h-3" />LIVE</span> : completed ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-black"><ShieldCheck className="w-3 h-3" />DONE</span> : isCurrent ? <span className="inline-flex px-2.5 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-black">PAUSED</span> : <span className="text-[9px] font-bold text-slate-400">WAITING</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-300 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-blue-600" /><h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Automatic Execution Priority</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {demoTasks.map((task, index) => (
            <div key={task.id} className={`rounded-lg p-3 border ${task.status === 'RUNNING' ? 'bg-emerald-50 border-emerald-300' : task.status === 'COMPLETED' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-[9px] uppercase tracking-widest font-black text-slate-400">Task {index + 1}</div>
              <div className="text-sm font-black text-slate-900 mt-1">{task.name}</div>
              <div className="text-[10px] font-bold text-slate-500 mt-1">{task.priority} Priority</div>
              <div className={`text-[9px] font-black mt-2 ${task.status === 'RUNNING' ? 'text-emerald-600' : task.status === 'COMPLETED' ? 'text-blue-600' : 'text-slate-400'}`}>{task.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TasksPage;
