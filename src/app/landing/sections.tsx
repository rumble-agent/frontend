import { Reveal } from "./reveal";

/* ─── How It Works ─── */
export function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Configure your agent",
      desc: "Set budget limits (per session, per tip), split ratios between creator/editor/community, and rate limits. Your agent never exceeds your rules.",
      detail: "max: 50 USDT/session · 5 USDT/tip · 30s cooldown",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#00D4FF]" aria-hidden="true">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      num: "02",
      title: "Agent evaluates events",
      desc: "Stream events (viewer spikes, new subs, donations, milestones) are scored by Llama 4 via Groq. Each event gets a 0-1 significance score with reasoning.",
      detail: "score >= 0.4 triggers a tip · sentiment analysis included",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#00D4FF]" aria-hidden="true">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      num: "03",
      title: "USDT tips execute onchain",
      desc: "Approved tips are split and sent as real USDT transfers via Tether WDK. Every transaction is onchain, verifiable, and non-custodial.",
      detail: "split: 80% creator · 10% editor · 10% community",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#00D4FF]" aria-hidden="true">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <p className="text-[13px] font-medium text-zinc-500 tracking-wide uppercase mb-4">
            How It Works
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-16">
            Three steps. Fully autonomous.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0">
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i + 1}>
              <div className={`${i > 0 ? "step-connector md:pl-12" : ""} ${i < 2 ? "md:pr-12 md:border-r md:border-white/[0.04]" : ""}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="font-mono text-[#00D4FF] text-xs">{step.num}</span>
                </div>
                <h3 className="font-heading text-xl font-bold mb-3 tracking-[-0.02em]">
                  {step.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed mb-3">
                  {step.desc}
                </p>
                <p className="font-mono text-[11px] text-zinc-600">
                  {step.detail}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features Bento Grid ─── */
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

/* ─── Stack + Trust Signals ─── */
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
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] transition-colors"
              >
                <span className="text-sm font-medium text-white">{item.label}</span>
                <span className="text-xs text-zinc-600">{item.sub}</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Trust signals */}
        <Reveal delay={2}>
          <div className="flex flex-wrap items-center gap-6 pt-8 border-t border-white/[0.04]">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-mono text-[11px] text-zinc-400">
                Built for Tether WDK Hackathon
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02]">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-zinc-500" aria-hidden="true">
                <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" clipRule="evenodd" />
              </svg>
              <span className="font-mono text-[11px] text-zinc-400">
                Open Source
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02]">
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

/* ─── Footer ─── */
export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-6 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-zinc-600">
        <span>Rumble Pulse Agent — Built for Tether WDK Hackathon</span>
        <div className="flex gap-6">
          <a href="https://github.com/rumble-agent" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
        </div>
      </div>
    </footer>
  );
}
