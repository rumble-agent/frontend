import { Reveal } from "./reveal";

const PIPELINE_STEPS = [
  {
    stage: "01",
    label: "Event Layer",
    title: "Stream Event",
    items: ["viewer_spike", "new_subscriber", "donation", "milestone", "sentiment_shift"],
    color: "violet",
    example: "viewer_count: 1,247 → 3,891",
  },
  {
    stage: "02",
    label: "Agent Brain",
    title: "Llama 4 Scout",
    items: ["Significance score 0-1", "Sentiment analysis", "Context reasoning", "Rule-based fallback"],
    color: "amber",
    example: "score=0.87 → tip 2.50 USDT",
  },
  {
    stage: "03",
    label: "Budget Guardian",
    title: "Validation",
    items: ["Per-session cap check", "Per-tip limit check", "Rate limiter (30s)", "Split calculation"],
    color: "emerald",
    example: "✓ under cap · ✓ rate ok",
  },
  {
    stage: "04",
    label: "WDK Execution",
    title: "Onchain Tip",
    items: ["USDT ERC-20 transfer", "Auto-split to 3 wallets", "TX hash + confirmation", "Balance update"],
    color: "cyan",
    example: "TX 0x7a3f...e91d confirmed",
  },
] as const;

const COLOR_MAP: Record<string, {
  label: string;
  dot: string;
  text: string;
  border: string;
  glow: string;
  bg: string;
  num: string;
}> = {
  violet: {
    label: "text-violet-400",
    dot: "bg-violet-400/60",
    text: "text-violet-400/80",
    border: "border-violet-500/30",
    glow: "shadow-[0_0_12px_rgba(139,92,246,0.15)]",
    bg: "bg-violet-500/10",
    num: "text-violet-400/40",
  },
  amber: {
    label: "text-amber-400",
    dot: "bg-amber-400/60",
    text: "text-amber-400/80",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    bg: "bg-amber-500/10",
    num: "text-amber-400/40",
  },
  emerald: {
    label: "text-emerald-400",
    dot: "bg-emerald-400/60",
    text: "text-emerald-400/80",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    bg: "bg-emerald-500/10",
    num: "text-emerald-400/40",
  },
  cyan: {
    label: "text-[#00D4FF]",
    dot: "bg-[#00D4FF]/60",
    text: "text-[#00D4FF]/80",
    border: "border-[#00D4FF]/30",
    glow: "shadow-[0_0_12px_rgba(0,212,255,0.15)]",
    bg: "bg-[#00D4FF]/10",
    num: "text-[#00D4FF]/40",
  },
};

export function PipelineSection() {
  return (
    <section className="py-20 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <p className="text-[13px] font-medium text-zinc-500 tracking-wide uppercase mb-4">
            Under the Hood
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-6">
            The decision pipeline.
          </h2>
          <p className="text-zinc-500 text-sm leading-relaxed max-w-2xl mb-16">
            Every stream event passes through a 4-stage pipeline before any USDT leaves your wallet.
            Each stage is logged, auditable, and visible in real-time on the dashboard.
          </p>
        </Reveal>

        {/* Desktop: horizontal connector line behind cards */}
        <div className="hidden lg:block relative mb-8">
          {/* Connector line */}
          <div className="absolute top-0 left-[12.5%] right-[12.5%] flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-violet-500/30 via-amber-500/20 via-emerald-500/20 to-[#00D4FF]/30" />
          </div>

          {/* Step nodes on the line */}
          <div className="relative grid grid-cols-4 gap-4">
            {PIPELINE_STEPS.map((step, i) => {
              const colors = COLOR_MAP[step.color];
              return (
                <Reveal key={step.stage} delay={i + 1}>
                  <div className="flex flex-col items-center">
                    {/* Node dot */}
                    <div className={`relative z-10 w-8 h-8 rounded-full ${colors.bg} ${colors.border} border flex items-center justify-center ${colors.glow} -mt-4`}>
                      <span className={`font-mono text-[10px] font-bold ${colors.label}`}>
                        {step.stage}
                      </span>
                    </div>

                    {/* Card */}
                    <div className={`mt-4 w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-[250ms] hover:border-white/[0.12] hover:bg-white/[0.03] hover:-translate-y-1 ${colors.glow.replace('0.15', '0')} hover:${colors.glow} active:translate-y-0 active:scale-[0.995] group`}>
                      {/* Colored top accent */}
                      <div className={`h-px w-full ${colors.dot} mb-4 opacity-60 group-hover:opacity-100 transition-opacity`} />

                      <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${colors.label}`}>
                        {step.label}
                      </span>
                      <h3 className="font-heading text-base font-bold tracking-[-0.01em] mt-2 mb-3">
                        {step.title}
                      </h3>
                      <ul className="space-y-1.5 mb-4">
                        {step.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-[12px] text-zinc-500">
                            <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${colors.dot}`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <div className={`font-mono text-[11px] px-3 py-2 rounded-md border border-white/[0.04] bg-white/[0.02] ${colors.text}`}>
                        {step.example}
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        {/* Tablet + Mobile: vertical flow */}
        <div className="lg:hidden space-y-3">
          {PIPELINE_STEPS.map((step, i) => {
            const colors = COLOR_MAP[step.color];
            return (
              <Reveal key={step.stage} delay={i + 1}>
                <div className="relative">
                  {/* Vertical connector */}
                  {i < 3 && (
                    <div className="absolute left-5 top-full w-px h-3 bg-gradient-to-b from-white/[0.08] to-transparent z-0" />
                  )}

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-[250ms] hover:border-white/[0.12] hover:bg-white/[0.03] active:scale-[0.995]">
                    <div className="flex items-start gap-4">
                      {/* Step number badge */}
                      <div className={`shrink-0 w-10 h-10 rounded-lg ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                        <span className={`font-mono text-xs font-bold ${colors.label}`}>
                          {step.stage}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${colors.label}`}>
                            {step.label}
                          </span>
                        </div>
                        <h3 className="font-heading text-base font-bold tracking-[-0.01em] mb-2">
                          {step.title}
                        </h3>
                        <ul className="space-y-1 mb-3">
                          {step.items.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-[12px] text-zinc-500">
                              <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${colors.dot}`} />
                              {item}
                            </li>
                          ))}
                        </ul>
                        <div className={`font-mono text-[11px] px-3 py-2 rounded-md border border-white/[0.04] bg-white/[0.02] ${colors.text}`}>
                          {step.example}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Flow summary - mobile only */}
        <Reveal delay={1}>
          <div className="mt-8 flex items-center justify-center gap-2 text-zinc-600 sm:hidden">
            {PIPELINE_STEPS.map((step, i) => {
              const colors = COLOR_MAP[step.color];
              return (
                <div key={step.stage} className="flex items-center gap-2">
                  <span className={`font-mono text-[11px] ${colors.label}`}>{step.label.split(" ")[0]}</span>
                  {i < 3 && (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-zinc-700" aria-hidden="true">
                      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
