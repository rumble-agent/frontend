# Rumble Pulse Agent

Autonomous AI-powered tipping agent for Rumble creators. Monitors live stream events in real-time, uses LLM reasoning to evaluate engagement signals, and executes USDT tips via Tether's WDK — all non-custodial, all on-chain.

Built for **Hackathon Galactica: WDK Edition 1** by Tether.

## How It Works

```
Stream Events ──→ Agent Brain ──→ WDK Execution ──→ On-chain Tips
(viewer spike,     (Llama 4 LLM    (self-custodial    (USDT via
 milestones,        evaluates &      wallet, budget     TipSplitter
 sentiment)         scores event)    validation)        contract)
```

**Flow:**

1. **Event Layer** — Stream events (viewer spikes, new subscribers, milestones, sentiment shifts, donations) are captured from Rumble's Live Stream API in real-time
2. **Agent Brain** — Llama 4 Scout (via Groq) evaluates each event with full context: event significance, budget state, spending history. Returns a typed decision: tip or skip, with reasoning
3. **Budget Guardian** — Validates against session limits, per-tip caps, and rate limiting before any transaction
4. **TipSplitter Contract** — Tips are routed through an on-chain TipSplitter smart contract with configurable split ratios
5. **WDK Execution** — Tether WDK sends the USDT transfer on-chain. Non-custodial — private keys never leave the app

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── landing/              # Landing page components
│   ├── dashboard/page.tsx    # Real-time agent dashboard
│   └── api/
│       ├── agent/route.ts    # POST/GET: evaluate events, execute tips
│       ├── rumble/route.ts   # Rumble live stream poller control
│       ├── wallet/route.ts   # GET wallet state, POST reset/update budget
│       ├── stats/route.ts    # GET agent stats + decision history
│       └── events/route.ts   # SSE stream for real-time agent logs
└── lib/
    ├── agent.ts              # LLM reasoning engine (Groq Llama 4) + rule-based fallback
    ├── wdk.ts                # WDK wallet operations + budget management + TipSplitter
    ├── rumble.ts             # Rumble Live Stream API poller with event diffing
    ├── mock-events.ts        # Mock event generator for testing
    ├── auth.ts               # Shared auth module
    └── types.ts              # Shared TypeScript types
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, TypeScript |
| Agent | Vercel AI SDK + Groq Llama 4 Scout with Zod structured output |
| Wallet | WDK by Tether (`@tetherto/wdk` + `@tetherto/wdk-wallet-evm`) |
| Contracts | TipSplitter (Solidity 0.8.24, OpenZeppelin, Hardhat) |
| Tokens | USDT (ERC-20) on Ethereum Sepolia |
| Streaming | Server-Sent Events (SSE) for real-time dashboard |
| Platform | Rumble Live Stream API v1.1 (polling-based) |

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

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Key variables:

```env
# Private key from MetaMask
WDK_PRIVATE_KEY="0x..."

# Groq API Key (free tier at https://console.groq.com/keys)
GROQ_API_KEY="gsk_..."

# USDT contract (deploy MockUSDT from contracts/ for testnet)
USDT_CONTRACT_ADDRESS="0x..."

# TipSplitter contract (deploy from contracts/)
TIP_SPLITTER_ADDRESS="0x..."

# Rumble Live Stream API URL (from https://rumble.com/account/livestream-api)
RUMBLE_API_URL="https://rumble.com/-livestream-api/..."
```

See `.env.example` for the full list with documentation.

### 3. Run

```bash
npm run dev
```

- Landing page: [http://localhost:3000](http://localhost:3000)
- Agent dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

### 4. Testnet Faucets

Your wallet address is displayed on the dashboard. Fund it with:

- **Sepolia ETH** (for gas): [faucets.chain.link/sepolia](https://faucets.chain.link/sepolia)
- **MockUSDT**: Deploy from `contracts/` — has a public `mint()` function

## Features

### Agent Intelligence
- LLM-powered evaluation using Llama 4 Scout via Groq + Vercel AI SDK
- Structured output with Zod schema — typed decisions, not free-text parsing
- Contextual reasoning: considers event type, magnitude, sentiment, and budget state
- Automatic fallback to rule-based scoring if API key not configured or LLM fails

### Rumble Integration
- Real-time polling of Rumble's Live Stream API (viewer count, subscribers, rants, followers, chat)
- Event diffing: detects viewer spikes, new subscribers, donations, milestones, sentiment shifts
- Configurable poll interval (default: 8 seconds)

### WDK Wallet Integration
- Non-custodial wallet via `@tetherto/wdk` — private key never leaves the app
- Real on-chain ERC-20 (USDT) transfers via ethers.js
- TipSplitter smart contract for atomic on-chain tip splitting
- Balance queries with proper decimal handling (6 decimals for USDT)

### Budget Guardian
- **Session budget**: configurable max spend per session (default: 50 USDT)
- **Per-tip cap**: max amount per individual tip (default: 5 USDT)
- **Rate limiting**: minimum interval between tips (default: 30s)
- Tip mutex prevents concurrent transactions from overspending
- Budget resets available from dashboard

### Real-time Dashboard
- Live agent log via Server-Sent Events (SSE)
- Wallet balance and address display
- Budget progress bar with color-coded thresholds
- Rumble stream connection status
- Start/stop agent, trigger test events, reset budget
- Decision history with score, amount, and reasoning

## Smart Contracts

### TipSplitter.sol
Atomic tip splitting with configurable basis points (bps). Uses OpenZeppelin SafeERC20 and ReentrancyGuard.

### MockUSDT.sol
Test ERC-20 with 6 decimals and public `mint()` for Sepolia testing.

Deploy both:
```bash
cd contracts
npx hardhat ignition deploy ignition/modules/TipSplitter.ts --network sepolia
```

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

### `GET /api/stats`
Agent statistics and decision history.

### `GET/POST /api/rumble`
Start/stop Rumble live stream poller.

## Third-Party Services

| Service | Purpose |
|---|---|
| [Groq](https://groq.com) | LLM inference (Llama 4 Scout) for event evaluation |
| [dRPC](https://drpc.org) | Ethereum RPC provider (Sepolia) |
| [Tether WDK](https://docs.wallet.tether.io) | Non-custodial wallet SDK |
| [Rumble](https://rumble.com) | Live streaming platform + API |

## Known Limitations

- Budget state is in-memory (resets on server restart)
- Single EVM chain at a time (configurable via env)
- Rumble API data only available during active live streams

## License

[Apache 2.0](LICENSE)
