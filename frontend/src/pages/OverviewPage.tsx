import React, { useState } from 'react';

import {

  Play,

  Square,

  RotateCcw,

  AlertTriangle,

  Cpu,

  Activity,

  Gauge,

  Thermometer,

  Zap,

  Waves,

  Timer,

  ShieldAlert,

} from 'lucide-react';



import {

  RobotState,

  Task,

  EventItem,

} from '../types';



import { UR5eViewer } from '../robot/UR5eViewer';

import { api } from '../services/api';



interface OverviewPageProps {

  state: RobotState;

  tasks: Task[];

  events: EventItem[];

  onOpenAddTask: () => void;

  onOpenFaultModal: () => void;

  onRefreshData: () => void;

}



export const OverviewPage: React.FC<OverviewPageProps> = ({

  state,

  tasks,

  events,

  onOpenAddTask,

  onOpenFaultModal,

  onRefreshData,

}) => {

  const [actionLoading, setActionLoading] =

    useState(false);



  const handleStart = async () => {

    try {

      setActionLoading(true);

      await api.startRobot();

      onRefreshData();

    } catch (error) {

      console.error(error);

    } finally {

      setActionLoading(false);

    }

  };



  const handleStop = async () => {

    try {

      setActionLoading(true);

      await api.stopRobot();

      onRefreshData();

    } catch (error) {

      console.error(error);

    } finally {

      setActionLoading(false);

    }

  };



  const handleReset = async () => {

    try {

      setActionLoading(true);

      await api.resetRobot();

      onRefreshData();

    } catch (error) {

      console.error(error);

    } finally {

      setActionLoading(false);

    }

  };



  const handleClearFault = async () => {

    try {

      setActionLoading(true);

      await api.clearFault();

      onRefreshData();

    } catch (error) {

      console.error(error);

    } finally {

      setActionLoading(false);

    }

  };



  const currentTask =

    state.current_task;



  const isRunning =

    state.robot_status === 'RUNNING';



  const isFault =

    state.robot_status === 'FAULT';



  const tel =

    state.telemetry;



  const sys =

    state.system;



  const normalizedProgress =

    Math.max(

      0,

      Math.min(

        100,

        state.task_progress || 0,

      ),

    );



  return (

    <div className="p-4 space-y-4 max-w-[1600px] mx-auto select-none">



      {/* =========================================================

          ACTIVE FAULT

          ========================================================= */}



      {state.active_fault && (

        <div className="bg-rose-50 border-2 border-rose-500 rounded-lg p-4 shadow-md">



          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">



            <div className="flex items-start gap-3">



              <div className="p-2.5 bg-rose-600 text-white rounded-md shrink-0 shadow">

                <ShieldAlert className="w-6 h-6 animate-pulse" />

              </div>



              <div>



                <div className="flex items-center gap-2 flex-wrap">



                  <span className="font-bold text-sm text-rose-900 uppercase tracking-wide">

                    {state.active_fault.origin_label ||

                      'FAULT ACTIVE'}

                    {' — '}

                    {state.active_fault.fault_type}

                  </span>



                  <span className="bg-rose-200 text-rose-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">

                    {state.active_fault.severity}

                  </span>



                </div>



                <div className="text-xs text-rose-950 mt-1 font-semibold">

                  Problem:{' '}

                  <span className="font-normal">

                    {state.active_fault.problem}

                  </span>

                </div>



                <div className="text-xs text-rose-900 mt-0.5">

                  <b>Root Cause:</b>{' '}

                  {state.active_fault.cause}

                </div>



                <div className="text-xs text-rose-900 mt-0.5">

                  <b>Affected Task:</b>{' '}

                  {state.active_fault.affected_task_name ||

                    'Active Task'}

                  {' • '}

                  <b>Recommended Action:</b>{' '}

                  {state.active_fault.recommended_action}

                </div>



              </div>

            </div>



            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">



              <button

                onClick={handleClearFault}

                disabled={actionLoading}

                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded shadow transition disabled:opacity-50"

              >

                CLEAR FAULT

              </button>



              <button

                onClick={handleStart}

                disabled={actionLoading}

                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow transition disabled:opacity-50 flex items-center gap-1.5"

              >

                <Play className="w-3.5 h-3.5 fill-current" />

                RESUME TASK

              </button>



            </div>



          </div>

        </div>

      )}



      {/* =========================================================

          MAIN DASHBOARD

          ========================================================= */}



      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">



        {/* =======================================================

            ROBOT LIVE VIEW

            ======================================================= */}



        <div className="xl:col-span-8 flex flex-col bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">



          <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">



            <div className="flex items-center gap-2.5">



              <Activity className="w-4 h-4 text-blue-400" />



              <div>



                <h2 className="font-bold text-xs uppercase tracking-wider text-slate-100">

                  ROBOT LIVE VIEW — DIGITAL TWIN

                </h2>



                <span className="text-[10px] text-slate-400 font-mono">

                  Official UR5e Visual Meshes • Real-time Joint Dynamics

                </span>



              </div>



            </div>



            {/* ROBOT CONTROLS */}



            <div className="flex items-center gap-2">



              <button

                onClick={handleStart}

                disabled={

                  actionLoading ||

                  isRunning ||

                  isFault

                }

                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded text-xs font-bold flex items-center gap-1.5 transition shadow"

              >

                <Play className="w-3.5 h-3.5 fill-current" />

                START

              </button>



              <button

                onClick={handleStop}

                disabled={

                  actionLoading ||

                  !isRunning

                }

                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded text-xs font-bold flex items-center gap-1.5 transition shadow"

              >

                <Square className="w-3.5 h-3.5 fill-current" />

                STOP

              </button>



              <button

                onClick={handleReset}

                disabled={actionLoading}

                className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded text-xs font-bold flex items-center gap-1.5 transition"

              >

                <RotateCcw className="w-3.5 h-3.5" />

                RESET

              </button>



              <button

                onClick={onOpenFaultModal}

                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold flex items-center gap-1.5 transition shadow"

              >

                <AlertTriangle className="w-3.5 h-3.5" />

                SIMULATE FAULT

              </button>



            </div>

          </div>



          {/* 3D ROBOT */}



          <div className="h-[480px] w-full relative">



            <UR5eViewer

              jointAngles={

                state.joint_angles

              }

              robotStatus={

                state.robot_status

              }

              weldingActive={

                state.welding_active

              }

              taskProgress={

                state.task_progress

              }

              currentTaskName={

                currentTask?.name

              }

            />



          </div>



          {/* =====================================================

              BOTTOM ROBOT STATUS STRIP

              ===================================================== */}



          <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">



            <div className="flex items-center gap-3">



              <span className="text-slate-500 font-semibold uppercase text-[10px]">

                Current Task:

              </span>



              <span className="font-bold text-slate-800">

                {currentTask

                  ? `${currentTask.name} (${currentTask.type})`

                  : 'Cell in Standby / Idle'}

              </span>



            </div>



            <div className="flex items-center gap-4 font-mono text-[11px]">



              <div>

                <span className="text-slate-500 font-sans text-[10px]">

                  Elapsed Time:{' '}

                </span>



                <b className="text-slate-800">

                  {tel.cycle_time.toFixed(

                    1,

                  )}

                  s

                </b>

              </div>



              <div>

                <span className="text-slate-500 font-sans text-[10px]">

                  Cycles:{' '}

                </span>



                <b className="text-slate-800">

                  1

                </b>

              </div>



              <div className="flex items-center gap-1.5">



                <span className="text-slate-500 font-sans text-[10px]">

                  Progress:{' '}

                </span>



                <b className="text-blue-600">

                  {normalizedProgress.toFixed(

                    0,

                  )}

                  %

                </b>



              </div>



            </div>

          </div>



        </div>



        {/* =======================================================

            RIGHT COLUMN

            ======================================================= */}



        <div className="xl:col-span-4 flex flex-col gap-4">



          {/* =====================================================

              EDGE COMPUTING NODE

              ===================================================== */}



          <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4 text-xs space-y-3">



            <div className="flex items-center justify-between border-b border-slate-200 pb-2">



              <div className="flex items-center gap-2">



                <Cpu className="w-4 h-4 text-blue-600" />



                <h3 className="font-bold text-slate-900 tracking-wide">

                  EDGE COMPUTING NODE MONITOR

                </h3>



              </div>



              <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">

                {sys?.node_name ||

                  'EdgeLite-Node-01'}

              </span>



            </div>



            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">



              {/* CPU */}



              <div className="bg-slate-50 p-2 rounded border border-slate-200">



                <span className="text-slate-500 font-sans block text-[10px]">

                  Host CPU Usage (psutil)

                </span>



                <div className="flex items-baseline justify-between mt-1">



                  <b className="text-slate-900 text-sm">

                    {(

                      sys?.cpu_percent ??

                      0

                    ).toFixed(1)}

                    %

                  </b>



                  <span className="text-[9px] text-slate-400">

                    Authentic

                  </span>



                </div>



                <div className="w-full bg-slate-200 rounded-full h-1 mt-1.5">



                  <div

                    className="bg-blue-600 h-1 rounded-full transition-all duration-300"

                    style={{

                      width: `${Math.min(

                        100,

                        sys?.cpu_percent ||

                          0,

                      )}%`,

                    }}

                  />



                </div>



              </div>



              {/* RAM */}



              <div className="bg-slate-50 p-2 rounded border border-slate-200">



                <span className="text-slate-500 font-sans block text-[10px]">

                  Host RAM Usage (psutil)

                </span>



                <div className="flex items-baseline justify-between mt-1">



                  <b className="text-slate-900 text-sm">

                    {(

                      sys?.memory_percent ??

                      0

                    ).toFixed(1)}

                    %

                  </b>



                  <span className="text-[9px] text-slate-400">

                    {sys?.memory_used_mb ??

                      0}{' '}

                    MB

                  </span>



                </div>



                <div className="w-full bg-slate-200 rounded-full h-1 mt-1.5">



                  <div

                    className="bg-blue-600 h-1 rounded-full transition-all duration-300"

                    style={{

                      width: `${Math.min(

                        100,

                        sys?.memory_percent ||

                          0,

                      )}%`,

                    }}

                  />



                </div>



              </div>



              {/* LATENCY */}



              <div className="bg-slate-50 p-2 rounded border border-slate-200">



                <span className="text-slate-500 font-sans block text-[10px]">

                  Processing Latency

                </span>



                <div className="flex items-baseline justify-between mt-1">



                  <b className="text-emerald-600 text-sm">

                    {(

                      sys?.latency_ms ??

                      0

                    ).toFixed(1)}{' '}

                    ms

                  </b>



                  <span className="text-[9px] text-emerald-500">

                    Local Edge

                  </span>



                </div>



              </div>



              {/* CLOUD */}



              <div className="bg-slate-50 p-2 rounded border border-slate-200">



                <span className="text-slate-500 font-sans block text-[10px]">

                  Cloud Dependency

                </span>



                <div className="flex items-baseline justify-between mt-1">



                  <b className="text-slate-800 text-sm">

                    NONE (0 kB)

                  </b>



                  <span className="text-[9px] text-slate-400 font-sans">

                    Self-reliant

                  </span>



                </div>



              </div>



            </div>



            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">



              <span>

                Mode:{' '}

                <b>

                  LOCAL_EDGE_PROCESSING

                </b>

              </span>



              <span>

                Hardware:{' '}

                <b>

                  Software Digital Twin

                </b>

              </span>



            </div>



          </div>



          {/* =====================================================

              LIVE MACHINE TELEMETRY

              ===================================================== */}



          <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4 text-xs space-y-3 flex-1">



            <div className="flex items-center justify-between border-b border-slate-200 pb-2">



              <div className="flex items-center gap-2">



                <Gauge className="w-4 h-4 text-slate-700" />



                <h3 className="font-bold text-slate-900 tracking-wide">

                  LIVE MACHINE TELEMETRY

                </h3>



              </div>



              <span className="text-[10px] text-slate-500 font-mono">

                Deterministic Physics Model

              </span>



            </div>



            <div className="grid grid-cols-2 gap-2.5 font-mono">



              {/* TEMPERATURE */}



              <div

                className={`p-2.5 rounded-lg border ${

                  tel.temperature >=

                  85

                    ? 'bg-rose-50 border-rose-400 text-rose-900'

                    : tel.temperature >=

                      70

                    ? 'bg-amber-50 border-amber-300 text-amber-900'

                    : 'bg-slate-50 border-slate-200 text-slate-900'

                }`}

              >



                <div className="flex items-center justify-between text-[10px] font-sans text-slate-500">



                  <span className="flex items-center gap-1">



                    <Thermometer className="w-3.5 h-3.5 text-rose-500" />



                    Temperature



                  </span>



                  <span>

                    Limit: 85°C

                  </span>



                </div>



                <div className="text-lg font-bold mt-1">



                  {tel.temperature.toFixed(

                    1,

                  )}{' '}



                  <span className="text-xs font-normal">

                    °C

                  </span>



                </div>



              </div>



              {/* VIBRATION */}



              <div

                className={`p-2.5 rounded-lg border ${

                  tel.vibration >=

                  3.5

                    ? 'bg-rose-50 border-rose-400 text-rose-900'

                    : tel.vibration >=

                      2.5

                    ? 'bg-amber-50 border-amber-300 text-amber-900'

                    : 'bg-slate-50 border-slate-200 text-slate-900'

                }`}

              >



                <div className="flex items-center justify-between text-[10px] font-sans text-slate-500">



                  <span className="flex items-center gap-1">



                    <Waves className="w-3.5 h-3.5 text-blue-500" />



                    Vibration



                  </span>



                  <span>

                    Limit: 3.5

                  </span>



                </div>



                <div className="text-lg font-bold mt-1">



                  {tel.vibration.toFixed(

                    2,

                  )}{' '}



                  <span className="text-xs font-normal">

                    mm/s

                  </span>



                </div>



              </div>



              {/* MOTOR LOAD */}



              <div

                className={`p-2.5 rounded-lg border ${

                  tel.motor_load >=

                  90

                    ? 'bg-rose-50 border-rose-400 text-rose-900'

                    : tel.motor_load >=

                      70

                    ? 'bg-amber-50 border-amber-300 text-amber-900'

                    : 'bg-slate-50 border-slate-200 text-slate-900'

                }`}

              >



                <div className="flex items-center justify-between text-[10px] font-sans text-slate-500">



                  <span className="flex items-center gap-1">



                    <Activity className="w-3.5 h-3.5 text-purple-500" />



                    Motor Load



                  </span>



                  <span>

                    Limit: 90%

                  </span>



                </div>



                <div className="text-lg font-bold mt-1">



                  {tel.motor_load.toFixed(

                    1,

                  )}{' '}



                  <span className="text-xs font-normal">

                    %

                  </span>



                </div>



              </div>



              {/* TORQUE */}



              <div

                className={`p-2.5 rounded-lg border ${

                  tel.torque >=

                  50

                    ? 'bg-rose-50 border-rose-400 text-rose-900'

                    : 'bg-slate-50 border-slate-200 text-slate-900'

                }`}

              >



                <div className="flex items-center justify-between text-[10px] font-sans text-slate-500">



                  <span className="flex items-center gap-1">



                    <Gauge className="w-3.5 h-3.5 text-slate-500" />



                    Joint Torque



                  </span>



                  <span>

                    Limit: 50 Nm

                  </span>



                </div>



                <div className="text-lg font-bold mt-1">



                  {tel.torque.toFixed(

                    1,

                  )}{' '}



                  <span className="text-xs font-normal">

                    Nm

                  </span>



                </div>



              </div>



              {/* POWER */}



              <div className="p-2.5 rounded-lg border bg-slate-50 border-slate-200 text-slate-900">



                <div className="flex items-center justify-between text-[10px] font-sans text-slate-500">



                  <span className="flex items-center gap-1">



                    <Zap className="w-3.5 h-3.5 text-amber-500" />



                    Electrical Power



                  </span>



                  <span>

                    Nom: 120W

                  </span>



                </div>



                <div className="text-lg font-bold mt-1">



                  {tel.power.toFixed(

                    0,

                  )}{' '}



                  <span className="text-xs font-normal">

                    W

                  </span>



                </div>



              </div>



              {/* CYCLE TIME */}



              <div className="p-2.5 rounded-lg border bg-slate-50 border-slate-200 text-slate-900">



                <div className="flex items-center justify-between text-[10px] font-sans text-slate-500">



                  <span className="flex items-center gap-1">



                    <Timer className="w-3.5 h-3.5 text-emerald-500" />



                    Cycle Duration



                  </span>



                  <span>

                    Live

                  </span>



                </div>



                <div className="text-lg font-bold mt-1">



                  {tel.cycle_time.toFixed(

                    1,

                  )}{' '}



                  <span className="text-xs font-normal">

                    s

                  </span>



                </div>



              </div>



            </div>



            {/* AI HEALTH */}



            <div className="p-2.5 bg-slate-900 rounded-lg text-white flex items-center justify-between">



              <div>



                <span className="text-[10px] text-slate-400 block uppercase font-medium">

                  Local AI Health Engine

                </span>



                <span

                  className={`font-bold text-xs tracking-wider ${

                    state.ai_health ===

                    'NORMAL'

                      ? 'text-emerald-400'

                      : 'text-rose-400'

                  }`}

                >

                  {state.ai_health}

                </span>



              </div>



              <div className="text-right font-mono">



                <span className="text-[10px] text-slate-400 block font-sans">

                  Anomaly Score

                </span>



                <b className="text-blue-400 text-xs">

                  {(

                    (state.anomaly_score ??

                      0) *

                    100

                  ).toFixed(1)}

                  %

                </b>



              </div>



            </div>



          </div>



        </div>

      </div>



      {/* =========================================================

          COMPACT EVENT SECTION

          ========================================================= */}



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">



        {/* CURRENT TASK */}



        <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4 text-xs">



          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">



            <div>



              <h3 className="font-bold text-slate-900 tracking-wide uppercase">

                CURRENT ROBOT TASK

              </h3>



              <span className="text-[10px] text-slate-500">

                Automatic task execution

              </span>



            </div>



            <span

              className={`text-[10px] font-extrabold px-2 py-1 rounded border ${

                isRunning

                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'

                  : isFault

                  ? 'bg-rose-50 text-rose-700 border-rose-200'

                  : normalizedProgress >=

                    100

                  ? 'bg-blue-50 text-blue-700 border-blue-200'

                  : 'bg-slate-50 text-slate-600 border-slate-200'

              }`}

            >

              {isRunning

                ? 'RUNNING'

                : isFault

                ? 'FAULT'

                : normalizedProgress >=

                  100

                ? 'COMPLETED'

                : 'READY'}

            </span>



          </div>



          <div className="mt-3">



            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">

              Task

            </div>



            <div className="mt-1 text-sm font-extrabold text-slate-900">

              {currentTask?.name ||

                'Cell in Standby / Idle'}

            </div>



            <div className="text-[10px] text-slate-500 mt-1">

              {currentTask?.type ||

                'Waiting for the next robot operation'}

            </div>



            <div className="mt-3">



              <div className="flex items-center justify-between mb-1">



                <span className="text-[9px] uppercase text-slate-400 font-bold">

                  Process Progress

                </span>



                <span className="text-[10px] font-mono font-bold text-blue-700">

                  {normalizedProgress.toFixed(

                    0,

                  )}

                  %

                </span>



              </div>



              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">



                <div

                  className="h-full bg-blue-600 rounded-full transition-all duration-500"

                  style={{

                    width: `${normalizedProgress}%`,

                  }}

                />



              </div>



            </div>



          </div>



        </div>



        {/* EVENTS */}



        <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4 text-xs">



          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">



            <div>



              <h3 className="font-bold text-slate-900 tracking-wide uppercase">

                LIVE EVENT TIMELINE

              </h3>



              <span className="text-[10px] text-slate-500">

                SQLite persistent audit

              </span>



            </div>



            <span className="text-[9px] font-mono text-slate-400">

              {events.length} events

            </span>



          </div>



          <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">



            {events.length > 0 ? (

              events

                .slice(0, 8)

                .map((event) => (

                  <div

                    key={event.id}

                    className="flex items-start gap-2 p-1.5 rounded hover:bg-slate-50 transition"

                  >



                    <span

                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${

                        event.severity ===

                        'FAULT'

                          ? 'bg-rose-100 text-rose-800'

                          : event.severity ===

                            'WARNING'

                          ? 'bg-amber-100 text-amber-800'

                          : event.severity ===

                            'AI'

                          ? 'bg-purple-100 text-purple-800'

                          : event.severity ===

                            'SUCCESS'

                          ? 'bg-emerald-100 text-emerald-800'

                          : 'bg-slate-100 text-slate-700'

                      }`}

                    >

                      {event.severity}

                    </span>



                    <div className="flex-1 min-w-0">



                      <p className="text-slate-800 leading-tight">

                        {event.description}

                      </p>



                      <span className="text-[9px] text-slate-400 font-mono">

                        {event.timestamp}

                      </span>



                    </div>



                  </div>

                ))

            ) : (

              <div className="text-center py-8 text-slate-400 text-xs">

                No recent events.

              </div>

            )}



          </div>



        </div>



      </div>



    </div>

  );

};



export default OverviewPage;