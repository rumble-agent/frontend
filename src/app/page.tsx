"use client";

import { useEffect, useState } from "react";

/* ─── Icon Components ─── */
function RulesIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="8"
        y="6"
        width="32"
        height="36"
        rx="4"
        stroke="#00D4FF"
        strokeWidth="2"
        fill="none"
      />
      <line
        x1="14"
        y1="16"
        x2="34"
        y2="16"
        stroke="#00D4FF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="24"
        x2="28"
        y2="24"
        stroke="#A855F7"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="32"
        x2="22"
        y2="32"
        stroke="#F5A623"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="36" cy="36" r="8" fill="#000" stroke="#00D4FF" strokeWidth="2" />
      <path
        d="M33 36L35.5 38.5L39 33.5"
        stroke="#00D4FF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WatchIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="24" r="18" stroke="#A855F7" strokeWidth="2" fill="none" />
      <circle cx="24" cy="24" r="4" fill="#A855F7" />
      <path
        d="M24 12V24L32 28"
        stroke="#A855F7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="24"
        cy="24"
        r="18"
        stroke="#A855F7"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.3"
      />
      <circle cx="24" cy="6" r="2" fill="#00D4FF" />
      <circle cx="42" cy="24" r="2" fill="#F5A623" />
      <circle cx="24" cy="42" r="2" fill="#00D4FF" />
      <circle cx="6" cy="24" r="2" fill="#F5A623" />
    </svg>
  );
}

function TipIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 36L24 8L36 36"
        stroke="#F5A623"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M16 28H32"
        stroke="#F5A623"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="40" r="4" stroke="#00D4FF" strokeWidth="2" fill="none" />
      <path
        d="M22 40H26"
        stroke="#00D4FF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 12L4 8"
        stroke="#A855F7"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M40 12L44 8"
        stroke="#A855F7"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M24 4V2"
        stroke="#00D4FF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

/* ─── Agent Log Component ─── */
const LOG_LINES = [
  { time: "00:00:01", type: "system", text: "Agent initialized. Loading config..." },
  { time: "00:00:02", type: "info", text: "Connected to Rumble stream: @CryptoMaverick" },
  { time: "00:00:05", type: "event", text: "Event detected: viewer_count spike → 1,247 → 3,891" },
  { time: "00:00:06", type: "think", text: "LLM reasoning: High engagement detected. Checking treasury..." },
  { time: "00:00:07", type: "info", text: "Treasury balance: 142.50 USDT | Budget remaining: 89.00 USDT" },
  { time: "00:00:08", type: "think", text: "Evaluating tip amount: engagement_score=0.87, sentiment=positive" },
  { time: "00:00:09", type: "action", text: "Executing tip: 2.50 USDT → @CryptoMaverick via WDK" },
  { time: "00:00:10", type: "success", text: "TX confirmed: 0x7a3f...e91d | Gas: 0.0021 ETH" },
  { time: "00:00:12", type: "event", text: "Event detected: new_subscriber → user_8172" },
  { time: "00:00:13", type: "think", text: "LLM reasoning: Subscriber event. Applying bonus multiplier 1.5x" },
  { time: "00:00:14", type: "action", text: "Executing tip: 3.75 USDT → @CryptoMaverick via WDK" },
  { time: "00:00:15", type: "success", text: "TX confirmed: 0x2b1c...f40a | Budget: 82.75 USDT remaining" },
  { time: "00:00:18", type: "warn", text: "Budget Guardian: 7.0% of session budget consumed. Adjusting rate..." },
  { time: "00:00:20", type: "system", text: "Rate limiter engaged. Next evaluation in 30s..." },
];

function getLogColor(type: string) {
  switch (type) {
    case "system":
      return "text-zinc-500";
    case "info":
      return "text-[#00D4FF]";
    case "event":
      return "text-[#A855F7]";
    case "think":
      return "text-[#F5A623]/80 italic";
    case "action":
      return "text-[#00D4FF]";
    case "success":
      return "text-emerald-400";
    case "warn":
      return "text-[#F5A623]";
    default:
      return "text-zinc-400";
  }
}

function getLogPrefix(type: string) {
  switch (type) {
    case "system":
      return "[SYS]";
    case "info":
      return "[INF]";
    case "event":
      return "[EVT]";
    case "think":
      return "[LLM]";
    case "action":
      return "[ACT]";
    case "success":
      return "[OK!]";
    case "warn":
      return "[WRN]";
    default:
      return "[---]";
  }
}

