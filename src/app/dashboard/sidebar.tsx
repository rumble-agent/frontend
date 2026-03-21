"use client";

import { useDashboard } from "./use-dashboard";
import { isValidAddress, EXPLORER } from "./types";

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function Sidebar() {
  const {
    isRunning, triggerLoading, triggerEvent, toggleAutoRun, toggleRumble,
    resetBudget, rumble, rumbleLoading, walletError, wallet, fetchWallet,
    creatorAddress, editingCreator, setEditingCreator, creatorDraft,
    setCreatorDraft, creatorSaving, saveCreator, budget, spent, maxSession, spentPercent,
  } = useDashboard();

  const contracts = wallet?.wallet.contracts;

  return (
    <>
      {/* Controls */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors duration-[250ms] hover:border-white/[0.10]">
        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-3">Controls</p>
        <div className="space-y-2">
          <button
            onClick={toggleAutoRun}
            className={`btn-press w-full px-4 py-2.5 text-[13px] font-medium rounded-lg ${
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
              className={`btn-press w-full px-4 py-2.5 text-[13px] font-medium rounded-lg disabled:opacity-40 ${
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
              className="btn-press flex-1 px-3 py-2 text-[12px] font-medium rounded-lg text-zinc-400 border border-white/[0.06] hover:border-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {triggerLoading ? "..." : "Test Event"}
            </button>
            <button
              onClick={resetBudget}
              className="btn-press flex-1 px-3 py-2 text-[12px] font-medium rounded-lg text-zinc-400 border border-white/[0.06] hover:border-white/10 hover:text-white"
            >
              Reset Budget
            </button>
          </div>
        </div>
      </div>

      {/* Wallet */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors duration-[250ms] hover:border-white/[0.10]">
        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-3">Agent Wallet</p>
        {walletError ? (
          <div className="font-mono text-[12px] text-red-400">
            {walletError}
            <button onClick={fetchWallet} className="block mt-2 text-zinc-500 hover:text-white underline">Retry</button>
          </div>
        ) : wallet ? (
          <div className="font-mono">
            <div className="text-xl font-bold text-white">
              {wallet.wallet.balance.toFixed(2)} <span className="text-sm text-zinc-500">{wallet.wallet.currency}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[11px] text-zinc-600">{wallet.wallet.eth_balance?.toFixed(4) ?? "0"} ETH</span>
              {(wallet.wallet.eth_balance ?? 0) < 0.001 && (
                <span className="text-[9px] text-amber-400/80 uppercase tracking-wider">Low gas</span>
              )}
            </div>
            <a
              href={`${EXPLORER}/address/${wallet.wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-600 hover:text-[#00D4FF] mt-1 truncate block transition-colors"
              title={wallet.wallet.address}
            >
              {wallet.wallet.address}
            </a>
            <div className="text-[11px] text-zinc-700 mt-0.5">{wallet.wallet.chain}</div>
          </div>
        ) : (
          <div className="space-y-2 animate-pulse">
            <div className="h-6 w-28 rounded bg-white/[0.04]" />
            <div className="h-3 w-48 rounded bg-white/[0.04]" />
          </div>
        )}
      </div>

      {/* Contracts */}
      {contracts && (contracts.usdt || contracts.tip_splitter) && (
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.02] p-5">
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-3">On-Chain</p>
          <div className="space-y-2 font-mono text-[11px]">
            {contracts.tip_splitter && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-zinc-400">TipSplitter</span>
                </div>
                <a
                  href={`${EXPLORER}/address/${contracts.tip_splitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400/70 hover:text-emerald-400 transition-colors"
                >
                  {truncAddr(contracts.tip_splitter)}
                </a>
              </div>
            )}
            {contracts.usdt && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]" />
                  <span className="text-zinc-400">USDT</span>
                </div>
                <a
                  href={`${EXPLORER}/address/${contracts.usdt}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00D4FF]/70 hover:text-[#00D4FF] transition-colors"
                >
                  {truncAddr(contracts.usdt)}
                </a>
              </div>
            )}
            <p className="text-zinc-700 text-[10px] mt-1">
              {contracts.tip_splitter ? "Tips routed via smart contract" : "Direct ERC-20 transfer"}
            </p>
          </div>
        </div>
      )}

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
          <div className="font-mono text-[12px]">
            <input
              type="text"
              placeholder="0x..."
              aria-label="Creator wallet address"
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
          <div className="font-mono text-[12px]">
            <a
              href={`${EXPLORER}/address/${creatorAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00D4FF] hover:text-[#00D4FF]/80 truncate block transition-colors"
              title={creatorAddress}
            >
              {creatorAddress}
            </a>
            <p className="text-zinc-600 text-[11px] mt-1">Tips go to this address</p>
          </div>
        )}
      </div>

      {/* Budget */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors duration-[250ms] hover:border-white/[0.10]">
        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-3">Budget</p>
        <div className="font-mono">
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
          <div className="font-mono text-[12px]">
            {rumble.configured ? (
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${rumble.polling ? "bg-violet-400 animate-pulse shadow-[0_0_6px_rgba(139,92,246,0.5)]" : "bg-zinc-600"}`} />
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
    </>
  );
}
