"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./reveal";

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

/* ─── Agent Log Section ─── */
export function AgentLogSection() {
  return (
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
              <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden group/terminal">
                {/* Subtle glow behind terminal */}
                <div
                  className="absolute -inset-px -z-10 rounded-xl opacity-0 group-hover/terminal:opacity-100 blur-xl transition-opacity duration-500"
                  style={{
                    background: "radial-gradient(ellipse at center, rgba(0,212,255,0.06) 0%, transparent 70%)",
                  }}
                />
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.04] bg-white/[0.01]">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/80" />
                  </div>
                  <span className="ml-3 font-mono text-[11px] text-zinc-600">
                    rumble-pulse-agent — session_0x8f2a
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]" aria-hidden="true" />
                    <span className="font-mono text-[11px] text-emerald-400/70">
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
  );
}
