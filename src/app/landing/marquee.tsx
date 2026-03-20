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

export function Marquee() {
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
