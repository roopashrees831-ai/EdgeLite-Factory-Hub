import React, { useState, useEffect } from 'react';
import { Cpu, Clock } from 'lucide-react';
import { SystemMetrics } from '../types';

interface HeaderProps {
  system?: SystemMetrics;
}

export const Header: React.FC<HeaderProps> = ({ system }) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-2.5 flex items-center justify-between shadow-md select-none sticky top-0 z-50">
      {/* Left: Branding & Tagline */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg border border-blue-400/30">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white font-sans">
              Edge<span className="text-blue-400">Lite</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Smarter Edge. Stronger Factory.</p>
        </div>
      </div>

      {/* Right: Edge Node Status, Live Clock, Operator */}
      <div className="flex items-center gap-3 text-xs">
        {/* System Online Indicator */}
        <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 rounded">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider leading-none">System Online</span>
            <span className="text-[9px] font-mono text-slate-400 leading-tight">LOCAL_EDGE_PROCESSING</span>
          </div>
        </div>

        {/* Live Clock */}
        <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 px-2 py-1 rounded font-mono text-slate-300 text-xs">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>{timeStr || '--:--:--'}</span>
        </div>

      </div>
    </header>
  );
};
