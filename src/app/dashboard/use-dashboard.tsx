"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import type { AgentLogEntry } from "@/lib/types";
import type { WalletData, StatsData, RumbleStatus } from "./types";
import { isValidAddress } from "./types";

function useDashboardState() {
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
  const triggerRef = useRef<() => void>(() => {});

  /* ─── Data fetching ─── */
  const fetchWallet = useCallback(async () => {
    try {
      setWalletError(null);
      const res = await fetch("/api/wallet", { cache: "no-store" });
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
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (!res.ok) return;
      setStats(await res.json());
    } catch { /* non-critical */ }
  }, []);

  const fetchRumbleStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/rumble", { cache: "no-store" });
      if (res.ok) setRumble(await res.json());
    } catch { /* non-critical */ }
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
      } catch { /* ignore */ }
    };
    es.onerror = () => {};
    return () => es.close();
  }, []);

  /* ─── Auto-scroll (log tab only) ─── */
  useEffect(() => {
    const c = logContainerRef.current;
    if (activeTab === "log" && !userScrolledRef.current && c) {
      c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
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
    const id = setInterval(() => { fetchStats(); fetchWallet(); }, 5000);
    return () => clearInterval(id);
  }, [isRunning, rumble?.polling, fetchStats, fetchWallet]);

  /* ─── Actions ─── */
  const addLog = useCallback((type: AgentLogEntry["type"], message: string) => {
    const entry = {
      id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      type,
      message,
    };
    setLogs((prev) => (prev.length >= 200 ? [...prev.slice(-149), entry] : [...prev, entry]));
  }, []);

  const triggerEvent = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setTriggerLoading(true);
    setActionError(null);
    addLog("sys", "Triggering agent evaluation...");

    // Progress messages while waiting for response
    const progressTimers = [
      setTimeout(() => addLog("inf", "Evaluating event with AI..."), 2000),
      setTimeout(() => addLog("inf", "Waiting for on-chain confirmation..."), 8000),
      setTimeout(() => addLog("inf", "Still confirming on Sepolia (this is normal)..."), 25000),
    ];
    const clearProgress = () => progressTimers.forEach(clearTimeout);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ execute: true, creator_address: creatorAddress || undefined }),
        signal: AbortSignal.timeout(90000),
      });
      clearProgress();
      if (!res.ok) {
        const err = await res.json();
        setActionError(err.error ?? "Agent request failed");
        addLog("err", err.error ?? "Agent request failed");
        return;
      }
      const data = await res.json();

      // Inject log entries from response (SSE may not work on serverless)
      if (data.decision) {
        const d = data.decision;
        const usedLLM = Boolean(d.reasoning && !d.reasoning.startsWith("["));
        addLog("evt", `Event: ${d.event?.type ?? "unknown"} — ${JSON.stringify(d.event?.data ?? {})}`);
        addLog("llm", usedLLM ? "Evaluated with Groq LLM" : "Rule-based scoring");
        if (d.should_tip) {
          addLog("act", `→ Tip ${d.amount} USDT | ${d.reasoning}`);
          const tx = data.transactions?.[0];
          if (tx?.success && tx.tx_hash) {
            addLog("ok", `TX confirmed: ${tx.tx_hash}`);
          } else if (tx && !tx.success) {
            addLog("err", "TX failed on-chain");
          }
        } else {
          addLog("llm", `Skipped: ${d.reasoning}`);
        }

        // Optimistically inject into Activity + Stats
        const record = {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          decision: d,
          transactions: data.transactions ?? [],
          usedLLM,
          timestamp: Date.now(),
        };
        setStats((prev) => {
          const prevHistory = prev?.history ?? [];
          const prevStats = prev?.stats ?? {
            total_events_evaluated: 0, total_tips_sent: 0, total_tips_skipped: 0,
            total_amount_tipped: 0, average_score: 0, success_rate: 0, llm_usage_rate: 0, session_start: Date.now(),
          };
          const newEval = prevStats.total_events_evaluated + 1;
          const newTips = prevStats.total_tips_sent + (d.should_tip ? 1 : 0);
          const newSkips = prevStats.total_tips_skipped + (d.should_tip ? 0 : 1);
          const newAmount = prevStats.total_amount_tipped + (d.should_tip ? d.amount : 0);
          return {
            stats: {
              ...prevStats,
              total_events_evaluated: newEval,
              total_tips_sent: newTips,
              total_tips_skipped: newSkips,
              total_amount_tipped: Number(newAmount.toFixed(2)),
              average_score: Number(((prevStats.average_score * prevStats.total_events_evaluated + d.score) / newEval).toFixed(2)),
              success_rate: Number(((newTips / newEval) * 100).toFixed(1)),
            },
            history: [record, ...prevHistory],
          };
        });
      }

      if (data.error) {
        addLog("wrn", data.error);
      }

      fetchWallet();
    } catch {
      clearProgress();
      setActionError("Network error — agent unreachable");
      addLog("err", "Network error — agent unreachable");
    } finally {
      inflightRef.current = false;
      setTriggerLoading(false);
    }
  }, [fetchWallet, creatorAddress, addLog]);

  // Keep ref in sync so setInterval always calls latest triggerEvent
  triggerRef.current = triggerEvent;

  const toggleAutoRun = useCallback(() => {
    if (isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunning(false);
    } else {
      setIsRunning(true);
      triggerRef.current();
      intervalRef.current = setInterval(() => triggerRef.current(), 5000);
    }
  }, [isRunning]);

  const toggleRumble = useCallback(async () => {
    setRumbleLoading(true);
    setActionError(null);
    try {
      const action = rumble?.polling ? "stop" : "start";
      const res = await fetch("/api/rumble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, execute: true, creator_address: creatorAddress || undefined }),
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
  }, [rumble?.polling, creatorAddress]);

  const resetBudget = useCallback(async () => {
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
      setLogs([]);
      seenIdsRef.current.clear();
      fetchWallet();
      fetchStats();
    } catch {
      setActionError("Network error");
    }
  }, [fetchWallet, fetchStats]);

  const saveCreator = useCallback(async () => {
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
  }, [creatorDraft]);

  const exportLogs = useCallback(() => {
    const content = logs.map((l) => `[${new Date(l.timestamp).toISOString()}] [${l.type}] ${l.message}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rumble-agent-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  /* ─── Cleanup ─── */
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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

  return {
    loaded, logs, wallet, isRunning, stats, activeTab, walletError,
    triggerLoading, actionError, creatorAddress, creatorDraft,
    editingCreator, creatorSaving, rumble, rumbleLoading,
    logEndRef, logContainerRef,
    setActiveTab, setActionError, setCreatorDraft, setEditingCreator,
    fetchWallet, fetchStats, triggerEvent, toggleAutoRun, toggleRumble,
    resetBudget, saveCreator, exportLogs,
    budget, spent, maxSession, spentPercent, s, isSetup, creatorValid, walletReady,
  };
}

/* ─── Context ─── */
type DashboardState = ReturnType<typeof useDashboardState>;
const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const state = useDashboardState();
  return <DashboardContext.Provider value={state}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardState {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
