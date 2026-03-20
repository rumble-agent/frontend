"use client";

import { useEffect, useRef, useState } from "react";

/* ─── Scroll Reveal Hook ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useReveal();
  const delayClass = delay > 0 ? `reveal-delay-${delay}` : "";
  return (
    <div ref={ref} className={`reveal ${delayClass} ${className}`}>
      {children}
    </div>
  );
}

/* ─── Hero Video Background ─── */
const HLS_SRC =
  "https://stream.mux.com/hUT6X11m1Vkw1QMxPOLgI761x2cfpi9bHFbi5cNg4014.m3u8";

function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.play().catch(() => { });
    };

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = HLS_SRC;
      tryPlay();
      const onError = () => setFailed(true);
      video.addEventListener("error", onError);
      return () => video.removeEventListener("error", onError);
    }

    let hls: import("hls.js").default | null = null;
    let destroyed = false;

    import("hls.js").then((mod) => {
      if (destroyed) return;
      const Hls = mod.default;
      if (!Hls.isSupported()) return setFailed(true);
      hls = new Hls({ autoStartLoad: true });
      hls.loadSource(HLS_SRC);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.on(Hls.Events.ERROR, (_e, d) => {
        if (d.fatal) {
          setFailed(true);
          hls?.destroy();
        }
      });
    });

    return () => {
      destroyed = true;
      hls?.destroy();
    };
  }, []);

  if (failed) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover opacity-20"
    />
  );
}

/* ─── Mini Agent Preview (Hero right side) ─── */
const PREVIEW_LINES = [
  { type: "sys", text: "Agent initialized" },
  { type: "ok", text: "Connected to @CryptoMaverick" },
  { type: "evt", text: "viewer_count: 1,247 → 3,891" },
  { type: "llm", text: "score=0.87 → tip 2.50 USDT" },
  { type: "act", text: "Tip sent via WDK" },
  { type: "ok", text: "TX 0x7a3f...e91d confirmed" },
];

const PREVIEW_COLORS: Record<string, string> = {
  sys: "text-zinc-500",
  ok: "text-emerald-400",
  evt: "text-violet-400",
  llm: "text-amber-400/70",
  act: "text-[#00D4FF]",
};

function MiniAgentPreview() {
  const [lines, setLines] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLines((p) => {
        if (p >= PREVIEW_LINES.length) {
          clearInterval(timer);
          return p;
        }
        return p + 1;
      });
    }, 600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Terminal chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04]">
        <div className="flex gap-1.5" aria-hidden="true">
          <div className="w-2 h-2 rounded-full bg-zinc-800" />
          <div className="w-2 h-2 rounded-full bg-zinc-800" />
          <div className="w-2 h-2 rounded-full bg-zinc-800" />
        </div>
        <span className="ml-2 font-mono text-[10px] text-zinc-600">
          rumble-pulse-agent
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[10px] text-zinc-600">
            live
          </span>
        </div>
      </div>
      {/* Log lines */}
      <div className="p-4 font-mono text-[11px] leading-5 min-h-[180px]">
        {PREVIEW_LINES.slice(0, lines).map((l, i) => (
          <div key={i} className={`log-line flex gap-2 ${PREVIEW_COLORS[l.type] || "text-zinc-500"}`}>
            <span className="text-zinc-700 shrink-0 select-none">›</span>
            <span>{l.text}</span>
          </div>
        ))}
        {lines < PREVIEW_LINES.length && (
          <div className="flex gap-2">
            <span className="text-zinc-700 select-none">›</span>
            <span className="cursor-blink" />
          </div>
        )}
      </div>
      {/* Subtle glow behind the terminal */}
      <div
        className="absolute -inset-px -z-10 rounded-xl opacity-40 blur-xl"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,212,255,0.08) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

