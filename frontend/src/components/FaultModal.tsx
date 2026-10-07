import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Gauge,
  Loader2,
  ShieldCheck,
  Thermometer,
  Waves,
  X,
} from 'lucide-react';
import { api } from '../services/api';

interface FaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFaultInjected: () => void;
}

interface FaultResult {
  fault_type?: string;
  severity?: string;
  problem?: string;
  cause?: string;
  recommended_action?: string;
  affected_task_name?: string;
  component?: string;
  sensor_value?: number | string;
  threshold?: number | string;
  timestamp?: string;
}

export const FaultModal: React.FC<FaultModalProps> = ({
  isOpen,
  onClose,
  onFaultInjected,
}) => {
  const [stage, setStage] = useState<
    'ANALYZING' | 'DETECTED' | 'ERROR'
  >('ANALYZING');

  const [fault, setFault] =
    useState<FaultResult | null>(null);

  const [errorMessage, setErrorMessage] =
    useState('');

  const runAutomaticAnalysis = async () => {
    try {
      setStage('ANALYZING');
      setFault(null);
      setErrorMessage('');

      /*
       * The existing API object may not yet expose a typed
       * automatic-fault helper, so use its runtime method here.
       *
       * The backend receives AUTO_DETECT rather than a
       * manually selected fault name.
       */
      const autoFaultApi =
        (api as any).injectFault;

      if (
        typeof autoFaultApi !==
        'function'
      ) {
        throw new Error(
          'Automatic fault simulation API is not available.'
        );
      }

      const response =
        await autoFaultApi('AUTO_DETECT');

      const detected =
        response?.fault ||
        response?.data?.fault ||
        response?.result?.fault ||
        null;

      if (!detected) {
        throw new Error(
          'EdgeLite did not return an automatic fault diagnosis.'
        );
      }

      setFault(detected);
      setStage('DETECTED');

      onFaultInjected();
    } catch (error) {
      console.error(
        'Automatic fault analysis failed:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Automatic fault analysis failed.'
      );

      setStage('ERROR');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setStage('ANALYZING');
      setFault(null);
      setErrorMessage('');
      return;
    }

    /*
     * Give the user a visible AI-analysis phase before
     * displaying the detected synthetic fault.
     */
    const timer =
      window.setTimeout(() => {
        runAutomaticAnalysis();
      }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">

      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden">

        {/* ======================================================
            HEADER
           ====================================================== */}

        <div className="bg-slate-900 text-white px-5 py-4">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <BrainCircuit className="w-5 h-5" />
              </div>

              <div>

                <h2 className="text-sm font-black uppercase tracking-wide">
                  Automatic AI Fault Analysis
                </h2>

                <p className="text-[10px] text-slate-400 mt-0.5">
                  Synthetic Digital-Twin Safety Simulation
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

          </div>

        </div>

        {/* ======================================================
            NOTICE
           ====================================================== */}

        <div className="px-5 py-3 bg-blue-50 border-b border-blue-200">

          <div className="flex items-start gap-2.5">

            <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />

            <div>

              <div className="text-[10px] font-black uppercase tracking-wide text-blue-900">
                Evaluation Sandbox
              </div>

              <div className="text-[10px] leading-4 text-blue-800 mt-0.5">
                EdgeLite automatically generates synthetic industrial
                telemetry, evaluates the anomaly, pauses the simulated
                robot and produces a diagnosis. No physical equipment
                is controlled.
              </div>

            </div>

          </div>

        </div>

        {/* ======================================================
            ANALYSIS
           ====================================================== */}

        {stage === 'ANALYZING' && (
          <div className="p-6">

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>

                <div>

                  <div className="text-sm font-black text-slate-900">
                    AI is analyzing simulated machine telemetry
                  </div>

                  <div className="text-[10px] text-slate-500 mt-1">
                    No fault type has been selected by the operator.
                  </div>

                </div>

              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-5">

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <Thermometer className="w-4 h-4 text-rose-500" />

                  <div className="text-[9px] font-black text-slate-400 mt-2">
                    TEMPERATURE
                  </div>

                  <div className="text-xs font-mono font-black text-slate-700 mt-1">
                    ANALYZING
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <Waves className="w-4 h-4 text-blue-500" />

                  <div className="text-[9px] font-black text-slate-400 mt-2">
                    VIBRATION
                  </div>

                  <div className="text-xs font-mono font-black text-slate-700 mt-1">
                    ANALYZING
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <Activity className="w-4 h-4 text-purple-500" />

                  <div className="text-[9px] font-black text-slate-400 mt-2">
                    MOTOR LOAD
                  </div>

                  <div className="text-xs font-mono font-black text-slate-700 mt-1">
                    ANALYZING
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <Gauge className="w-4 h-4 text-slate-500" />

                  <div className="text-[9px] font-black text-slate-400 mt-2">
                    TORQUE
                  </div>

                  <div className="text-xs font-mono font-black text-slate-700 mt-1">
                    ANALYZING
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <Cpu className="w-4 h-4 text-blue-600" />

                  <div className="text-[9px] font-black text-slate-400 mt-2">
                    EDGE AI
                  </div>

                  <div className="text-xs font-mono font-black text-slate-700 mt-1">
                    RUNNING
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ======================================================
            DETECTED
           ====================================================== */}

        {stage === 'DETECTED' &&
          fault && (
            <div className="p-5">

              <div className="rounded-xl border-2 border-rose-300 bg-rose-50 overflow-hidden">

                <div className="px-4 py-3 bg-rose-100 border-b border-rose-200">

                  <div className="flex items-center gap-2">

                    <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>

                    <div>

                      <div className="text-[10px] uppercase tracking-widest font-black text-rose-700">
                        AI Fault Detected
                      </div>

                      <div className="text-base font-black text-rose-950 mt-0.5">
                        {fault.fault_type ||
                          'Synthetic Safety Anomaly'}
                      </div>

                    </div>

                    <span className="ml-auto px-2 py-1 rounded-md bg-rose-600 text-white text-[9px] font-black">
                      {fault.severity ||
                        'HIGH'}
                    </span>

                  </div>

                </div>

                <div className="p-4 space-y-3">

                  <div className="bg-white rounded-lg border border-rose-200 p-3">

                    <div className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                      AI Diagnosis
                    </div>

                    <div className="text-xs font-black text-slate-900 mt-1">
                      {fault.problem ||
                        'Abnormal simulated telemetry detected.'}
                    </div>

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    <div className="bg-white rounded-lg border border-rose-200 p-3">

                      <div className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                        Root Cause
                      </div>

                      <div className="text-[11px] font-semibold text-slate-700 mt-1 leading-5">
                        {fault.cause ||
                          'Synthetic anomaly generated by the digital twin.'}
                      </div>

                    </div>

                    <div className="bg-white rounded-lg border border-rose-200 p-3">

                      <div className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                        Affected Task
                      </div>

                      <div className="text-[11px] font-black text-slate-700 mt-1">
                        {fault.affected_task_name ||
                          'Active Robot Task'}
                      </div>

                    </div>

                  </div>

                  {(fault.sensor_value !==
                    undefined ||
                    fault.threshold !==
                      undefined) && (
                    <div className="grid grid-cols-2 gap-3">

                      <div className="bg-white rounded-lg border border-rose-200 p-3">

                        <div className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                          Measured
                        </div>

                        <div className="text-sm font-black font-mono text-rose-700 mt-1">
                          {String(
                            fault.sensor_value ??
                              'N/A'
                          )}
                        </div>

                      </div>

                      <div className="bg-white rounded-lg border border-rose-200 p-3">

                        <div className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                          Safety Limit
                        </div>

                        <div className="text-sm font-black font-mono text-slate-800 mt-1">
                          {String(
                            fault.threshold ??
                              'N/A'
                          )}
                        </div>

                      </div>

                    </div>
                  )}

                  <div className="bg-slate-900 rounded-lg p-3 text-white">

                    <div className="flex items-center gap-2">

                      <Bot className="w-4 h-4 text-blue-400" />

                      <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                        Automatic Safety Action
                      </span>

                    </div>

                    <div className="text-sm font-black text-emerald-400 mt-2">
                      ROBOT MOTION PAUSED
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1">
                      {fault.recommended_action ||
                        'Inspect the simulated condition before resuming.'}
                    </div>

                  </div>

                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">

                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />

                    <div className="text-[10px] font-bold text-emerald-800">
                      Automatic diagnosis completed successfully.
                    </div>

                  </div>

                </div>

              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full mt-4 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition"
              >
                VIEW FAULT ON OVERVIEW
              </button>

            </div>
          )}

        {/* ======================================================
            ERROR
           ====================================================== */}

        {stage === 'ERROR' && (
          <div className="p-6">

            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">

              <div className="flex items-start gap-3">

                <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>

                <div>

                  <div className="text-sm font-black text-rose-900">
                    Automatic Analysis Failed
                  </div>

                  <div className="text-[10px] text-rose-700 mt-1">
                    {errorMessage}
                  </div>

                </div>

              </div>

            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full mt-4 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-black"
            >
              CLOSE
            </button>

          </div>
        )}

      </div>

    </div>
  );
};

export default FaultModal;