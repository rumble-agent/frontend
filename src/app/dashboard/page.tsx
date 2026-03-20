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
    };
  };
  creator_address: string;
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

interface RumbleStatus {
  configured: boolean;
  polling: boolean;
  url_set: boolean;
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
  const [loaded, setLoaded] = useState(false);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [activeTab, setActiveTab] = useState<"activity" | "log">("activity");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creatorAddress, setCreatorAddress] = useState("");
  const [creatorDraft, setCreatorDraft] = useState("");
  const [editingCreator, setEditingCreator] = useState(false);
  const [creatorSaving, setCreatorSaving] = useState(false);
  const [rumble, setRumble] = useState<RumbleStatus | null>(null);
  const [rumbleLoading, setRumbleLoading] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inflightRef = useRef(false);
  const seenIdsRef = useRef(new Set<string>());
  const userScrolledRef = useRef(false);

  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

  /* ─── Data fetching ─── */
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
      if (data.creator_address) {
        setCreatorAddress(data.creator_address);
        setCreatorDraft(data.creator_address);
      }
    } catch {
      setWalletError("Network error");
    } finally {
      setLoaded(true);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) return;
      setStats(await res.json());
    } catch {
      /* non-critical */
    }
  }, []);

  const fetchRumbleStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/rumble");
      if (res.ok) setRumble(await res.json());
    } catch {
      /* non-critical */
    }
  }, []);

  /* ─── SSE stream ─── */
  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      try {
        const entry: AgentLogEntry = JSON.parse(e.data);
        if (seenIdsRef.current.has(entry.id)) return;
        seenIdsRef.current.add(entry.id);
        if (seenIdsRef.current.size > 500) {
          seenIdsRef.current = new Set(Array.from(seenIdsRef.current).slice(-300));
        }
        setLogs((prev) => {
          if (prev.length >= 200) {
            const next = prev.slice(-149);
            next.push(entry);
            return next;
          }
          return [...prev, entry];
        });
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {};
    return () => es.close();
  }, []);

  /* ─── Auto-scroll (log tab only) ─── */
  useEffect(() => {
    if (activeTab === "log" && !userScrolledRef.current) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, activeTab]);

  useEffect(() => {
    const c = logContainerRef.current;
    if (!c) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = c;
      userScrolledRef.current = scrollHeight - scrollTop - clientHeight > 80;
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    return () => c.removeEventListener("scroll", onScroll);
  }, []);

  /* ─── Initial fetch ─── */
  useEffect(() => {
    fetchWallet();
    fetchStats();
    fetchRumbleStatus();
  }, [fetchWallet, fetchStats, fetchRumbleStatus]);

  /* ─── Periodic refresh when active ─── */
  useEffect(() => {
    if (!isRunning && !rumble?.polling) return;
    const id = setInterval(() => {
      fetchStats();
      fetchWallet();
    }, 5000);
    return () => clearInterval(id);
  }, [isRunning, rumble?.polling, fetchStats, fetchWallet]);

  /* ─── Actions ─── */
  const triggerEvent = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setTriggerLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ execute: false, creator_address: creatorAddress || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        setActionError(err.error ?? "Agent request failed");
        return;
      }
      await res.json();
      fetchWallet();
      fetchStats();
    } catch {
      setActionError("Network error — agent unreachable");
    } finally {
      inflightRef.current = false;
      setTriggerLoading(false);
    }
  }, [fetchWallet, fetchStats, creatorAddress]);

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

  const toggleRumble = async () => {
    setRumbleLoading(true);
    setActionError(null);
    try {
      const action = rumble?.polling ? "stop" : "start";
      const res = await fetch("/api/rumble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, execute: false, creator_address: creatorAddress || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        setActionError(err.error ?? "Rumble action failed");
        return;
      }
      const data = await res.json();
      setRumble({ configured: data.configured, polling: data.polling, url_set: data.url_set });
    } catch {
      setActionError("Network error");
    } finally {
      setRumbleLoading(false);
    }
  };

  const resetBudget = async () => {
    setActionError(null);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_budget" }),
      });
      if (!res.ok) {
        const err = await res.json();
        setActionError(err.error ?? "Failed to reset budget");
        return;
      }
      fetchWallet();
      fetchStats();
    } catch {
      setActionError("Network error");
    }
  };

  const saveCreator = async () => {
    if (!creatorDraft || !isValidAddress(creatorDraft)) return;
    setCreatorSaving(true);
    setActionError(null);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creator_address: creatorDraft }),
      });
      if (!res.ok) {
        const err = await res.json();
        setActionError(err.error ?? "Failed to save creator address");
        return;
      }
      setCreatorAddress(creatorDraft);
      setEditingCreator(false);
    } catch {
      setActionError("Network error");
    } finally {
      setCreatorSaving(false);
    }
  };

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

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* ─── Derived ─── */
  const budget = wallet?.budget;
  const spent = budget?.spent_this_session ?? 0;
  const maxSession = budget?.config.max_per_session ?? 50;
  const spentPercent = maxSession > 0 ? (spent / maxSession) * 100 : 0;
  const s = stats?.stats;
  const isSetup = !creatorAddress;
  const creatorValid = Boolean(creatorDraft && isValidAddress(creatorDraft));
  const walletReady = Boolean(wallet && !walletError);

  /* ─── Loading ─── */
  if (!loaded) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* ── Header ── */}
      <header className="border-b border-white/[0.04] bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="font-[family-name:var(--font-heading)] font-bold text-[15px] tracking-[-0.02em] text-zinc-400 hover:text-white transition-colors">
              Rumble Pulse
            </a>
            <span className="text-zinc-700">/</span>
            <span className="font-[family-name:var(--font-heading)] font-bold text-[15px] tracking-[-0.02em]">
              {isSetup ? "Setup" : "Dashboard"}
            </span>
          </div>
          {!isSetup && (
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${
                isRunning || rumble?.polling ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"
              }`} />
              <span className="font-[family-name:var(--font-jetbrains)] text-[11px] text-zinc-500">
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

      {/* ── Error banner ── */}
      {actionError && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
          <div className="px-4 py-2.5 rounded-lg border border-red-500/20 bg-red-500/[0.05] text-red-400 text-[13px] font-[family-name:var(--font-jetbrains)] flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-400/60 hover:text-red-400 ml-4 shrink-0">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          </div>
        </div>
      )}

      {isSetup ? (
        /* ═══════════════════════════════════════
           SETUP MODE
           ═══════════════════════════════════════ */
        <div className="max-w-lg mx-auto px-6 py-16 sm:py-24">
          {/* Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-[11px] text-zinc-500 font-[family-name:var(--font-jetbrains)] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]" />
              Powered by Tether WDK
            </div>
            <h1 className="font-[family-name:var(--font-heading)] text-[28px] font-bold tracking-[-0.02em] mb-2">
              Set up your tipping agent
            </h1>
            <p className="text-zinc-500 text-[14px]">
              Configure the agent, then launch the dashboard.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {/* Step 1 — Wallet */}
            <div className={`rounded-xl border p-5 transition-colors ${
              walletError
                ? "border-red-500/20 bg-red-500/[0.02]"
                : walletReady
                ? "border-emerald-500/20 bg-emerald-500/[0.02]"
                : "border-white/[0.06] bg-white/[0.02]"
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  walletError
                    ? "bg-red-500/20 text-red-400"
                    : walletReady
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/[0.06] text-zinc-500"
                }`}>
                  {walletError ? "!" : walletReady ? "✓" : "1"}
                </div>
                <h2 className="text-[14px] font-semibold">Agent Wallet</h2>
              </div>
              <div className="ml-9 font-[family-name:var(--font-jetbrains)] text-[12px]">
                {walletError ? (
                  <div>
                    <p className="text-red-400">{walletError}</p>
                    <button onClick={fetchWallet} className="text-zinc-500 hover:text-white text-[11px] underline mt-1">Retry</button>
                  </div>
                ) : wallet ? (
                  <div>
                    <p className="text-white">
                      {wallet.wallet.balance.toFixed(2)} <span className="text-zinc-500">{wallet.wallet.currency}</span>
                    </p>
                    <p className="text-zinc-600 truncate mt-0.5" title={wallet.wallet.address}>{wallet.wallet.address}</p>
                    <p className="text-zinc-700 mt-0.5">{wallet.wallet.chain}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-zinc-600">
                    <div className="w-3 h-3 border border-zinc-700 border-t-zinc-500 rounded-full animate-spin" />
                    Connecting...
                  </div>
                )}
              </div>
            </div>

            {/* Step 2 — Creator Wallet */}
            <div className={`rounded-xl border p-5 transition-colors ${
              creatorValid
                ? "border-emerald-500/20 bg-emerald-500/[0.02]"
                : "border-[#00D4FF]/20 bg-[#00D4FF]/[0.02]"
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  creatorValid
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-[#00D4FF]/20 text-[#00D4FF]"
                }`}>
                  {creatorValid ? "✓" : "2"}
                </div>
                <h2 className="text-[14px] font-semibold">Creator Wallet</h2>
              </div>
              <div className="ml-9">
                <p className="text-zinc-500 text-[12px] mb-2">Who should receive the tips?</p>
                <input
                  type="text"
                  placeholder="0x..."
                  value={creatorDraft}
                  onChange={(e) => setCreatorDraft(e.target.value)}
                  className={`w-full bg-white/[0.04] border rounded-lg px-3 py-2.5 text-[13px] font-[family-name:var(--font-jetbrains)] text-white placeholder-zinc-700 outline-none focus:border-[#00D4FF]/40 transition-colors ${
                    creatorDraft && !isValidAddress(creatorDraft)
                      ? "border-red-500/30"
                      : "border-white/[0.08]"
                  }`}
                />
                {creatorDraft && !isValidAddress(creatorDraft) && (
                  <p className="text-red-400 text-[10px] mt-1.5 font-[family-name:var(--font-jetbrains)]">Invalid Ethereum address</p>
                )}
              </div>
            </div>

            {/* Step 3 — Budget */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[11px] font-bold text-zinc-500">3</div>
                <h2 className="text-[14px] font-semibold text-zinc-400">Budget & Limits</h2>
              </div>
              <div className="ml-9 font-[family-name:var(--font-jetbrains)] text-[12px]">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-zinc-500">
                  <span>{maxSession} USDT/session</span>
                  <span>{budget?.config.max_per_tip ?? 5} USDT/tip</span>
                  <span>{budget?.config.rate_limit_seconds ?? 30}s cooldown</span>
                </div>
                <p className="text-zinc-700 text-[11px] mt-1.5">Safe defaults — adjustable from the dashboard.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={saveCreator}
            disabled={!creatorValid || creatorSaving}
            className="w-full mt-8 py-3 rounded-xl bg-white text-[#050505] font-semibold text-[14px] hover:bg-zinc-200 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            {creatorSaving ? "Saving..." : "Continue to Dashboard"}
          </button>
          <p className="text-center text-zinc-700 text-[11px] mt-3 font-[family-name:var(--font-jetbrains)]">
            You can change all settings from the dashboard later.
          </p>
        </div>
      ) : (
        /* ═══════════════════════════════════════
           DASHBOARD MODE
           ═══════════════════════════════════════ */
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
                    className="px-4 py-2 text-[13px] font-medium rounded-lg text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white transition-all disabled:opacity-40"
                  >
                    {triggerLoading ? "Testing..." : "Test Event"}
                  </button>
                  <button
                    onClick={toggleAutoRun}
                    className="px-5 py-2 text-[13px] font-medium rounded-lg bg-white text-[#050505] hover:bg-zinc-200 transition-colors"
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
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Events</p>
              <p className="text-xl font-bold font-[family-name:var(--font-jetbrains)] text-white mt-0.5">{s?.total_events_evaluated ?? 0}</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Tips Sent</p>
              <p className="text-xl font-bold font-[family-name:var(--font-jetbrains)] text-emerald-400 mt-0.5">{s?.total_tips_sent ?? 0}</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Total Tipped</p>
              <p className="text-xl font-bold font-[family-name:var(--font-jetbrains)] text-[#00D4FF] mt-0.5">
                {s?.total_amount_tipped ?? 0} <span className="text-xs text-zinc-600">USDT</span>
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Avg Score</p>
              <p className="text-xl font-bold font-[family-name:var(--font-jetbrains)] text-amber-400 mt-0.5">{s?.average_score ?? 0}</p>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ── Activity Feed (left) ── */}
            <div className="lg:col-span-8 xl:col-span-9">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden flex flex-col" style={{ minHeight: "500px" }}>
                {/* Tab bar */}
                <div className="flex items-center border-b border-white/[0.04] shrink-0">
                  <div className="flex">
                    <button
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
                    <div className="p-5">
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
                          {[...stats.history].reverse().map((record) => (
                            <div
                              key={record.id}
                              className={`rounded-lg border-l-2 p-4 ${
                                record.decision.should_tip
                                  ? "border-l-emerald-500 bg-emerald-500/[0.02] border-y border-r border-emerald-500/10"
                                  : "border-l-zinc-700 bg-white/[0.01] border-y border-r border-white/[0.04]"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium font-[family-name:var(--font-jetbrains)] ${
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
                                    <span className="text-amber-400/50 text-[9px] uppercase tracking-wider font-[family-name:var(--font-jetbrains)]">LLM</span>
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
                                    <span className="text-zinc-500 text-[11px] font-[family-name:var(--font-jetbrains)]">{record.decision.score}</span>
                                  </div>
                                  <span className="text-zinc-700 text-[10px] font-[family-name:var(--font-jetbrains)]">
                                    {new Date(record.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                                  </span>
                                </div>
                              </div>
                              <p className="text-zinc-500 text-[11px] leading-relaxed font-[family-name:var(--font-jetbrains)]">
                                {record.decision.reasoning}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-5">
                      {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-zinc-600 font-[family-name:var(--font-jetbrains)] text-[13px]">
                          <p><span className="text-zinc-700">&gt;</span> Waiting for events...</p>
                          <p className="text-zinc-700 text-[11px] mt-1">Start the agent to see log output.</p>
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
                  )}
                </div>
              </div>
            </div>

            {/* ── Sidebar (right) ── */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-4">
              {/* Controls */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-3">Controls</p>
                <div className="space-y-2">
                  <button
                    onClick={toggleAutoRun}
                    className={`w-full px-4 py-2.5 text-[13px] font-medium rounded-lg transition-colors ${
                      isRunning
                        ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    }`}
                  >
                    {isRunning ? "Stop Agent" : "Start Agent"}
                  </button>
                  {rumble?.configured && (
                    <button
                      onClick={toggleRumble}
                      disabled={rumbleLoading}
                      className={`w-full px-4 py-2.5 text-[13px] font-medium rounded-lg transition-colors disabled:opacity-40 ${
                        rumble.polling
                          ? "bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20"
                          : "text-violet-400/60 border border-violet-500/10 hover:border-violet-500/20 hover:text-violet-400"
                      }`}
                    >
                      {rumbleLoading ? "..." : rumble.polling ? "Stop Rumble" : "Start Rumble"}
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={triggerEvent}
                      disabled={isRunning || triggerLoading}
                      className="flex-1 px-3 py-2 text-[12px] font-medium rounded-lg text-zinc-400 border border-white/[0.06] hover:border-white/10 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {triggerLoading ? "..." : "Test Event"}
                    </button>
                    <button
                      onClick={resetBudget}
                      className="flex-1 px-3 py-2 text-[12px] font-medium rounded-lg text-zinc-400 border border-white/[0.06] hover:border-white/10 hover:text-white transition-all"
                    >
                      Reset Budget
                    </button>
                  </div>
                </div>
              </div>

              {/* Wallet */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-3">Wallet</p>
                {walletError ? (
                  <div className="font-[family-name:var(--font-jetbrains)] text-[12px] text-red-400">
                    {walletError}
                    <button onClick={fetchWallet} className="block mt-2 text-zinc-500 hover:text-white underline">Retry</button>
                  </div>
                ) : wallet ? (
                  <div className="font-[family-name:var(--font-jetbrains)]">
                    <div className="text-xl font-bold text-white">
                      {wallet.wallet.balance.toFixed(2)} <span className="text-sm text-zinc-500">{wallet.wallet.currency}</span>
                    </div>
                    <div className="text-[11px] text-zinc-600 mt-1 truncate" title={wallet.wallet.address}>{wallet.wallet.address}</div>
                    <div className="text-[11px] text-zinc-700 mt-0.5">{wallet.wallet.chain}</div>
                  </div>
                ) : (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-6 w-28 rounded bg-white/[0.04]" />
                    <div className="h-3 w-48 rounded bg-white/[0.04]" />
                  </div>
                )}
              </div>

              {/* Creator */}
              <div className={`rounded-xl border p-5 ${
                creatorAddress && isValidAddress(creatorAddress)
                  ? "border-[#00D4FF]/20 bg-[#00D4FF]/[0.02]"
                  : "border-amber-500/20 bg-amber-500/[0.02]"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Creator</p>
                  {!editingCreator ? (
                    <button
                      onClick={() => { setCreatorDraft(creatorAddress); setEditingCreator(true); }}
                      className="text-[10px] text-zinc-600 hover:text-[#00D4FF] transition-colors"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setEditingCreator(false)} className="text-[10px] text-zinc-600 hover:text-white transition-colors">Cancel</button>
                      <button
                        onClick={saveCreator}
                        disabled={creatorSaving || !creatorDraft || !isValidAddress(creatorDraft)}
                        className="text-[10px] text-[#00D4FF] hover:text-white transition-colors disabled:text-zinc-700"
                      >
                        {creatorSaving ? "..." : "Save"}
                      </button>
                    </div>
                  )}
                </div>
                {editingCreator ? (
                  <div className="font-[family-name:var(--font-jetbrains)] text-[12px]">
                    <input
                      type="text"
                      placeholder="0x..."
                      value={creatorDraft}
                      onChange={(e) => setCreatorDraft(e.target.value)}
                      className={`w-full bg-white/[0.04] border rounded-lg px-3 py-2 text-[11px] text-white placeholder-zinc-700 outline-none focus:border-[#00D4FF]/40 transition-colors ${
                        creatorDraft && !isValidAddress(creatorDraft) ? "border-red-500/30" : "border-white/[0.08]"
                      }`}
                    />
                    {creatorDraft && !isValidAddress(creatorDraft) && (
                      <p className="text-red-400 text-[10px] mt-1">Invalid address</p>
                    )}
                  </div>
                ) : (
                  <div className="font-[family-name:var(--font-jetbrains)] text-[12px]">
                    <div className="text-[#00D4FF] truncate" title={creatorAddress}>{creatorAddress}</div>
                    <p className="text-zinc-600 text-[11px] mt-1">Tips go to this address</p>
                  </div>
                )}
              </div>

              {/* Budget */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-3">Budget</p>
                <div className="font-[family-name:var(--font-jetbrains)]">
                  <div className="flex justify-between text-[13px] mb-2">
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
                    <span>{budget?.tips_count ?? 0} tips</span>
                    <span>{budget?.remaining?.toFixed(2) ?? "—"} left</span>
                  </div>
                </div>
              </div>

              {/* Rumble */}
              {rumble && (
                <div className={`rounded-xl border p-5 ${
                  rumble.polling ? "border-violet-500/20 bg-violet-500/[0.03]" : "border-white/[0.06] bg-white/[0.02]"
                }`}>
                  <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-3">Rumble</p>
                  <div className="font-[family-name:var(--font-jetbrains)] text-[12px]">
                    {rumble.configured ? (
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${rumble.polling ? "bg-violet-400 animate-pulse" : "bg-zinc-600"}`} />
                        <span className={rumble.polling ? "text-violet-400" : "text-zinc-500"}>
                          {rumble.polling ? "Polling live stream" : "Ready to connect"}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="text-amber-400/80">Not configured</span>
                        </div>
                        <p className="text-zinc-700 text-[11px] mt-1.5">Set RUMBLE_API_URL in .env.local</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