/* ─── Agent Log (Full) ─── */
const LOG_LINES = [
  { time: "00:01", type: "sys", text: "Agent initialized. Connecting..." },
  { time: "00:02", type: "ok", text: "Connected to @CryptoMaverick stream" },
  { time: "00:05", type: "evt", text: "viewer_count spike: 1,247 → 3,891" },
  { time: "00:06", type: "llm", text: "High engagement. Checking treasury..." },
  { time: "00:07", type: "inf", text: "Balance: 142.50 USDT | Budget: 89.00 USDT" },
  { time: "00:08", type: "llm", text: "score=0.87 sentiment=positive → tip 2.50" },
  { time: "00:09", type: "act", text: "Tip 2.50 USDT → @CryptoMaverick via WDK" },
  { time: "00:10", type: "ok", text: "TX 0x7a3f...e91d confirmed" },
  { time: "00:12", type: "evt", text: "new_subscriber: user_8172" },
  { time: "00:13", type: "llm", text: "Subscriber event. Bonus 1.5x → tip 3.75" },
  { time: "00:14", type: "act", text: "Tip 3.75 USDT → @CryptoMaverick via WDK" },
  { time: "00:15", type: "ok", text: "TX 0x2b1c...f40a confirmed" },
  { time: "00:18", type: "wrn", text: "Budget: 7% consumed. Rate adjusted." },
  { time: "00:20", type: "sys", text: "Rate limiter on. Next eval in 30s." },
];

const LOG_COLORS: Record<string, string> = {
  sys: "text-zinc-500",
  inf: "text-zinc-400",
  ok: "text-emerald-400",
  evt: "text-violet-400",
  llm: "text-amber-400/70 italic",
  act: "text-[#00D4FF]",
  wrn: "text-amber-400",
};

function AgentLog() {
  const [lines, setLines] = useState(0);
  const [cycle, setCycle] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  // Start animation when element is visible AND a new cycle begins
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;

          timer = setInterval(() => {
            setLines((p) => {
              if (p >= LOG_LINES.length) {
                if (timer) clearInterval(timer);
                timer = null;
                timeout = setTimeout(() => {
                  setLines(0);
                  startedRef.current = false;
                  setCycle((c) => c + 1);
                }, 3000);
                return p;
              }
              return p + 1;
            });
          }, 700);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) clearInterval(timer);
      if (timeout) clearTimeout(timeout);
    };
  }, [cycle]);

  return (
    <div
      ref={containerRef}
      className="font-mono text-[13px] leading-6 overflow-x-auto"
      role="log"
      aria-label="Agent activity log"
    >
      {LOG_LINES.slice(0, lines).map((l, i) => (
        <div key={`${cycle}-${i}`} className={`log-line flex gap-3 ${LOG_COLORS[l.type] || "text-zinc-500"}`}>
          <span className="text-zinc-600 shrink-0 select-none">{l.time}</span>
          <span className="whitespace-normal break-words min-w-0">{l.text}</span>
        </div>
      ))}
      {lines < LOG_LINES.length && (
        <div className="flex gap-3">
          <span className="text-zinc-600 select-none">{">"}</span>
          <span className="cursor-blink" />
        </div>
      )}
    </div>
  );
}

/* ─── Marquee Ticker ─── */
const TICKER_ITEMS = [
  "Tip 2.50 USDT → @CryptoMaverick",
  "TX 0x7a3f...e91d confirmed",
  "Agent connected to stream",
  "viewer_count spike: 3,891",
  "Tip 3.75 USDT → @StreamKing",
  "TX 0x2b1c...f40a confirmed",
  "Budget: 93% remaining",
  "score=0.91 sentiment=positive",
  "Tip 1.00 USDT → @DeFiDaily",
  "TX 0x9e4a...b23c confirmed",
];

