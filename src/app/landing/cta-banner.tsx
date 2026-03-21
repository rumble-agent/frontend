import { Reveal } from "./reveal";

export function CTABanner() {
  return (
    <section className="cta-banner py-24 px-6 border-t border-white/[0.04]">
      <div className="max-w-2xl mx-auto text-center">
        <Reveal>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-4">
            Ready to automate your tips?
          </h2>
          <p className="text-zinc-500 text-base leading-relaxed mb-10 max-w-lg mx-auto">
            Set up your agent in under a minute. Configure your budget,
            connect to Rumble, and let AI handle the rest.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/dashboard"
              className="cta-primary btn-press inline-flex items-center px-6 py-3 text-sm font-medium rounded-lg bg-white text-black"
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
              className="btn-press inline-flex items-center px-6 py-3 text-sm font-medium rounded-lg text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="mr-2" aria-hidden="true">
                <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" clipRule="evenodd" />
              </svg>
              View Source
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
