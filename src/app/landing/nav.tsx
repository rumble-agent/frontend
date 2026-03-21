"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Agent Log", href: "#agent-log" },
  { label: "Stack", href: "#stack" },
];

function MobileMenu({
  open,
  activeSection,
  onClose,
}: {
  open: boolean;
  activeSection: string;
  onClose: () => void;
}) {
  return (
    <div
      className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
        open ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="border-t border-white/5 bg-black/95 backdrop-blur-xl">
        <div className="flex flex-col px-6 py-5 gap-0.5 text-[15px]">
          {NAV_LINKS.map((link, i) => {
            const isActive = activeSection === link.href.slice(1);
            return (
              <a
                key={link.label}
                href={link.href}
                className={`py-2.5 px-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "text-white bg-white/[0.06]"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                }`}
                style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
                onClick={onClose}
              >
                {link.label}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState("");

  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    setScrolled(scrollY > 20);

    // Scroll progress (direct DOM update, no re-render)
    if (progressRef.current) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0;
      progressRef.current.style.transform = `scaleX(${progress})`;
    }

    // Active section detection
    const sections = NAV_LINKS.map((l) => l.href.slice(1));
    let current = "";
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) current = id;
      }
    }
    setActiveSection(current);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#050505]/90 backdrop-blur-2xl shadow-[0_1px_12px_rgba(0,0,0,0.4)]"
          : "bg-[#050505]/60 backdrop-blur-xl"
      }`}
    >
      {/* Scroll progress bar */}
      <div
        ref={progressRef}
        className="absolute bottom-0 left-0 w-full h-[1px] bg-[#00D4FF]/50 origin-left"
        style={{ transform: "scaleX(0)" }}
      />

      {/* Bottom border with subtle glow when scrolled */}
      <div className={`absolute bottom-0 left-0 right-0 h-px transition-opacity duration-300 ${
        scrolled ? "opacity-100" : "opacity-40"
      }`}>
        <div className="h-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <img
            src="/rumble-icon.svg"
            alt=""
            width={24}
            height={24}
            className="shrink-0 transition-transform duration-200 group-hover:scale-110"
            aria-hidden="true"
          />
          <span className="font-heading font-bold text-[15px] tracking-[-0.02em] transition-colors duration-200 group-hover:text-[#00D4FF]">
            Rumble Pulse
          </span>
        </a>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1 text-[13px]">
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.href.slice(1);
            return (
              <a
                key={link.label}
                href={link.href}
                className={`relative px-3 py-1.5 rounded-md transition-all duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {/* Active background */}
                <span
                  className={`absolute inset-0 rounded-md bg-white/[0.06] transition-opacity duration-200 ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                />
                {/* Hover underline */}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px bg-[#00D4FF] transition-all duration-200 opacity-0 w-0 group-hover:opacity-100 group-hover:w-4" />
                <span className="relative">{link.label}</span>
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* Launch Agent CTA */}
          <a
            href="/dashboard"
            className="hidden sm:inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-100 active:scale-[0.97] transition-all duration-200 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_16px_rgba(255,255,255,0.05)]"
          >
            Launch Agent
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="ml-1.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>

          {/* Mobile hamburger */}
          <button
            className="md:hidden w-9 h-9 flex flex-col justify-center items-center gap-[5px] rounded-lg hover:bg-white/[0.04] active:scale-[0.95] transition-all duration-200"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span className={`block w-4 h-[1.5px] bg-zinc-400 transition-all duration-300 ease-out ${menuOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
            <span className={`block w-4 h-[1.5px] bg-zinc-400 transition-all duration-300 ease-out ${menuOpen ? "opacity-0 scale-x-0" : ""}`} />
            <span className={`block w-4 h-[1.5px] bg-zinc-400 transition-all duration-300 ease-out ${menuOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
          </button>
        </div>
      </div>

      <MobileMenu open={menuOpen} activeSection={activeSection} onClose={() => setMenuOpen(false)} />
    </nav>
  );
}
