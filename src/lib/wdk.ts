import type { WalletState, TipSplit, TxResult, BudgetConfig, BudgetTracker } from "./types";

/* ─── Default Budget Config ─── */
const DEFAULT_BUDGET: BudgetConfig = {
  max_per_session: 50,
  max_per_tip: 5,
  rate_limit_seconds: 30,
  split_rules: {
    creator: 0.8,
    editor: 0.1,
    charity: 0.1,
  },
};

/* ─── In-memory state (will be replaced with persistent store) ─── */
let budgetTracker: BudgetTracker = {
  spent_this_session: 0,
  tips_count: 0,
  last_tip_at: null,
  remaining: DEFAULT_BUDGET.max_per_session,
};

let budgetConfig: BudgetConfig = { ...DEFAULT_BUDGET };

/* ─── Budget Management ─── */
export function getBudget(): BudgetTracker & { config: BudgetConfig } {
  return { ...budgetTracker, config: budgetConfig };
}

export function updateBudgetConfig(config: Partial<BudgetConfig>): BudgetConfig {
  budgetConfig = { ...budgetConfig, ...config };
  budgetTracker.remaining = budgetConfig.max_per_session - budgetTracker.spent_this_session;
  return budgetConfig;
}

export function resetBudget(): void {
  budgetTracker = {
    spent_this_session: 0,
    tips_count: 0,
    last_tip_at: null,
    remaining: budgetConfig.max_per_session,
  };
}

/* ─── Budget Validation ─── */
export function canTip(amount: number): { allowed: boolean; reason?: string } {
  if (amount > budgetConfig.max_per_tip) {
    return { allowed: false, reason: `Amount ${amount} exceeds max per tip (${budgetConfig.max_per_tip})` };
  }
  if (amount > budgetTracker.remaining) {
    return { allowed: false, reason: `Amount ${amount} exceeds remaining budget (${budgetTracker.remaining.toFixed(2)})` };
  }
  if (budgetTracker.last_tip_at) {
    const elapsed = (Date.now() - budgetTracker.last_tip_at) / 1000;
    if (elapsed < budgetConfig.rate_limit_seconds) {
      return { allowed: false, reason: `Rate limited. Wait ${Math.ceil(budgetConfig.rate_limit_seconds - elapsed)}s` };
    }
  }
  return { allowed: true };
}

/* ─── Calculate Tip Split ─── */
export function calculateSplit(amount: number, creatorAddress: string): TipSplit[] {
  const { split_rules } = budgetConfig;
  return [
    {
      recipient: creatorAddress,
      label: "Creator",
      percentage: split_rules.creator * 100,
      amount: Number((amount * split_rules.creator).toFixed(2)),
    },
    {
      recipient: "0x_editor_placeholder",
      label: "Editor",
      percentage: split_rules.editor * 100,
      amount: Number((amount * split_rules.editor).toFixed(2)),
    },
    {
      recipient: "0x_charity_placeholder",
      label: "Community Pool",
      percentage: split_rules.charity * 100,
      amount: Number((amount * split_rules.charity).toFixed(2)),
    },
  ];
}

/* ─── WDK Wallet Operations ─── */
// TODO: Replace with actual WDK SDK calls
// See: https://docs.wallet.tether.io

export async function getWalletState(): Promise<WalletState> {
  // TODO: Initialize WDK and query actual balance
  // const wdk = await initWDK(seed);
  // const balance = await wdk.getBalance('USDT');
  return {
    address: "0x_placeholder_wallet_address",
    balance: 142.5,
    currency: "USDT",
    chain: "ethereum-sepolia",
  };
}

export async function sendTip(
  amount: number,
  creatorAddress: string
): Promise<TxResult[]> {
  const validation = canTip(amount);
  if (!validation.allowed) {
    throw new Error(validation.reason);
  }

  const splits = calculateSplit(amount, creatorAddress);
  const results: TxResult[] = [];

  for (const split of splits) {
    // TODO: Replace with actual WDK transaction
    // const tx = await wdk.sendUSDT(split.recipient, split.amount);
    const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

    results.push({
      success: true,
      tx_hash: mockTxHash,
      amount: split.amount,
      recipient: split.recipient,
      chain: "ethereum-sepolia",
      timestamp: Date.now(),
    });
  }

  // Update budget tracker
  budgetTracker.spent_this_session += amount;
  budgetTracker.tips_count += 1;
  budgetTracker.last_tip_at = Date.now();
  budgetTracker.remaining = budgetConfig.max_per_session - budgetTracker.spent_this_session;

  return results;
}
