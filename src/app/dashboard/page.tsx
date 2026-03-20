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

export default function Dashboard() {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastResponse, setLastResponse] = useState<AgentResponse | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch wallet state
  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet");
      const data = await res.json();
      setWallet(data);
    } catch {}
  }, []);

  // Connect to SSE stream
  useEffect(() => {
    const eventSource = new EventSource("/api/events");
    eventSource.onmessage = (e) => {
      const entry: AgentLogEntry = JSON.parse(e.data);
      setLogs((prev) => [...prev.slice(-99), entry]);
    };
    return () => eventSource.close();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Fetch wallet on mount
  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Trigger single event
  const triggerEvent = async () => {
    try {
      const res = await fetch("/api/agent");
      const data: AgentResponse = await res.json();
      setLastResponse(data);
      fetchWallet();
    } catch {}
  };

  // Auto-run: trigger events on interval
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

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.04] bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="font-[family-name:var(--font-heading)] font-bold text-[15px] tracking-[-0.02em] text-zinc-400 hover:text-white transition-colors">
              Rumble Pulse
            </a>
            <span className="text-zinc-700">/</span>
            <span className="font-[family-name:var(--font-heading)] font-bold text-[15px] tracking-[-0.02em]">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
            <span className="font-[family-name:var(--font-jetbrains)] text-[11px] text-zinc-500">
              {isRunning ? "Agent running" : "Agent idle"}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-8">
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
            className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white transition-all"
          >
            Trigger Event
          </button>
          <button
            onClick={resetBudget}
            className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white transition-all"
          >
            Reset Budget
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Stats */}
          <div className="space-y-4">
            {/* Wallet */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-3">Wallet</p>
              <div className="font-[family-name:var(--font-jetbrains)]">
                <div className="text-2xl font-bold text-white">
                  {wallet?.wallet.balance.toFixed(2) ?? "—"} <span className="text-sm text-zinc-500">USDT</span>
                </div>
                <div className="text-[11px] text-zinc-600 mt-1 truncate">
                  {wallet?.wallet.address ?? "Not connected"}
                </div>
                <div className="text-[11px] text-zinc-600 mt-0.5">
                  {wallet?.wallet.chain ?? ""}
                </div>
              </div>
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

            {/* Split Config */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-3">Split Rules</p>
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
              </div>
            </div>

            {/* Last Decision */}
            {lastResponse?.decision && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
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
                    <span className="text-white">{lastResponse.decision.score}</span>
                  </div>
                  <p className="text-zinc-500 text-[11px] mt-2 leading-relaxed">
                    {lastResponse.decision.reasoning}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right column — Agent Log (2 cols wide) */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden h-full flex flex-col">
              {/* Terminal chrome */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.04] shrink-0">
                <div className="flex gap-1.5" aria-hidden="true">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                </div>
                <span className="ml-3 font-[family-name:var(--font-jetbrains)] text-[11px] text-zinc-600">
                  rumble-pulse-agent — live
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[11px] text-zinc-600">
                    {logs.length} entries
                  </span>
                </div>
              </div>
              {/* Log content */}
              <div className="p-5 overflow-y-auto flex-1 min-h-[500px] max-h-[700px]">
                {logs.length === 0 ? (
                  <div className="text-zinc-600 font-[family-name:var(--font-jetbrains)] text-[13px]">
                    <span className="text-zinc-700">&gt;</span> Waiting for events... Click &quot;Start Agent&quot; or &quot;Trigger Event&quot;
                  </div>
                ) : (
                  <div className="font-[family-name:var(--font-jetbrains)] text-[13px] leading-6 space-y-0">
                    {logs.map((log) => (
                      <div key={log.id} className={`flex gap-3 ${LOG_COLORS[log.type] || "text-zinc-500"}`}>
                        <span className="text-zinc-700 shrink-0 select-none text-[11px] mt-[2px]">
                          {new Date(log.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                        </span>
                        <span className="min-w-0 break-words">{log.message}</span>
                      </div>
                    ))}
                    <div ref={logEndRef} />
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
