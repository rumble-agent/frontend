"use client";

import { useDashboard } from "./use-dashboard";
import { LOG_COLORS, EVENT_LABELS } from "./types";

export function ActivityPanel() {
  const { activeTab, setActiveTab, fetchStats, stats, logs, exportLogs, logEndRef, logContainerRef } = useDashboard();

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden flex flex-col transition-colors duration-[250ms] hover:border-white/[0.10]" style={{ minHeight: "500px" }}>
      {/* Tab bar */}
      <div className="flex items-center border-b border-white/[0.04] shrink-0">
        <div className="flex" role="tablist" aria-label="Agent activity">
          <button
            id="tab-activity"
            role="tab"
            aria-selected={activeTab === "activity"}
            aria-controls="panel-activity"
            onClick={() => { setActiveTab("activity"); fetchStats(); }}
            className={`px-5 py-3 text-[12px] font-medium transition-colors border-b-2 ${
              activeTab === "activity" ? "text-white border-[#00D4FF]" : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            Activity
            {stats?.history && stats.history.length > 0 && (
              <span className="ml-2 text-[10px] text-zinc-600">({stats.history.length})</span>
            )}
          </button>
          <button
            id="tab-log"
            role="tab"
            aria-selected={activeTab === "log"}
            aria-controls="panel-log"
            onClick={() => setActiveTab("log")}
            className={`px-5 py-3 text-[12px] font-medium transition-colors border-b-2 ${
              activeTab === "log" ? "text-white border-[#00D4FF]" : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            Agent Log
            {logs.length > 0 && (
              <span className="ml-2 text-[10px] text-zinc-600">({logs.length})</span>
            )}
          </button>
        </div>
        <div className="ml-auto pr-4">
          <button
            onClick={exportLogs}
            disabled={logs.length === 0}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-30"
          >
            Export
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div ref={logContainerRef} className="flex-1 overflow-y-auto max-h-[600px]">
        {activeTab === "activity" ? (
          <div id="panel-activity" role="tabpanel" aria-labelledby="tab-activity" className="p-5">
            {!stats?.history?.length ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center mb-4">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <p className="text-zinc-500 text-[13px] font-medium">No activity yet</p>
                <p className="text-zinc-600 text-[11px] mt-1">Start the agent or trigger a test event.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.history.map((record) => (
                  <div
                    key={record.id}
                    className={`rounded-lg border-l-2 p-4 transition-colors duration-[200ms] ${
                      record.decision.should_tip
                        ? "border-l-emerald-500 bg-emerald-500/[0.02] border-y border-r border-emerald-500/10 hover:bg-emerald-500/[0.04]"
                        : "border-l-zinc-700 bg-white/[0.01] border-y border-r border-white/[0.04] hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium font-mono ${
                          record.decision.should_tip
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-zinc-800 text-zinc-500"
                        }`}>
                          {record.decision.should_tip ? `+${record.decision.amount} USDT` : "SKIP"}
                        </span>
                        <span className="text-zinc-500 text-[11px]">
                          {EVENT_LABELS[record.decision.event.type] ?? record.decision.event.type}
                        </span>
                        {record.usedLLM && (
                          <span className="text-amber-400/50 text-[9px] uppercase tracking-wider font-mono">LLM</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                record.decision.score >= 0.7 ? "bg-emerald-400" : record.decision.score >= 0.4 ? "bg-amber-400" : "bg-zinc-500"
                              }`}
                              style={{ width: `${record.decision.score * 100}%` }}
                            />
                          </div>
                          <span className="text-zinc-500 text-[11px] font-mono">{record.decision.score}</span>
                        </div>
                        <span className="text-zinc-700 text-[10px] font-mono">
                          {new Date(record.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                        </span>
                      </div>
                    </div>
                    <p className="text-zinc-500 text-[11px] leading-relaxed font-mono">
                      {record.decision.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div id="panel-log" role="tabpanel" aria-labelledby="tab-log" className="p-5">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-600 font-mono text-[13px]">
                <p><span className="text-zinc-700">&gt;</span> Waiting for events...</p>
                <p className="text-zinc-700 text-[11px] mt-1">Start the agent to see log output.</p>
              </div>
            ) : (
              <div className="font-mono text-[13px] leading-6 space-y-0">
                {logs.map((log) => (
                  <div key={log.id} className={`flex gap-3 ${LOG_COLORS[log.type] || "text-zinc-500"}`}>
                    <span className="text-zinc-700 shrink-0 select-none text-[11px] mt-[2px]">
                      {new Date(log.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                    </span>
                    <span className="text-zinc-700 shrink-0 select-none text-[11px] mt-[2px] w-6 text-center uppercase">
                      {log.type}
                    </span>
                    <span className="min-w-0 break-words">{log.message}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
