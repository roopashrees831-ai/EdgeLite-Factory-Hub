import React, { useState } from 'react';
import {
  LayoutDashboard,
  ListOrdered,
  FileText,
  History,
  Settings,
  Bot,
} from 'lucide-react';

export type NavPage =
  | 'overview'
  | 'robot_control'
  | 'tasks_queue'
  | 'live_data'
  | 'reports'
  | 'history'
  | 'settings';

interface SidebarProps {
  currentPage: NavPage;
  onSelectPage: (page: NavPage) => void;
  robotStatus?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'tasks_queue',
      label: 'Tasks & Queue',
      icon: ListOrdered,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`relative ${
        collapsed ? 'w-[70px]' : 'w-[250px]'
      } bg-white border-r border-slate-200 flex flex-col justify-between select-none shrink-0 h-full transition-[width] duration-200 ease-in-out overflow-hidden`}
    >
      {/* Sidebar toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={
          collapsed
            ? 'Open sidebar'
            : 'Close sidebar'
        }
        title={
          collapsed
            ? 'Open sidebar'
            : 'Close sidebar'
        }
        className={`absolute top-3 z-30 w-7 h-7 rounded-md border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-all flex items-center justify-center ${
          collapsed ? 'right-1.5' : 'right-3'
        }`}
      >
        <span className="text-base leading-none">
          {collapsed ? '›' : '‹'}
        </span>
      </button>

      {/* Navigation */}
      <div
        className={`${
          collapsed
            ? 'p-2 pt-14'
            : 'p-3 pt-14'
        } space-y-1 transition-all`}
      >
        {!collapsed && (
          <div className="px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500 whitespace-nowrap">
            Navigation
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                onSelectPage(
                  item.id as NavPage
                )
              }
              title={
                collapsed
                  ? item.label
                  : undefined
              }
              className={`w-full flex items-center ${
                collapsed
                  ? 'justify-center px-2'
                  : 'gap-3 px-3'
              } py-3 rounded-md text-sm font-bold transition-all text-left ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-500'
                }`}
              />

              {!collapsed && (
                <span className="whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* UR5e information */}
      {!collapsed && (
        <div className="p-3 m-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
              <Bot className="w-4 h-4 text-blue-500" />
              <span>UR5e</span>
            </div>

            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
              Active
            </span>
          </div>

          <p className="text-[11px] text-slate-500 mb-2 leading-tight">
            6-Axis Collaborative Robot
          </p>

          <div className="bg-white rounded-lg p-3 border border-slate-200 mb-2.5 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Connection:
              </span>

              <span className="font-semibold text-blue-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Digital Twin
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Physical HW:
              </span>

              <span className="font-mono text-slate-700">
                Software Sim
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-300/60 pt-2 font-mono">
            <div>
              <span className="text-slate-500 block text-[11px] font-sans">
                Payload
              </span>
              <b className="text-slate-900">
                5 kg
              </b>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px] font-sans">
                Reach
              </span>
              <b className="text-slate-900">
                850 mm
              </b>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;