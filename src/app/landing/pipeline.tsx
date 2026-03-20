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

const COLOR_MAP: Record<string, { label: string; dot: string; text: string }> = {
  violet: { label: "text-violet-400", dot: "bg-violet-400/60", text: "text-violet-400/80" },
  amber: { label: "text-amber-400", dot: "bg-amber-400/60", text: "text-amber-400/80" },
  emerald: { label: "text-emerald-400", dot: "bg-emerald-400/60", text: "text-emerald-400/80" },
  cyan: { label: "text-[#00D4FF]", dot: "bg-[#00D4FF]/60", text: "text-[#00D4FF]/80" },
};

const ARROW = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4 8H12M12 8L9 5M12 8L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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

        {/* Pipeline flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PIPELINE_STEPS.map((step, i) => {
            const colors = COLOR_MAP[step.color];
            return (
              <Reveal key={step.stage} delay={i + 1}>
                <div className="relative group">
                  {i < 3 && (
                    <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-zinc-700">
                      {ARROW}
                    </div>
                  )}
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 h-full transition-colors hover:border-white/[0.12]">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${colors.label}`}>
                        {step.label}
                      </span>
                    </div>
                    <h3 className="font-heading text-base font-bold tracking-[-0.01em] mb-3">
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

        {/* Mobile flow connector hint */}
        <Reveal delay={1}>
          <div className="mt-8 flex items-center justify-center gap-3 text-zinc-600 sm:hidden">
            <span className="font-mono text-[11px]">Event</span>
            {ARROW}
            <span className="font-mono text-[11px]">Brain</span>
            {ARROW}
            <span className="font-mono text-[11px]">Guard</span>
            {ARROW}
            <span className="font-mono text-[11px]">Tip</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
