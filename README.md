# Rumble Pulse Agent

Autonomous AI-powered tipping agent for Rumble creators. Monitors live stream events in real-time, uses LLM reasoning to evaluate engagement signals, and executes USDT tips via Tether's WDK — all non-custodial, all on-chain.

Built for **Hackathon Galactica: WDK Edition 1** by Tether.

## How It Works

```
Stream Events ──→ Agent Brain ──→ WDK Execution ──→ On-chain Tips
(viewer spike,     (Claude LLM     (self-custodial    (USDT with
 milestones,        evaluates &      wallet, budget     smart split)
 sentiment)         scores event)    validation)
```

**Flow:**

1. **Event Layer** — Stream events (viewer spikes, new subscribers, milestones, sentiment shifts, donations) are captured in real-time
2. **Agent Brain** — Claude evaluates each event with full context: event significance, budget state, spending history. Returns a typed decision: tip or skip, with reasoning
3. **Budget Guardian** — Validates against session limits, per-tip caps, and rate limiting before any transaction
4. **Smart Split** — Each tip is automatically split: 80% creator, 10% editor, 10% community pool
5. **WDK Execution** — Tether WDK sends the USDT transfer on-chain. Non-custodial — private keys never leave the app

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── dashboard/page.tsx    # Real-time agent dashboard
│   └── api/
│       ├── agent/route.ts    # POST/GET: evaluate events, execute tips
│       ├── wallet/route.ts   # GET wallet state, POST reset/update budget
│       └── events/route.ts   # SSE stream for real-time agent logs
└── lib/
    ├── agent.ts              # LLM reasoning engine (Claude) + rule-based fallback
    ├── wdk.ts                # WDK wallet operations + budget management
    └── types.ts              # Shared TypeScript types
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, TypeScript |
| Agent | Vercel AI SDK + Claude (Haiku 4.5) with Zod structured output |
| Wallet | WDK by Tether (`@tetherto/wdk` + `@tetherto/wdk-wallet-evm`) |
| Tokens | USDT (ERC-20) on Ethereum |
| Streaming | Server-Sent Events (SSE) for real-time dashboard |
| Video | hls.js for Mux HLS streaming |

## Setup

### Prerequisites

- Node.js >= 18
- npm

### 1. Clone & Install

```bash
git clone https://github.com/rumble-agent/frontend.git
cd frontend
npm install
```

### 2. Environment Variables

Create `.env.local` in the project root:

```env
# WDK — generate a seed phrase:
# node -e "const WDK = require('@tetherto/wdk'); console.log(WDK.default.getRandomSeedPhrase())"
WDK_SEED_PHRASE="your twelve word seed phrase here"

# EVM RPC Provider
WDK_EVM_PROVIDER="https://sepolia.drpc.org"

# USDT Contract Address
# Sepolia: use test ERC-20 address
# Mainnet: 0xdAC17F958D2ee523a2206206994597C13D831ec7
USDT_CONTRACT_ADDRESS="0xdAC17F958D2ee523a2206206994597C13D831ec7"

# Chain identifier
WDK_CHAIN="ethereum-sepolia"

# Anthropic API Key (for Claude LLM reasoning)
# Get one at: https://console.anthropic.com
ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Run

```bash
npm run dev
```

- Landing page: [http://localhost:3000](http://localhost:3000)
- Agent dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

### 4. Testnet Faucets

Your wallet address is displayed on the dashboard. Fund it with:

- **Sepolia ETH** (for gas): [faucets.chain.link/sepolia](https://faucets.chain.link/sepolia)
- **Test ERC-20**: [dashboard.pimlico.io/test-erc20-faucet](https://dashboard.pimlico.io/test-erc20-faucet)

## Features

### Agent Intelligence
- LLM-powered evaluation using Claude Haiku 4.5 via Vercel AI SDK
- Structured output with Zod schema — typed decisions, not free-text parsing
- Contextual reasoning: considers event type, magnitude, sentiment, and budget state
- Automatic fallback to rule-based scoring if API key not configured or LLM fails

### WDK Wallet Integration
- Non-custodial wallet via `@tetherto/wdk` — seed phrase never leaves the app
- Real on-chain ERC-20 (USDT) transfers via `account.transfer()`
- Balance queries with proper decimal handling (6 decimals for USDT)
- Safety guard: `transferMaxFee` prevents runaway gas costs

### Budget Guardian
- **Session budget**: configurable max spend per session (default: 50 USDT)
- **Per-tip cap**: max amount per individual tip (default: 5 USDT)
- **Rate limiting**: minimum interval between tips (default: 30s)
- Budget resets available from dashboard

### Smart Split
Each tip is automatically distributed:
- 80% → Creator
- 10% → Editor/collaborator
- 10% → Community pool

Split percentages are configurable via API.

### Real-time Dashboard
- Live agent log via Server-Sent Events (SSE)
- Wallet balance and address display
- Budget progress bar with color-coded thresholds
- Start/stop agent, trigger single events, reset budget
- Last decision panel showing score, amount, and reasoning

## API Reference

### `GET /api/agent`
Trigger a mock event for demo/testing. Returns agent decision + transaction results.

### `POST /api/agent`
Evaluate a custom event.
```json
{
  "event": {
    "type": "viewer_spike",
    "timestamp": 1711000000000,
    "data": { "viewer_count": 5000, "previous_viewer_count": 1000 }
  },
  "creator_address": "0x..."
}
```

### `GET /api/wallet`
Returns wallet state (address, balance) and budget info.

### `POST /api/wallet`
Reset budget or update config.
```json
{ "action": "reset_budget" }
```

### `GET /api/events`
SSE stream of real-time agent log entries.

## Third-Party Services

| Service | Purpose |
|---|---|
| [Anthropic Claude API](https://anthropic.com) | LLM reasoning for event evaluation |
| [dRPC](https://drpc.org) | Ethereum RPC provider (Sepolia) |
| [Tether WDK](https://docs.wallet.tether.io) | Non-custodial wallet SDK |

## Known Limitations

- Mock event simulator — real Rumble stream event integration requires Rumble API access
- Editor and community pool recipient addresses are placeholders
- Budget state is in-memory (resets on server restart)
- Single EVM chain at a time (configurable via env)

## License

[Apache 2.0](LICENSE)
