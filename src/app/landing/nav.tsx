"use client";

import { useState } from "react";

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

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
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
  );
}
