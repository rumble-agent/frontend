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
    } catch { /* non-critical */ }
  }, []);

  const fetchRumbleStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/rumble");
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
    const id = setInterval(() => { fetchStats(); fetchWallet(); }, 5000);
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
        body: JSON.stringify({ execute: true, creator_address: creatorAddress || undefined }),
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

  const toggleAutoRun = useCallback(() => {
    if (isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunning(false);
    } else {
      setIsRunning(true);
      triggerEvent();
      intervalRef.current = setInterval(triggerEvent, 5000);
    }
  }, [isRunning, triggerEvent]);

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
