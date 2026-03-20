"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { AgentLogEntry } from "@/lib/types";

/* ─── Types for API responses ─── */
interface WalletData {
  wallet: { address: string; balance: number; currency: string; chain: string };
  budget: {
    spent_this_session: number;
    tips_count: number;
    last_tip_at: number | null;
    remaining: number;
    config: {
      max_per_session: number;
      max_per_tip: number;
      rate_limit_seconds: number;
      split_rules: { creator: number; editor: number; charity: number };
    };
  };
}

interface AgentResponse {
  decision: {
    should_tip: boolean;
    amount: number;
    score: number;
    reasoning: string;
  };
  transactions: Array<{
    tx_hash: string;
    amount: number;
    recipient: string;
  }>;
  error?: string;
}

interface StatsData {
  stats: {
    total_events_evaluated: number;
    total_tips_sent: number;
    total_tips_skipped: number;
    total_amount_tipped: number;
    average_score: number;
    success_rate: number;
    llm_usage_rate: number;
    session_start: number;
  };
  history: Array<{
    id: string;
    decision: {
      should_tip: boolean;
      amount: number;
      score: number;
      reasoning: string;
      event: { type: string; data: Record<string, unknown> };
    };
    usedLLM: boolean;
    timestamp: number;
  }>;
}

const LOG_COLORS: Record<string, string> = {
  sys: "text-zinc-500",
  inf: "text-zinc-400",
  ok: "text-emerald-400",
  evt: "text-violet-400",
  llm: "text-amber-400/70",
  act: "text-[#00D4FF]",
  wrn: "text-amber-400",
  err: "text-red-400",
};

const EVENT_LABELS: Record<string, string> = {
  viewer_spike: "Viewer Spike",
  new_subscriber: "New Sub",
  donation: "Donation",
  milestone: "Milestone",
  sentiment_shift: "Sentiment",
};