function AgentLog() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= LOG_LINES.length) {
          // Reset after a pause
          setTimeout(() => setVisibleLines(0), 2000);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="font-[family-name:var(--font-jetbrains)] text-sm leading-relaxed">
      {LOG_LINES.slice(0, visibleLines).map((line, i) => (
        <div key={i} className={`log-line flex gap-3 py-1 ${getLogColor(line.type)}`}>
          <span className="text-zinc-600 shrink-0">{line.time}</span>
          <span className="shrink-0 font-bold w-[4ch]">{getLogPrefix(line.type)}</span>
          <span>{line.text}</span>
        </div>
      ))}
      {visibleLines < LOG_LINES.length && (
        <div className="flex gap-3 py-1">
          <span className="text-zinc-600">{">"}</span>
          <span className="cursor-blink text-[#00D4FF]" />
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#A855F7] flex items-center justify-center">
              <span className="font-[family-name:var(--font-syne)] font-bold text-black text-sm">
                R
              </span>
            </div>
            <span className="font-[family-name:var(--font-syne)] font-bold text-lg tracking-tight">
              Rumble Pulse
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#agent-log" className="hover:text-white transition-colors">
              Agent Log
            </a>
            <a href="#tech-stack" className="hover:text-white transition-colors">
              Stack
            </a>
          </div>
          <a
            href="#"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20 hover:bg-[#00D4FF]/20 transition-all"
          >
            Launch Agent
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero-bg relative min-h-screen flex items-center justify-center pt-16">
        {/* Replace this div's background with your iridescent wave PNG */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "url('/hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00D4FF]/20 bg-[#00D4FF]/5 text-[#00D4FF] text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" />
              Powered by Tether WDK
            </div>
          </div>

          <h1 className="animate-fade-in-up animation-delay-200 font-[family-name:var(--font-syne)] text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05]">
            Let Your Agent
            <br />
            <span className="bg-gradient-to-r from-[#00D4FF] via-[#A855F7] to-[#F5A623] bg-clip-text text-transparent">
              Tip For You
            </span>
          </h1>

          <p className="animate-fade-in-up animation-delay-400 mt-8 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Autonomous, event-driven tipping infrastructure for Rumble creators
            — powered by Tether WDK
          </p>

          <div className="animate-fade-in-up animation-delay-600 mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl bg-[#00D4FF] text-black hover:shadow-[0_0_40px_rgba(0,212,255,0.4)] transition-all duration-300"
            >
              Launch Agent
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="ml-2 group-hover:translate-x-1 transition-transform"
              >
                <path
                  d="M4 10H16M16 10L11 5M16 10L11 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <a
              href="#"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-all duration-300"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="mr-2"
              >
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.138 18.163 20 14.418 20 10c0-5.523-4.477-10-10-10z"
                  clipRule="evenodd"
                />
              </svg>
              View on GitHub
            </a>
          </div>

          {/* Stats bar */}
          <div className="animate-fade-in-up animation-delay-800 mt-20 grid grid-cols-3 gap-8 max-w-xl mx-auto">
            <div className="text-center">
              <div className="font-[family-name:var(--font-syne)] text-3xl font-bold text-[#00D4FF] glow-cyan">
                24/7
              </div>
              <div className="text-sm text-zinc-500 mt-1">Autonomous</div>
            </div>
            <div className="text-center">
              <div className="font-[family-name:var(--font-syne)] text-3xl font-bold text-[#F5A623] glow-amber">
                &lt;2s
              </div>
              <div className="text-sm text-zinc-500 mt-1">Tip Latency</div>
            </div>
            <div className="text-center">
              <div className="font-[family-name:var(--font-syne)] text-3xl font-bold text-[#A855F7] glow-purple">
                100%
              </div>
              <div className="text-sm text-zinc-500 mt-1">Onchain</div>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-[#00D4FF] text-sm font-medium tracking-widest uppercase">
              How It Works
            </span>
            <h2 className="font-[family-name:var(--font-syne)] text-4xl sm:text-5xl font-bold mt-4">
              Three Steps to{" "}
              <span className="text-[#00D4FF]">Autonomous</span> Tipping
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 md:gap-6 items-center">
            {/* Step 1 */}
            <div className="glass-card p-8 text-center relative">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/20">
                <RulesIcon />
              </div>
              <div className="font-[family-name:var(--font-jetbrains)] text-[#00D4FF] text-xs tracking-widest mb-3">
                STEP 01
              </div>
              <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold mb-3">
                Set Your Rules
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Define tip triggers, budget limits, and creator allowlists. Your
                agent follows your policy — always.
              </p>
            </div>

            {/* Arrow 1→2 */}
            <div className="hidden md:flex items-center justify-center px-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12H19M19 12L13 6M19 12L13 18"
                  stroke="url(#arrow-grad-1)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="arrow-grad-1" x1="5" y1="12" x2="19" y2="12">
                    <stop stopColor="#00D4FF" />
                    <stop offset="1" stopColor="#A855F7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Step 2 */}
            <div className="glass-card p-8 text-center relative">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-2xl bg-[#A855F7]/10 border border-[#A855F7]/20">
                <WatchIcon />
              </div>
              <div className="font-[family-name:var(--font-jetbrains)] text-[#A855F7] text-xs tracking-widest mb-3">
                STEP 02
              </div>
              <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold mb-3">
                Agent Watches
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                The AI agent monitors Rumble streams in real-time — tracking
                engagement, sentiment, and events.
              </p>
            </div>

            {/* Arrow 2→3 */}
            <div className="hidden md:flex items-center justify-center px-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12H19M19 12L13 6M19 12L13 18"
                  stroke="url(#arrow-grad-2)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="arrow-grad-2" x1="5" y1="12" x2="19" y2="12">
                    <stop stopColor="#A855F7" />
                    <stop offset="1" stopColor="#F5A623" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Step 3 */}
            <div className="glass-card p-8 text-center relative">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-2xl bg-[#F5A623]/10 border border-[#F5A623]/20">
                <TipIcon />
              </div>
              <div className="font-[family-name:var(--font-jetbrains)] text-[#F5A623] text-xs tracking-widest mb-3">
                STEP 03
              </div>
              <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold mb-3">
                Tips Execute Onchain
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                USDT tips are sent via Tether WDK — fast, transparent, and fully
                onchain with no middleman.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-32 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00D4FF]/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-20">
            <span className="text-[#A855F7] text-sm font-medium tracking-widest uppercase">
              Features
            </span>
            <h2 className="font-[family-name:var(--font-syne)] text-4xl sm:text-5xl font-bold mt-4">
              Built for{" "}
              <span className="text-[#A855F7]">Intelligent</span> Tipping
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Smart Treasury Split */}
            <div className="gradient-border-card p-8 relative z-10 bg-black">
              <div className="relative z-10">
                <div className="w-12 h-12 mb-6 rounded-xl bg-[#00D4FF]/10 flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#00D4FF"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6V12L16 14" strokeLinecap="round" />
                    <path d="M8 2L12 6L16 2" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold mb-3">
                  Smart Treasury Split
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  Automatically partition funds into tip pool, reserve, and gas
                  buffer. Dynamic rebalancing based on stream performance.
                </p>
                <div className="flex gap-3">
                  <span className="px-3 py-1 text-xs rounded-full bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20">
                    Auto-Split
                  </span>
                  <span className="px-3 py-1 text-xs rounded-full bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20">
                    Rebalance
                  </span>
                </div>
              </div>
            </div>

            {/* LLM Reasoning */}
            <div className="gradient-border-card p-8 relative z-10 bg-black">
              <div className="relative z-10">
                <div className="w-12 h-12 mb-6 rounded-xl bg-[#A855F7]/10 flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#A855F7"
                    strokeWidth="2"
                  >
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                    <path d="M2 17L12 22L22 17" />
                    <path d="M2 12L12 17L22 12" />
                  </svg>
                </div>
                <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold mb-3">
                  LLM Reasoning
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  Every tip decision passes through an LLM reasoning layer —
                  evaluating engagement quality, sentiment, and creator context.
                </p>
                <div className="flex gap-3">
                  <span className="px-3 py-1 text-xs rounded-full bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20">
                    AI-Driven
                  </span>
                  <span className="px-3 py-1 text-xs rounded-full bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20">
                    Context-Aware
                  </span>
                </div>
              </div>
            </div>

            {/* Budget Guardian */}
            <div className="gradient-border-card p-8 relative z-10 bg-black">
              <div className="relative z-10">
                <div className="w-12 h-12 mb-6 rounded-xl bg-[#F5A623]/10 flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#F5A623"
                    strokeWidth="2"
                  >
                    <path
                      d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
                      strokeLinejoin="round"
                    />
                    <path d="M9 12L11 14L15 10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold mb-3">
                  Budget Guardian
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  Hard caps, rate limiting, and anomaly detection ensure your
                  treasury is never drained. Configurable per-session and global
                  limits.
                </p>
                <div className="flex gap-3">
                  <span className="px-3 py-1 text-xs rounded-full bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/20">
                    Rate Limit
                  </span>
                  <span className="px-3 py-1 text-xs rounded-full bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/20">
                    Hard Cap
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Agent Log ── */}
      <section id="agent-log" className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#F5A623] text-sm font-medium tracking-widest uppercase">
              Live Preview
            </span>
            <h2 className="font-[family-name:var(--font-syne)] text-4xl sm:text-5xl font-bold mt-4">
              Agent <span className="text-[#F5A623]">Thought</span> Process
            </h2>
            <p className="text-zinc-400 mt-4 max-w-lg mx-auto">
              Watch the autonomous agent reason, evaluate, and execute tips in
              real-time.
            </p>
          </div>

          <div className="glass-card overflow-hidden">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <span className="ml-4 font-[family-name:var(--font-jetbrains)] text-xs text-zinc-500">
                rumble-pulse-agent — session_0x7f3a
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-[family-name:var(--font-jetbrains)] text-xs text-emerald-400">
                  LIVE
                </span>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="p-6 min-h-[400px] max-h-[500px] overflow-y-auto">
              <AgentLog />
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section id="tech-stack" className="py-32 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#A855F7]/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <span className="text-[#00D4FF] text-sm font-medium tracking-widest uppercase">
              Tech Stack
            </span>
            <h2 className="font-[family-name:var(--font-syne)] text-4xl sm:text-5xl font-bold mt-4">
              Built With the <span className="text-[#00D4FF]">Best</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* WDK by Tether */}
            <div className="glass-card p-8 flex flex-col items-center gap-4 text-center group hover:border-[#00D4FF]/30">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00D4FF]/20 to-[#00D4FF]/5 flex items-center justify-center border border-[#00D4FF]/20 group-hover:shadow-[0_0_20px_rgba(0,212,255,0.2)] transition-all">
                <span className="font-[family-name:var(--font-syne)] font-bold text-[#00D4FF] text-lg">
                  W
                </span>
              </div>
              <div>
                <div className="font-[family-name:var(--font-syne)] font-bold text-sm">
                  WDK by Tether
                </div>
                <div className="text-zinc-500 text-xs mt-1">Wallet Development Kit</div>
              </div>
            </div>

            {/* OpenClaw */}
            <div className="glass-card p-8 flex flex-col items-center gap-4 text-center group hover:border-[#A855F7]/30">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#A855F7]/20 to-[#A855F7]/5 flex items-center justify-center border border-[#A855F7]/20 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all">
                <span className="font-[family-name:var(--font-syne)] font-bold text-[#A855F7] text-lg">
                  OC
                </span>
              </div>
              <div>
                <div className="font-[family-name:var(--font-syne)] font-bold text-sm">
                  OpenClaw
                </div>
                <div className="text-zinc-500 text-xs mt-1">Agent Framework</div>
              </div>
            </div>

            {/* USDT */}
            <div className="glass-card p-8 flex flex-col items-center gap-4 text-center group hover:border-[#F5A623]/30">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F5A623]/20 to-[#F5A623]/5 flex items-center justify-center border border-[#F5A623]/20 group-hover:shadow-[0_0_20px_rgba(245,166,35,0.2)] transition-all">
                <span className="font-[family-name:var(--font-syne)] font-bold text-[#F5A623] text-lg">
                  ₮
                </span>
              </div>
              <div>
                <div className="font-[family-name:var(--font-syne)] font-bold text-sm">USDT</div>
                <div className="text-zinc-500 text-xs mt-1">Stablecoin Payments</div>
              </div>
            </div>

            {/* TypeScript */}
            <div className="glass-card p-8 flex flex-col items-center gap-4 text-center group hover:border-[#3178C6]/30">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3178C6]/20 to-[#3178C6]/5 flex items-center justify-center border border-[#3178C6]/20 group-hover:shadow-[0_0_20px_rgba(49,120,198,0.2)] transition-all">
                <span className="font-[family-name:var(--font-syne)] font-bold text-[#3178C6] text-lg">
                  TS
                </span>
              </div>
              <div>
                <div className="font-[family-name:var(--font-syne)] font-bold text-sm">
                  TypeScript
                </div>
                <div className="text-zinc-500 text-xs mt-1">Type-Safe Codebase</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#00D4FF] to-[#A855F7] flex items-center justify-center">
              <span className="font-[family-name:var(--font-syne)] font-bold text-black text-xs">
                R
              </span>
            </div>
            <span className="font-[family-name:var(--font-syne)] font-semibold text-sm">
              Rumble Pulse Agent
            </span>
          </div>
          <p className="text-zinc-600 text-sm">
            Autonomous tipping infrastructure for the creator economy.
          </p>
          <div className="flex items-center gap-6 text-zinc-500 text-sm">
            <a href="#" className="hover:text-white transition-colors">
              GitHub
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Docs
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
