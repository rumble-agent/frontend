"use client";

import { DashboardProvider, useDashboard } from "./use-dashboard";
import { SetupView } from "./setup-view";
import { ActivityPanel } from "./activity-panel";
import { Sidebar } from "./sidebar";

export default function Dashboard() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}

function DashboardContent() {
  const { loaded, isSetup, actionError, setActionError } = useDashboard();

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header />
      {actionError && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
          <div className="px-4 py-2.5 rounded-lg border border-red-500/20 bg-red-500/[0.05] text-red-400 text-[13px] font-mono flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} aria-label="Dismiss error" className="text-red-400/60 hover:text-red-400 ml-4 shrink-0">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          </div>
        </div>
      )}
      {isSetup ? <SetupView /> : <DashboardView />}
    </div>
  );
}

/* ─── Header ─── */
function Header() {
  const { isSetup, isRunning, rumble } = useDashboard();
  const active = isRunning || rumble?.polling;

  return (
    <header className="border-b border-white/[0.04] bg-[#050505]/90 backdrop-blur-2xl sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 group">
            <img
              src="/rumble-icon.svg"
              alt=""
              width={22}
              height={22}
              className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-200"
              aria-hidden="true"
            />
            <span className="font-heading font-bold text-[15px] tracking-[-0.02em] text-zinc-400 group-hover:text-white transition-colors duration-200">
              Rumble Pulse
            </span>
          </a>
          <span className="text-zinc-700">/</span>
          <span className="font-heading font-bold text-[15px] tracking-[-0.02em]">
            {isSetup ? "Setup" : "Dashboard"}
          </span>
        </div>
        {!isSetup && (
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
              active
                ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                : "bg-zinc-600"
            }`} />
            <span className={`font-mono text-[11px] transition-colors ${active ? "text-emerald-400/70" : "text-zinc-500"}`}>
              {isRunning && rumble?.polling
                ? "Agent + Rumble"
                : isRunning
                ? "Agent running"
                : rumble?.polling
                ? "Rumble polling"
                : "Idle"}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

/* ─── Dashboard View ─── */
function DashboardView() {
  const { isRunning, rumble, triggerEvent, triggerLoading, toggleAutoRun, toggleRumble, rumbleLoading, s } = useDashboard();

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      {/* Ready banner (idle) */}
      {!isRunning && !rumble?.polling && (
        <div className="mb-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/10 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              </div>
              <div>
                <h2 className="text-[14px] font-semibold">Agent ready</h2>
                <p className="text-zinc-500 text-[12px]">
                  Start the agent to monitor and tip automatically, or test with a mock event.
                </p>
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={triggerEvent}
                disabled={triggerLoading}
                className="btn-press px-4 py-2 text-[13px] font-medium rounded-lg text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white transition-all disabled:opacity-40"
              >
                {triggerLoading ? "Testing..." : "Test Event"}
              </button>
              <button
                onClick={toggleAutoRun}
                className="btn-press px-5 py-2 text-[13px] font-medium rounded-lg bg-white text-[#050505] hover:bg-zinc-200 transition-colors shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_16px_rgba(255,255,255,0.05)]"
              >
                Start Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Running banner */}
      {(isRunning || rumble?.polling) && (
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[13px] text-emerald-400 font-medium">
              {isRunning && rumble?.polling
                ? "Agent + Rumble active"
                : isRunning
                ? "Agent running"
                : "Rumble polling"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {rumble?.polling && (
              <button onClick={toggleRumble} disabled={rumbleLoading} className="text-[12px] text-violet-400/70 hover:text-violet-400 transition-colors disabled:opacity-40">
                Stop Rumble
              </button>
            )}
            {isRunning && (
              <button onClick={toggleAutoRun} className="text-[12px] text-red-400/70 hover:text-red-400 transition-colors">
                Stop Agent
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-all duration-[250ms] hover:border-white/[0.12] hover:bg-white/[0.03]">
          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Events</p>
          <p className="text-xl font-bold font-mono text-white mt-0.5">{s?.total_events_evaluated ?? 0}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.02] px-4 py-3 transition-all duration-[250ms] hover:border-emerald-500/20 hover:bg-emerald-500/[0.04]">
          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Tips Sent</p>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{s?.total_tips_sent ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[#00D4FF]/10 bg-[#00D4FF]/[0.02] px-4 py-3 transition-all duration-[250ms] hover:border-[#00D4FF]/20 hover:bg-[#00D4FF]/[0.04]">
          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Total Tipped</p>
          <p className="text-xl font-bold font-mono text-[#00D4FF] mt-0.5">
            {s?.total_amount_tipped ?? 0} <span className="text-xs text-zinc-600">USDT</span>
          </p>
        </div>
        <div className="rounded-lg border border-amber-500/10 bg-amber-500/[0.02] px-4 py-3 transition-all duration-[250ms] hover:border-amber-500/20 hover:bg-amber-500/[0.04]">
          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Avg Score</p>
          <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">{s?.average_score ?? 0}</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 xl:col-span-9">
          <ActivityPanel />
        </div>
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
