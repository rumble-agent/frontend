"use client";

import { useDashboard } from "./use-dashboard";
import { isValidAddress } from "./types";

export function SetupView() {
  const {
    walletError, walletReady, wallet, fetchWallet,
    creatorDraft, setCreatorDraft, creatorValid,
    maxSession, budget, saveCreator, creatorSaving,
  } = useDashboard();

  return (
    <div className="max-w-lg mx-auto px-6 py-16 sm:py-24">
      {/* Title */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-[11px] text-zinc-500 font-mono mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]" />
          Powered by Tether WDK
        </div>
        <h1 className="font-heading text-[28px] font-bold tracking-[-0.02em] mb-2">
          Set up your tipping agent
        </h1>
        <p className="text-zinc-500 text-[14px]">
          Configure the agent, then launch the dashboard.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {/* Step 1 — Wallet */}
        <div className={`rounded-xl border p-5 transition-all duration-[250ms] hover:shadow-[0_4px_24px_rgba(0,0,0,0.2)] ${
          walletError
            ? "border-red-500/20 bg-red-500/[0.02] hover:border-red-500/30"
            : walletReady
            ? "border-emerald-500/20 bg-emerald-500/[0.02] hover:border-emerald-500/30"
            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
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
          <div className="ml-9 font-mono text-[12px]">
            {walletError ? (
              <div>
                <p className="text-red-400">{walletError}</p>
                <button onClick={fetchWallet} className="text-zinc-500 hover:text-white text-[11px] underline mt-1">Retry</button>
              </div>
            ) : wallet ? (
              <div>
                <p className="text-white">
                  {wallet.wallet.balance.toFixed(2)} <span className="text-zinc-500">{wallet.wallet.currency}</span>
                  <span className="text-zinc-600 ml-3">{wallet.wallet.eth_balance?.toFixed(4) ?? "0"} ETH</span>
                </p>
                <a
                  href={`https://sepolia.etherscan.io/address/${wallet.wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-600 hover:text-[#00D4FF] truncate mt-0.5 block transition-colors"
                  title={wallet.wallet.address}
                >
                  {wallet.wallet.address}
                </a>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-zinc-700">{wallet.wallet.chain}</span>
                  {wallet.wallet.contracts?.tip_splitter && (
                    <span className="text-emerald-400/60 text-[10px]">TipSplitter active</span>
                  )}
                </div>
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
        <div className={`rounded-xl border p-5 transition-all duration-[250ms] hover:shadow-[0_4px_24px_rgba(0,0,0,0.2)] ${
          creatorValid
            ? "border-emerald-500/20 bg-emerald-500/[0.02] hover:border-emerald-500/30"
            : "border-[#00D4FF]/20 bg-[#00D4FF]/[0.02] hover:border-[#00D4FF]/30"
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
            <label htmlFor="setup-creator-address" className="text-zinc-500 text-[12px] mb-2 block">Who should receive the tips?</label>
            <input
              id="setup-creator-address"
              type="text"
              placeholder="0x..."
              value={creatorDraft}
              onChange={(e) => setCreatorDraft(e.target.value)}
              className={`w-full bg-white/[0.04] border rounded-lg px-3 py-2.5 text-[13px] font-mono text-white placeholder-zinc-700 outline-none focus:border-[#00D4FF]/40 transition-colors ${
                creatorDraft && !isValidAddress(creatorDraft)
                  ? "border-red-500/30"
                  : "border-white/[0.08]"
              }`}
            />
            {creatorDraft && !isValidAddress(creatorDraft) && (
              <p className="text-red-400 text-[10px] mt-1.5 font-mono">Invalid Ethereum address</p>
            )}
          </div>
        </div>

        {/* Step 3 — Budget */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-[250ms] hover:border-white/[0.12] hover:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[11px] font-bold text-zinc-500">3</div>
            <h2 className="text-[14px] font-semibold text-zinc-400">Budget & Limits</h2>
          </div>
          <div className="ml-9 font-mono text-[12px]">
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
        disabled={!creatorValid || creatorSaving || !walletReady}
        className="cta-primary btn-press w-full mt-8 py-3 rounded-xl bg-white text-[#050505] font-semibold text-[14px] hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed"
      >
        {creatorSaving ? "Saving..." : "Continue to Dashboard"}
      </button>
      <p className="text-center text-zinc-700 text-[11px] mt-3 font-mono">
        You can change all settings from the dashboard later.
      </p>
    </div>
  );
}
