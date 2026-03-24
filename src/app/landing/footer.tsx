export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8 mb-12">
          {/* Branding */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/rumble-icon.svg" alt="" width={20} height={20} className="shrink-0 opacity-60" aria-hidden="true" />
              <span className="font-heading font-bold text-[14px] tracking-[-0.02em] text-zinc-300">
                Rumble Pulse
              </span>
            </div>
            <p className="text-[13px] text-zinc-600 leading-relaxed max-w-[240px]">
              Autonomous tipping agent for Rumble creators. Powered by Tether WDK.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-4">
              Navigate
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                { label: "How It Works", href: "#how-it-works" },
                { label: "Features", href: "#features" },
                { label: "Agent Log", href: "#agent-log" },
                { label: "Stack", href: "#stack" },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-[13px] text-zinc-500 hover:text-white transition-colors w-fit"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-4">
              Links
            </p>
            <div className="flex flex-col gap-2.5">
              <a
                href="https://github.com/rumble-agent"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-zinc-500 hover:text-white transition-colors w-fit inline-flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" clipRule="evenodd" />
                </svg>
                GitHub
              </a>
              <a
                href="/dashboard"
                className="text-[13px] text-zinc-500 hover:text-white transition-colors w-fit inline-flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Dashboard
              </a>
              <a
                href="https://dorahacks.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-zinc-500 hover:text-white transition-colors w-fit inline-flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                DoraHacks
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[12px] text-zinc-700">
            Built for Tether Hackathon Galactica: WDK Edition 1
          </span>
          <div className="flex items-center gap-4 text-[12px] text-zinc-700">
            <span>Apache 2.0</span>
            <span className="w-px h-3 bg-white/[0.06]" />
            <span>2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