export default function Dashboard() {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastResponse, setLastResponse] = useState<AgentResponse | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [activeTab, setActiveTab] = useState<"log" | "history">("log");
  const [editingSplit, setEditingSplit] = useState(false);
  const [splitValues, setSplitValues] = useState({ creator: 80, editor: 10, charity: 10 });
  const [walletError, setWalletError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch wallet state
  const fetchWallet = useCallback(async () => {
    try {
      setWalletError(null);
      const res = await fetch("/api/wallet");
      if (!res.ok) {
        const err = await res.json();
        setWalletError(err.error ?? "Failed to connect wallet");
        return;
      }
      const data = await res.json();
      setWallet(data);
      if (data.budget?.config?.split_rules) {
        setSplitValues({
          creator: Math.round(data.budget.config.split_rules.creator * 100),
          editor: Math.round(data.budget.config.split_rules.editor * 100),
          charity: Math.round(data.budget.config.split_rules.charity * 100),
        });
      }
    } catch {
      setWalletError("Network error");
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
    } catch {
      // Stats are non-critical — silently retry on next cycle
    }
  }, []);

  // Connect to SSE stream
  useEffect(() => {
    const eventSource = new EventSource("/api/events");
    eventSource.onmessage = (e) => {
      try {
        const entry: AgentLogEntry = JSON.parse(e.data);
        setLogs((prev) => {
          if (prev.length >= 200) {
            const next = prev.slice(-149);
            next.push(entry);
            return next;
          }
          return [...prev, entry];
        });
      } catch {
        // Ignore malformed SSE data
      }
    };
    eventSource.onerror = () => {
      // Browser auto-reconnects EventSource
    };
    return () => eventSource.close();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === "log") {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, activeTab]);

  // Fetch wallet + stats on mount
  useEffect(() => {
    fetchWallet();
    fetchStats();
  }, [fetchWallet, fetchStats]);

  // Trigger single event
  const triggerEvent = async () => {
    try {
      const res = await fetch("/api/agent");
      const data: AgentResponse = await res.json();
      setLastResponse(data);
      fetchWallet();
      fetchStats();
    } catch {}
  };

  // Auto-run
  const toggleAutoRun = () => {
    if (isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunning(false);
    } else {
      setIsRunning(true);
      triggerEvent();
      intervalRef.current = setInterval(triggerEvent, 5000);
    }
  };

  // Reset budget
  const resetBudget = async () => {
    await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_budget" }),
    });
    fetchWallet();
    fetchStats();
  };

  // Save split config
  const saveSplit = async () => {
    const total = splitValues.creator + splitValues.editor + splitValues.charity;
    if (total !== 100) return;
    await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budget_config: {
          split_rules: {
            creator: splitValues.creator / 100,
            editor: splitValues.editor / 100,
            charity: splitValues.charity / 100,
          },
        },
      }),
    });
    setEditingSplit(false);
    fetchWallet();
  };

  // Export logs
  const exportLogs = () => {
    const content = logs.map((l) => `[${new Date(l.timestamp).toISOString()}] [${l.type}] ${l.message}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rumble-agent-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const budget = wallet?.budget;
  const spent = budget?.spent_this_session ?? 0;
  const maxSession = budget?.config.max_per_session ?? 50;
  const spentPercent = maxSession > 0 ? (spent / maxSession) * 100 : 0;
  const splitTotal = splitValues.creator + splitValues.editor + splitValues.charity;
  const s = stats?.stats;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.04] bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="font-[family-name:var(--font-heading)] font-bold text-[15px] tracking-[-0.02em] text-zinc-400 hover:text-white transition-colors">
              Rumble Pulse
            </a>
            <span className="text-zinc-700">/</span>
            <span className="font-[family-name:var(--font-heading)] font-bold text-[15px] tracking-[-0.02em]">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
              <span className="font-[family-name:var(--font-jetbrains)] text-[11px] text-zinc-500">
                {isRunning ? "Agent running" : "Agent idle"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Onboarding Banner */}
        {showOnboarding && (
          <div className="relative mb-6 rounded-xl border border-[#00D4FF]/20 bg-[#00D4FF]/[0.03] p-5">
            <button
              onClick={() => setShowOnboarding(false)}
              className="absolute top-3 right-3 text-zinc-600 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="w-9 h-9 rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/10 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-heading)] font-bold text-sm text-white mb-1.5">How this works</h3>
                <p className="text-[13px] text-zinc-400 leading-relaxed max-w-2xl">
                  Your agent evaluates stream events using Claude AI, scores them 0-1, and executes USDT tips onchain via Tether WDK.
                  Click <span className="text-emerald-400 font-medium">Start Agent</span> to auto-evaluate events every 5 seconds,
                  or <span className="text-zinc-300 font-medium">Trigger Event</span> to test with a single mock event.
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 font-[family-name:var(--font-jetbrains)] text-[11px] text-zinc-600">
                  <span>Event → Claude Brain → Budget Check → WDK Tip</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={toggleAutoRun}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isRunning
                ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
            }`}
          >
            {isRunning ? "Stop Agent" : "Start Agent"}
          </button>
          <button
            onClick={triggerEvent}
            disabled={isRunning}
            className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Trigger Event
          </button>
          <button
            onClick={resetBudget}
            className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white transition-all"
          >
            Reset Budget
          </button>
          <div className="ml-auto">
            <button
              onClick={exportLogs}
              disabled={logs.length === 0}
              className="px-3 py-2 text-[11px] font-medium rounded-lg text-zinc-500 border border-white/[0.06] hover:border-white/10 hover:text-zinc-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export Logs
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {s && s.total_events_evaluated > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Events</p>
              <p className="text-lg font-bold font-[family-name:var(--font-jetbrains)] text-white mt-0.5">{s.total_events_evaluated}</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Tips Sent</p>
              <p className="text-lg font-bold font-[family-name:var(--font-jetbrains)] text-emerald-400 mt-0.5">{s.total_tips_sent}</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Total Tipped</p>
              <p className="text-lg font-bold font-[family-name:var(--font-jetbrains)] text-[#00D4FF] mt-0.5">{s.total_amount_tipped} <span className="text-xs text-zinc-500">USDT</span></p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Avg Score</p>
              <p className="text-lg font-bold font-[family-name:var(--font-jetbrains)] text-amber-400 mt-0.5">{s.average_score}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column — Wallet + Budget + Split + Decision */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* Wallet */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-3">Wallet</p>
              {walletError ? (
                <div className="font-[family-name:var(--font-jetbrains)] text-[12px] text-red-400">
                  {walletError}
                  <button onClick={fetchWallet} className="block mt-2 text-zinc-500 hover:text-white underline">
                    Retry
                  </button>
                </div>
              ) : wallet ? (
                <div className="font-[family-name:var(--font-jetbrains)]">
                  <div className="text-2xl font-bold text-white">
                    {wallet.wallet.balance.toFixed(2)} <span className="text-sm text-zinc-500">{wallet.wallet.currency}</span>
                  </div>
                  <div className="text-[11px] text-zinc-600 mt-1 truncate" title={wallet.wallet.address}>
                    {wallet.wallet.address}
                  </div>
                  <div className="text-[11px] text-zinc-600 mt-0.5">
                    {wallet.wallet.chain}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 animate-pulse">
                  <div className="h-7 w-32 rounded bg-white/[0.04]" />
                  <div className="h-3 w-48 rounded bg-white/[0.04]" />
                </div>
              )}
            </div>

            {/* Budget */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-3">Session Budget</p>
              <div className="font-[family-name:var(--font-jetbrains)]">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">{spent.toFixed(2)} / {maxSession} USDT</span>
                  <span className="text-zinc-600">{spentPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      spentPercent > 80 ? "bg-red-500" : spentPercent > 50 ? "bg-amber-500" : "bg-[#00D4FF]"
                    }`}
                    style={{ width: `${Math.min(spentPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-zinc-600 mt-2">
                  <span>{budget?.tips_count ?? 0} tips sent</span>
                  <span>{budget?.remaining.toFixed(2) ?? "—"} remaining</span>
                </div>
              </div>
            </div>

            {/* Split Config (editable) */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Split Rules</p>
                {!editingSplit ? (
                  <button
                    onClick={() => setEditingSplit(true)}
                    className="text-[10px] text-zinc-600 hover:text-[#00D4FF] transition-colors"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingSplit(false)}
                      className="text-[10px] text-zinc-600 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveSplit}
                      disabled={splitTotal !== 100}
                      className="text-[10px] text-[#00D4FF] hover:text-white transition-colors disabled:text-red-400"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              {editingSplit ? (
                <div className="space-y-3 font-[family-name:var(--font-jetbrains)] text-[12px]">
                  {(["creator", "editor", "charity"] as const).map((key) => (
                    <div key={key}>
                      <div className="flex justify-between mb-1">
                        <span className="text-zinc-400 capitalize">{key === "charity" ? "Community" : key}</span>
                        <span className="text-white">{splitValues[key]}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={splitValues[key]}
                        onChange={(e) => setSplitValues((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                        className="w-full h-1 rounded-full appearance-none bg-white/[0.08] accent-[#00D4FF] cursor-pointer"
                      />
                    </div>
                  ))}
                  {splitTotal !== 100 && (
                    <p className="text-red-400 text-[10px]">Total must equal 100% (currently {splitTotal}%)</p>
                  )}
                  {/* Visual split bar */}
                  <div className="flex h-2 rounded-full overflow-hidden mt-1">
                    <div className="bg-[#00D4FF]" style={{ width: `${splitValues.creator}%` }} />
                    <div className="bg-violet-500" style={{ width: `${splitValues.editor}%` }} />
                    <div className="bg-emerald-500" style={{ width: `${splitValues.charity}%` }} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 font-[family-name:var(--font-jetbrains)] text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Creator</span>
                    <span className="text-white">{((budget?.config.split_rules.creator ?? 0.8) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Editor</span>
                    <span className="text-white">{((budget?.config.split_rules.editor ?? 0.1) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Community Pool</span>
                    <span className="text-white">{((budget?.config.split_rules.charity ?? 0.1) * 100).toFixed(0)}%</span>
                  </div>
                  {/* Visual split bar */}
                  <div className="flex h-2 rounded-full overflow-hidden mt-1">
                    <div className="bg-[#00D4FF]" style={{ width: `${(budget?.config.split_rules.creator ?? 0.8) * 100}%` }} />
                    <div className="bg-violet-500" style={{ width: `${(budget?.config.split_rules.editor ?? 0.1) * 100}%` }} />
                    <div className="bg-emerald-500" style={{ width: `${(budget?.config.split_rules.charity ?? 0.1) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Last Decision */}
            {lastResponse?.decision && (
              <div className={`rounded-xl border p-5 ${
                lastResponse.decision.should_tip
                  ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                  : "border-white/[0.06] bg-white/[0.02]"
              }`}>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-3">Last Decision</p>
                <div className="font-[family-name:var(--font-jetbrains)] text-[12px] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Action</span>
                    <span className={lastResponse.decision.should_tip ? "text-emerald-400" : "text-zinc-500"}>
                      {lastResponse.decision.should_tip ? `Tipped ${lastResponse.decision.amount} USDT` : "Skipped"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            lastResponse.decision.score >= 0.7 ? "bg-emerald-400" : lastResponse.decision.score >= 0.4 ? "bg-amber-400" : "bg-zinc-500"
                          }`}
                          style={{ width: `${lastResponse.decision.score * 100}%` }}
                        />
                      </div>
                      <span className="text-white">{lastResponse.decision.score}</span>
                    </div>
                  </div>
                  <p className="text-zinc-500 text-[11px] mt-2 leading-relaxed">
                    {lastResponse.decision.reasoning}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right column — Agent Log + History */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden flex flex-col" style={{ minHeight: "600px" }}>
              {/* Tab bar */}
              <div className="flex items-center border-b border-white/[0.04] shrink-0">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab("log")}
                    className={`px-5 py-3 text-[12px] font-medium transition-colors border-b-2 ${
                      activeTab === "log" ? "text-white border-[#00D4FF]" : "text-zinc-500 border-transparent hover:text-zinc-300"
                    }`}
                  >
                    Agent Log
                  </button>
                  <button
                    onClick={() => { setActiveTab("history"); fetchStats(); }}
                    className={`px-5 py-3 text-[12px] font-medium transition-colors border-b-2 ${
                      activeTab === "history" ? "text-white border-[#00D4FF]" : "text-zinc-500 border-transparent hover:text-zinc-300"
                    }`}
                  >
                    Decision History
                    {s && s.total_events_evaluated > 0 && (
                      <span className="ml-2 text-[10px] text-zinc-600">({s.total_events_evaluated})</span>
                    )}
                  </button>
                </div>
                <div className="ml-auto flex items-center gap-2 pr-5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[11px] text-zinc-600">
                    {activeTab === "log" ? `${logs.length} entries` : `${stats?.history.length ?? 0} decisions`}
                  </span>
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto max-h-[700px]">
                {activeTab === "log" ? (
                  <div className="p-5">
                    {logs.length === 0 ? (
                      <div className="text-zinc-600 font-[family-name:var(--font-jetbrains)] text-[13px] flex flex-col items-center justify-center py-20">
                        <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-zinc-600 mb-4 opacity-40" />
                        <p><span className="text-zinc-700">&gt;</span> Waiting for events...</p>
                        <p className="text-zinc-700 text-[11px] mt-1">Click &quot;Start Agent&quot; or &quot;Trigger Event&quot;</p>
                      </div>
                    ) : (
                      <div className="font-[family-name:var(--font-jetbrains)] text-[13px] leading-6 space-y-0">
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
                ) : (
                  <div className="p-5">
                    {!stats?.history.length ? (
                      <div className="text-zinc-600 font-[family-name:var(--font-jetbrains)] text-[13px] flex flex-col items-center justify-center py-20">
                        <p>No decisions recorded yet</p>
                        <p className="text-zinc-700 text-[11px] mt-1">Trigger some events to see the history</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {stats.history.map((record) => (
                          <div
                            key={record.id}
                            className={`rounded-lg border p-4 font-[family-name:var(--font-jetbrains)] text-[12px] ${
                              record.decision.should_tip
                                ? "border-emerald-500/10 bg-emerald-500/[0.02]"
                                : "border-white/[0.04] bg-white/[0.01]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                                  record.decision.should_tip
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-zinc-800 text-zinc-500"
                                }`}>
                                  {record.decision.should_tip ? `+${record.decision.amount} USDT` : "SKIP"}
                                </span>
                                <span className="text-zinc-600 text-[10px]">
                                  {EVENT_LABELS[record.decision.event.type] ?? record.decision.event.type}
                                </span>
                                {record.usedLLM && (
                                  <span className="text-amber-400/60 text-[9px]">LLM</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      record.decision.score >= 0.7 ? "bg-emerald-400" : record.decision.score >= 0.4 ? "bg-amber-400" : "bg-zinc-500"
                                    }`}
                                    style={{ width: `${record.decision.score * 100}%` }}
                                  />
                                </div>
                                <span className="text-zinc-500 text-[11px] w-6 text-right">{record.decision.score}</span>
                                <span className="text-zinc-700 text-[10px]">
                                  {new Date(record.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                                </span>
                              </div>
                            </div>
                            <p className="text-zinc-500 text-[11px] mt-2 leading-relaxed">
                              {record.decision.reasoning}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
