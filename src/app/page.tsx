"use client";

import { useEffect, useRef, useState } from "react";

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
      video.play().catch(() => {});
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

/* ─── Agent Log ─── */
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

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const timer = setInterval(() => {
      setLines((p) => {
        if (p >= LOG_LINES.length) {
          clearInterval(timer);
          timeout = setTimeout(() => setLines(0), 3000);
          return p;
        }
        return p + 1;
      });
    }, 700);
    return () => {
      clearInterval(timer);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      className="font-[family-name:var(--font-jetbrains)] text-[13px] leading-6 overflow-x-auto"
      role="log"
      aria-label="Agent activity log"
    >
      {LOG_LINES.slice(0, lines).map((l, i) => (
        <div key={i} className={`log-line flex gap-3 ${LOG_COLORS[l.type] || "text-zinc-500"}`}>
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
            <span className="font-[family-name:var(--font-syne)] font-bold text-[15px] tracking-[-0.02em]">
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
              href="#"
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
        {/* ── Hero ── */}
        <section className="relative min-h-screen flex items-center overflow-hidden">
          <HeroVideo />
          {/* Subtle top glow — only cyan, very faint */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,212,255,0.07) 0%, transparent 60%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050505]" />

          <div className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-20 w-full">
            <div className="max-w-3xl">
              <p className="animate-in text-[13px] font-medium text-[#00D4FF] tracking-wide uppercase mb-6">
                Autonomous Tipping Agent
              </p>

              <h1 className="animate-in delay-1 font-[family-name:var(--font-syne)] text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold tracking-[-0.04em] leading-[0.95]">
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
                  href="#"
                  className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors"
                >
                  Launch Agent
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-2" aria-hidden="true">
                    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-lg text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="mr-2" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" clipRule="evenodd" />
                  </svg>
                  GitHub
                </a>
              </div>
            </div>

            {/* Inline stats — simple, no glow */}
            <div className="animate-in delay-4 mt-20 flex gap-12 text-sm">
              <div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[#00D4FF] font-medium">24/7</span>
                <span className="text-zinc-600 ml-2">autonomous</span>
              </div>
              <div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[#00D4FF] font-medium">&lt;2s</span>
                <span className="text-zinc-600 ml-2">tip latency</span>
              </div>
              <div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[#00D4FF] font-medium">100%</span>
                <span className="text-zinc-600 ml-2">onchain</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works — Horizontal, no cards ── */}
        <section id="how-it-works" className="py-24 px-6 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto">
            <p className="text-[13px] font-medium text-zinc-500 tracking-wide uppercase mb-12">
              How It Works
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
              <div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[#00D4FF] text-xs">01</span>
                <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold mt-3 mb-3 tracking-[-0.02em]">
                  Set your rules
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Define tip triggers, budget limits, and creator allowlists.
                  Your agent follows your policy — always.
                </p>
              </div>
              <div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[#00D4FF] text-xs">02</span>
                <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold mt-3 mb-3 tracking-[-0.02em]">
                  Agent watches
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  The AI agent monitors Rumble streams in real-time — tracking
                  engagement, sentiment, and events.
                </p>
              </div>
              <div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[#00D4FF] text-xs">03</span>
                <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold mt-3 mb-3 tracking-[-0.02em]">
                  Tips execute onchain
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  USDT tips are sent via Tether WDK — fast, transparent,
                  and fully onchain with no middleman.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bento Grid: Features + Agent Log ── */}
        <section id="features" className="py-24 px-6 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto">
            <p className="text-[13px] font-medium text-zinc-500 tracking-wide uppercase mb-12">
              Features
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Agent Log — large card, spans full width on top */}
              <div id="agent-log" className="md:col-span-2 card p-0 overflow-hidden">
                {/* Terminal chrome */}
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.04]">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  </div>
                  <span className="ml-3 font-[family-name:var(--font-jetbrains)] text-[11px] text-zinc-600">
                    rumble-pulse-agent
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    <span className="font-[family-name:var(--font-jetbrains)] text-[11px] text-zinc-600">
                      live
                    </span>
                  </div>
                </div>
                <div className="p-5 min-h-[320px] max-h-[380px] overflow-y-auto">
                  <AgentLog />
                </div>
              </div>

              {/* Smart Treasury */}
              <div className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-[family-name:var(--font-syne)] text-base font-bold tracking-[-0.01em]">
                    Smart Treasury Split
                  </h3>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600 shrink-0" aria-hidden="true">
                    <circle cx="10" cy="10" r="8" />
                    <path d="M10 6V10L13 11.5" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Auto-partition into tip pool, reserve, and gas buffer.
                  Dynamic rebalancing based on stream performance.
                </p>
              </div>

              {/* LLM Reasoning */}
              <div className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-[family-name:var(--font-syne)] text-base font-bold tracking-[-0.01em]">
                    LLM Reasoning
                  </h3>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600 shrink-0" aria-hidden="true">
                    <path d="M10 2L2 6L10 10L18 6L10 2Z" />
                    <path d="M2 14L10 18L18 14" />
                    <path d="M2 10L10 14L18 10" />
                  </svg>
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Every tip passes through an LLM reasoning layer — evaluating
                  engagement quality, sentiment, and context.
                </p>
              </div>

              {/* Budget Guardian — full width */}
              <div className="md:col-span-2 card p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                <div className="flex-1">
                  <h3 className="font-[family-name:var(--font-syne)] text-base font-bold tracking-[-0.01em] mb-2">
                    Budget Guardian
                  </h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    Hard caps, rate limiting, and anomaly detection ensure your
                    treasury is never drained. Configurable per-session and global limits.
                  </p>
                </div>
                <div className="flex gap-6 font-[family-name:var(--font-jetbrains)] text-xs text-zinc-500 shrink-0">
                  <div className="text-center">
                    <div className="text-white text-lg font-medium">50</div>
                    <div>USDT/session</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white text-lg font-medium">5</div>
                    <div>USDT/tip max</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white text-lg font-medium">30s</div>
                    <div>rate limit</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stack — inline badges ── */}
        <section id="stack" className="py-24 px-6 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto">
            <p className="text-[13px] font-medium text-zinc-500 tracking-wide uppercase mb-8">
              Built with
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "WDK by Tether", sub: "Wallet SDK" },
                { label: "OpenClaw", sub: "Agent Framework" },
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
          </div>
        </section>
      </main>

      {/* ── Footer — single line ── */}
      <footer className="border-t border-white/[0.04] py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-zinc-600">
          <span>Rumble Pulse Agent</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
