import { Reveal } from "./reveal";

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <p className="text-[13px] font-medium text-zinc-500 tracking-wide uppercase mb-12">
            Features
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Smart Treasury */}
          <Reveal delay={1}>
            <div className="card card-accent p-6 h-full">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-heading text-base font-bold tracking-[-0.01em]">
                  Smart Treasury Split
                </h3>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600 shrink-0" aria-hidden="true">
                  <circle cx="10" cy="10" r="8" />
                  <path d="M10 6V10L13 11.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed mb-4">
                Every tip is auto-split between creator, editor, and community pool.
                Configurable ratios — your money goes exactly where you want.
              </p>
              <div className="flex gap-4 font-mono text-[11px]">
                <span className="text-zinc-600">creator: <span className="text-white">80%</span></span>
                <span className="text-zinc-600">editor: <span className="text-white">10%</span></span>
                <span className="text-zinc-600">community: <span className="text-white">10%</span></span>
              </div>
            </div>
          </Reveal>

          {/* LLM Reasoning */}
          <Reveal delay={2}>
            <div className="card card-accent p-6 h-full">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-heading text-base font-bold tracking-[-0.01em]">
                  LLM Reasoning
                </h3>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600 shrink-0" aria-hidden="true">
                  <path d="M10 2L2 6L10 10L18 6L10 2Z" />
                  <path d="M2 14L10 18L18 14" />
                  <path d="M2 10L10 14L18 10" />
                </svg>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed mb-4">
                Every tip passes through an LLM reasoning layer — evaluating
                engagement quality, sentiment, and context.
              </p>
              <div className="font-mono text-[11px] text-zinc-600 bg-white/[0.02] rounded-md px-3 py-2 border border-white/[0.04]">
                <span className="text-amber-400/70">thinking:</span> score=0.87 sentiment=positive → tip 2.50
              </div>
            </div>
          </Reveal>

          {/* Budget Guardian — full width */}
          <Reveal delay={3} className="md:col-span-2">
            <div className="card card-accent p-6 flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
              <div className="flex-1">
                <h3 className="font-heading text-base font-bold tracking-[-0.01em] mb-2">
                  Budget Guardian
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Hard caps, rate limiting, and anomaly detection ensure your
                  treasury is never drained. Configurable per-session and global limits.
                </p>
              </div>
              <div className="flex gap-6 font-mono text-xs text-zinc-500 shrink-0">
                <div className="text-center">
                  <div className="text-white text-lg font-medium">50</div>
                  <div>USDT/session</div>
                </div>
                <div className="w-px bg-white/[0.06]" />
                <div className="text-center">
                  <div className="text-white text-lg font-medium">5</div>
                  <div>USDT/tip max</div>
                </div>
                <div className="w-px bg-white/[0.06]" />
                <div className="text-center">
                  <div className="text-white text-lg font-medium">30s</div>
                  <div>rate limit</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