function Marquee() {
  return (
    <div className="overflow-hidden border-y border-white/[0.04] py-3 select-none">
      <div className="marquee-track flex gap-8 w-max">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-2 font-mono text-[11px] text-zinc-600 whitespace-nowrap"
          >
            <span className="w-1 h-1 rounded-full bg-[#00D4FF]/40" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Mobile Menu ─── */
function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="md:hidden border-t border-white/5 bg-black/95 backdrop-blur-xl">
      <div className="flex flex-col px-6 py-6 gap-1 text-[15px]">
        {["How It Works", "Features", "Agent Log", "Stack"].map((label) => (
          <a
            key={label}
            href={`#${label.toLowerCase().replace(/ /g, "-")}`}
            className="text-zinc-400 hover:text-white py-2.5 transition-colors"
            onClick={onClose}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <span className="font-heading font-bold text-[15px] tracking-[-0.02em]">
              Rumble Pulse
            </span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-[13px] text-zinc-500">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#agent-log" className="hover:text-white transition-colors">Agent Log</a>
            <a href="#stack" className="hover:text-white transition-colors">Stack</a>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="hidden sm:inline-flex text-[13px] font-medium px-4 py-1.5 rounded-md bg-white text-black hover:bg-zinc-200 transition-colors"
            >
              Launch Agent
            </a>

            <button
              className="md:hidden w-8 h-8 flex flex-col justify-center items-center gap-[5px]"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span className={`block w-4 h-[1.5px] bg-zinc-400 transition-all duration-200 ${menuOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
              <span className={`block w-4 h-[1.5px] bg-zinc-400 transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-4 h-[1.5px] bg-zinc-400 transition-all duration-200 ${menuOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
            </button>
          </div>
        </div>
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      </nav>

      <main>
        {/* ── Hero — Split Layout ── */}
        <section className="relative min-h-screen flex items-center overflow-hidden">
          <HeroVideo />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,212,255,0.07) 0%, transparent 60%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050505]" />

          <div className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-20 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left — Text */}
              <div>
                <p className="animate-in text-[13px] font-medium text-[#00D4FF] tracking-wide uppercase mb-6">
                  Autonomous Tipping Agent
                </p>

                <h1 className="animate-in delay-1 font-heading text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold tracking-[-0.04em] leading-[0.9] uppercase">
                  Let your agent
                  <br />
                  <span className="text-[#00D4FF]">tip for you.</span>
                </h1>

                <p className="animate-in delay-2 mt-8 text-lg text-zinc-500 max-w-lg leading-relaxed">
                  Event-driven tipping infrastructure for Rumble creators.
                  Your agent watches streams, reasons about engagement, and sends
                  USDT tips onchain via Tether WDK.
                </p>

                <div className="animate-in delay-3 mt-10 flex flex-wrap gap-3">
                  <a
                    href="/dashboard"
                    className="cta-primary inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-lg bg-white text-black"
                  >
                    Launch Agent
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-2" aria-hidden="true">
                      <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                  <a
                    href="https://github.com/rumble-agent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-lg text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white transition-all"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="mr-2" aria-hidden="true">
                      <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" clipRule="evenodd" />
                    </svg>
                    GitHub
                  </a>
                </div>

                {/* Inline stats */}
                <div className="animate-in delay-4 mt-12 flex flex-wrap gap-x-10 gap-y-3 text-sm">
                  <div>
                    <span className="font-mono text-[#00D4FF] font-medium">24/7</span>
                    <span className="text-zinc-600 ml-2">autonomous</span>
                  </div>
                  <div>
                    <span className="font-mono text-[#00D4FF] font-medium">&lt;2s</span>
                    <span className="text-zinc-600 ml-2">tip latency</span>
                  </div>
                  <div>
                    <span className="font-mono text-[#00D4FF] font-medium">100%</span>
                    <span className="text-zinc-600 ml-2">onchain</span>
                  </div>
                </div>
              </div>

              {/* Right — Mini Agent Preview */}
              <div className="animate-in delay-3">
                <MiniAgentPreview />
              </div>
            </div>
          </div>
        </section>

        {/* ── Marquee Ticker ── */}
        <Marquee />

        {/* ── How It Works — 3 Steps ── */}
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
              {[
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
              ].map((step, i) => (
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

        {/* ── Architecture Flow — The Pipeline ── */}
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
              {[
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
              ].map((step, i) => (
                <Reveal key={step.stage} delay={i + 1}>
                  <div className="relative group">
                    {/* Connector arrow — hidden on mobile, shown between cards on lg */}
                    {i < 3 && (
                      <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-zinc-700">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M4 8H12M12 8L9 5M12 8L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}

                    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 h-full transition-colors hover:border-white/[0.12]`}>
                      {/* Stage header */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                          step.color === "violet" ? "text-violet-400" :
                          step.color === "amber" ? "text-amber-400" :
                          step.color === "emerald" ? "text-emerald-400" :
                          "text-[#00D4FF]"
                        }`}>
                          {step.label}
                        </span>
                      </div>

                      <h3 className="font-heading text-base font-bold tracking-[-0.01em] mb-3">
                        {step.title}
                      </h3>

                      {/* Items */}
                      <ul className="space-y-1.5 mb-4">
                        {step.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-[12px] text-zinc-500">
                            <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${
                              step.color === "violet" ? "bg-violet-400/60" :
                              step.color === "amber" ? "bg-amber-400/60" :
                              step.color === "emerald" ? "bg-emerald-400/60" :
                              "bg-[#00D4FF]/60"
                            }`} />
                            {item}
                          </li>
                        ))}
                      </ul>

                      {/* Example output */}
                      <div className={`font-mono text-[11px] px-3 py-2 rounded-md border border-white/[0.04] bg-white/[0.02] ${
                        step.color === "violet" ? "text-violet-400/80" :
                        step.color === "amber" ? "text-amber-400/80" :
                        step.color === "emerald" ? "text-emerald-400/80" :
                        "text-[#00D4FF]/80"
                      }`}>
                        {step.example}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Mobile flow connector hint */}
            <Reveal delay={1}>
              <div className="mt-8 flex items-center justify-center gap-3 text-zinc-600 sm:hidden">
                <span className="font-mono text-[11px]">Event</span>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 8H12M12 8L9 5M12 8L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="font-mono text-[11px]">Brain</span>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 8H12M12 8L9 5M12 8L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="font-mono text-[11px]">Guard</span>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 8H12M12 8L9 5M12 8L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="font-mono text-[11px]">Tip</span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Agent Log — Standalone Prominent Section ── */}
        <section id="agent-log" className="py-24 px-6 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
              {/* Left — Description */}
              <div className="lg:col-span-2">
                <Reveal>
                  <p className="text-[13px] font-medium text-zinc-500 tracking-wide uppercase mb-4">
                    Live Agent Log
                  </p>
                  <h2 className="font-heading text-3xl font-bold tracking-[-0.03em] mb-4">
                    Watch it think.
                  </h2>
                  <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                    Every decision is transparent. Watch the agent connect to streams,
                    evaluate engagement in real-time, and execute tips onchain —
                    all logged and auditable.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Fully auditable decision trail
                  </div>
                </Reveal>
              </div>

              {/* Right — Terminal */}
              <div className="lg:col-span-3">
                <Reveal delay={1}>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.04]">
                      <div className="flex gap-1.5" aria-hidden="true">
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                      </div>
                      <span className="ml-3 font-mono text-[11px] text-zinc-600">
                        rumble-pulse-agent — session_0x8f2a
                      </span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                        <span className="font-mono text-[11px] text-zinc-600">
                          live
                        </span>
                      </div>
                    </div>
                    <div className="p-5 min-h-[320px] max-h-[400px] overflow-y-auto">
                      <AgentLog />
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features Bento Grid ── */}
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

        {/* ── Stack + Trust Signals ── */}
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
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-zinc-600">
          <span>Rumble Pulse Agent — Built for Tether WDK Hackathon</span>
          <div className="flex gap-6">
            <a href="https://github.com/rumble-agent" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
