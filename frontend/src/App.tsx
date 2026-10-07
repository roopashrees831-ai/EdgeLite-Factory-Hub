import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { Header } from './components/Header';

import {
  Sidebar,
  NavPage,
} from './components/Sidebar';

import { OverviewPage } from './pages/OverviewPage';
import { RobotControlPage } from './pages/RobotControlPage';
import { TasksPage } from './pages/TasksPage';
import { LiveDataPage } from './pages/LiveDataPage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

import { AddTaskModal } from './components/AddTaskModal';
import { FaultModal } from './components/FaultModal';

import {
  RobotState,
  Task,
  EventItem,
} from './types';

import { api } from './services/api';

const defaultState: RobotState = {
  robot_status: 'READY',

  joint_angles: {
    j1: 0,
    j2: -90,
    j3: 0,
    j4: -90,
    j5: 0,
    j6: 0,
  },

  cartesian_position: {
    x: 0.38,
    y: 0.12,
    z: 0.45,
  },

  telemetry: {
    temperature: 42,
    vibration: 0.4,
    motor_load: 0,
    torque: 8,
    power: 120,
    cycle_time: 0,
  },

  welding_active: false,

  current_operation:
    'Robot in Standby',

  current_task: null,

  task_progress: 0,

  demo_sequence_finished: false,

  active_fault: null,

  ai_health: 'NORMAL',

  anomaly_score: 0.02,

  ai_explanation:
    'All operating metrics are within the simulated normal operating range.',

  feature_contributions: {
    temperature: 0,
    vibration: 0,
    motor_load: 0,
    torque: 0,
    power: 0,
  },

  hardware_connected: false,

  robot_source:
    'EdgeLite Robot Simulator',

  hardware_label:
    'Software Digital Twin',

  system: {
    node_name:
      'EdgeLite-Node-01',

    processing_mode:
      'LOCAL_EDGE_PROCESSING',

    cloud_dependency:
      'NONE',

    hardware_connected:
      false,

    robot_source:
      'EdgeLite Robot Simulator',

    hardware_label:
      'Software Digital Twin',

    cpu_percent: 18.5,

    memory_percent: 45.2,

    memory_used_mb: 3700,

    memory_total_mb: 8192,

    disk_percent: 54,

    disk_used_gb: 270,

    disk_total_gb: 500,

    latency_ms: 1.4,
  },
};

