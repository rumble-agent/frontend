import { Reveal } from "./reveal";

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
              <div className={`group ${i > 0 ? "step-connector md:pl-12" : ""} ${i < 2 ? "md:pr-12 md:border-r md:border-white/[0.04]" : ""}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-10 h-10 rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/[0.04] flex items-center justify-center transition-all duration-[250ms] group-hover:border-[#00D4FF]/40 group-hover:bg-[#00D4FF]/[0.08] group-hover:shadow-[0_0_16px_rgba(0,212,255,0.12)]">
                    {step.icon}
                  </div>
                  <span className="font-mono text-[#00D4FF]/60 text-xs font-bold">{step.num}</span>
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
