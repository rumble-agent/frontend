import { Reveal } from "./reveal";

export function StackSection() {
  return (
    <section id="stack" className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <p className="text-[13px] font-medium text-zinc-500 tracking-wide uppercase mb-8">
            Built with
          </p>
        </Reveal>
        <Reveal delay={1}>
          <div className="flex flex-wrap gap-3 mb-16">
            {[
              { label: "WDK by Tether", sub: "Wallet SDK" },
              { label: "OpenClaw", sub: "Agent Framework" },
              { label: "Llama 4", sub: "LLM Reasoning" },
              { label: "USDT", sub: "Stablecoin" },
              { label: "TypeScript", sub: "Language" },
            ].map((item) => (
              <div
                key={item.label}
                className="tech-badge flex items-center gap-3 px-4 py-3 rounded-lg border border-white/[0.06] bg-white/[0.02] cursor-default"
              >
                <span className="text-sm font-medium text-white">{item.label}</span>
                <span className="text-xs text-zinc-600">{item.sub}</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Trust signals */}
        <Reveal delay={2}>
          <div className="flex flex-wrap items-center gap-4 pt-8 border-t border-white/[0.04]">
            <div className="trust-pill flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] cursor-default">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <span className="font-mono text-[11px] text-zinc-400">
                Built for Tether WDK Hackathon
              </span>
            </div>
            <div className="trust-pill flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] cursor-default">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-zinc-500" aria-hidden="true">
                <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" clipRule="evenodd" />
              </svg>
              <span className="font-mono text-[11px] text-zinc-400">
                Open Source
              </span>
            </div>
            <div className="trust-pill flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] cursor-default">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="font-mono text-[11px] text-zinc-400">
                Non-custodial
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