export const App: React.FC = () => {
  const [
    currentPage,
    setCurrentPage,
  ] = useState<NavPage>('overview');

  const [
    robotState,
    setRobotState,
  ] = useState<RobotState>(
    defaultState
  );

  const [
    tasks,
    setTasks,
  ] = useState<Task[]>([]);

  const [
    events,
    setEvents,
  ] = useState<EventItem[]>([]);

  const [
    isDarkMode,
    setIsDarkMode,
  ] = useState(false);

  const [
    isAddTaskOpen,
    setIsAddTaskOpen,
  ] = useState(false);

  const [
    isFaultModalOpen,
    setIsFaultModalOpen,
  ] = useState(false);

  /*
   * ==========================================================
   * DASHBOARD REFRESH
   * ==========================================================
   */

  const refreshDashboard =
    useCallback(async () => {
      try {
        const results =
          await Promise.allSettled([
            api.getRobotState(),
            api.getTasks(),
            api.getHistory(),
            api.getSystemStatus(),
          ]);

        /*
         * ROBOT STATE
         */

        if (
          results[0].status ===
          'fulfilled'
        ) {
          const value =
            results[0].value;

          if (value) {
            setRobotState(
              value
            );
          }
        }

        /*
         * TASK LIST
         *
         * Always normalize to [].
         */

        if (
          results[1].status ===
          'fulfilled'
        ) {
          const value =
            results[1].value;

          setTasks(
            Array.isArray(value)
              ? value
              : []
          );
        } else {
          setTasks([]);
        }

        /*
         * HISTORY
         */

        if (
          results[2].status ===
          'fulfilled'
        ) {
          const value =
            results[2].value;

          setEvents(
            Array.isArray(value)
              ? value
              : []
          );
        } else {
          setEvents([]);
        }

        /*
         * SYSTEM STATUS
         *
         * Fetches authentic local laptop
         * CPU, RAM, disk and latency values.
         */

        if (
          results[3].status ===
          'fulfilled'
        ) {
          const value =
            results[3].value;

          if (value) {
            setRobotState(
              (previous) => ({
                ...previous,
                system: value,
              })
            );
          }
        }

      } catch (error) {
        console.warn(
          'Dashboard refresh failed:',
          error
        );
      }
    }, []);

  /*
   * ==========================================================
   * FIRST LOAD
   * ==========================================================
   */

  useEffect(() => {
    refreshDashboard();
  }, [
    refreshDashboard,
  ]);

  /*
   * ==========================================================
   * LIVE REST POLLING
   * ==========================================================
   *
   * No WebSocket required.
   */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          refreshDashboard();
        },
        1000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    refreshDashboard,
  ]);

  /*
   * ==========================================================
   * DARK MODE
   * ==========================================================
   */

  const handleToggleDarkMode =
    () => {
      setIsDarkMode(
        (previous) => {
          const next =
            !previous;

          if (next) {
            document.documentElement.classList.add(
              'dark'
            );
          } else {
            document.documentElement.classList.remove(
              'dark'
            );
          }

          return next;
        }
      );
    };

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden ${
        isDarkMode
          ? 'dark'
          : ''
      }`}
    >

      {/* HEADER */}

      <Header
        system={
          robotState.system
        }
      />

      <div className="flex flex-1 overflow-hidden">

        {/* SIDEBAR */}

        <Sidebar
          currentPage={
            currentPage
          }
          onSelectPage={
            setCurrentPage
          }
          robotStatus={
            robotState.robot_status
          }
        />

        {/* MAIN */}

        <main className="flex-1 overflow-y-auto bg-slate-100/70">

          {/* OVERVIEW */}

          {currentPage ===
            'overview' && (
            <OverviewPage
              state={
                robotState
              }
              tasks={
                tasks
              }
              events={
                events
              }
              onOpenAddTask={() =>
                setIsAddTaskOpen(
                  true
                )
              }
              onOpenFaultModal={() =>
                setIsFaultModalOpen(
                  true
                )
              }
              onRefreshData={
                refreshDashboard
              }
            />
          )}

          {/* ROBOT CONTROL */}

          {currentPage ===
            'robot_control' && (
            <RobotControlPage
              state={
                robotState
              }
              onRefreshData={
                refreshDashboard
              }
            />
          )}

          {/* TASKS */}

          {currentPage ===
            'tasks_queue' && (
            <TasksPage
              state={
                robotState
              }
              tasks={
                tasks
              }
              onOpenAddTask={() =>
                setIsAddTaskOpen(
                  true
                )
              }
              onRefreshData={
                refreshDashboard
              }
            />
          )}

          {/* LIVE DATA */}

          {currentPage ===
            'live_data' && (
            <LiveDataPage
              state={
                robotState
              }
            />
          )}

          {/* REPORTS */}

          {currentPage ===
            'reports' && (
            <ReportsPage />
          )}

          {/* HISTORY */}

          {currentPage ===
            'history' && (
            <HistoryPage />
          )}

          {/* SETTINGS */}

          {currentPage ===
            'settings' && (
            <SettingsPage
              isDarkMode={
                isDarkMode
              }
              onToggleDarkMode={
                handleToggleDarkMode
              }
            />
          )}

        </main>
      </div>

      {/* ADD TASK */}

      <AddTaskModal
        isOpen={
          isAddTaskOpen
        }
        onClose={() =>
          setIsAddTaskOpen(
            false
          )
        }
        onTaskAdded={
          refreshDashboard
        }
      />

      {/* AUTOMATIC FAULT */}

      <FaultModal
        isOpen={
          isFaultModalOpen
        }
        onClose={() =>
          setIsFaultModalOpen(
            false
          )
        }
        onFaultInjected={
          refreshDashboard
        }
      />

    </div>
  );
};

export default App;