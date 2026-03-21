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
        if (d.fatal && !destroyed) {
          setFailed(true);
          hls?.destroy();
          hls = null;
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

/* ─── Mini Agent Preview ─── */
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

/* ─── Hero Section ─── */
export function HeroSection() {
  return (
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
                className="cta-primary btn-press inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-lg bg-white text-black"
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
                className="btn-press inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-lg text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white"
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
  );
}
