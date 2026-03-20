import { Contract, JsonRpcProvider, Wallet } from "ethers";
import type { WalletState, TxResult, BudgetConfig, BudgetTracker } from "./types";

/* ─── Config ─── */
const PRIVATE_KEY = process.env.WDK_PRIVATE_KEY ?? "";
const EVM_PROVIDER = process.env.WDK_EVM_PROVIDER ?? "https://sepolia.drpc.org";
const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS ?? "";
export const CHAIN = process.env.WDK_CHAIN ?? "ethereum-sepolia";
const USDT_DECIMALS = 6;

/* ─── Dynamic Creator Address ─── */
let creatorWallet: string = process.env.DEMO_CREATOR_ADDRESS ?? "";

export function getCreatorAddress(): string {
  return creatorWallet;
}

export function setCreatorAddress(address: string): void {
  creatorWallet = address;
}

/* ─── Wallet Singleton ─── */
let wallet: Wallet | null = null;

function getWallet(): Wallet {
  if (!PRIVATE_KEY) {
    throw new Error("WDK_PRIVATE_KEY not configured. Set it in .env.local");
  }
  if (!wallet) {
    const provider = new JsonRpcProvider(EVM_PROVIDER);
    wallet = new Wallet(PRIVATE_KEY, provider);
  }
  return wallet;
}

/* ─── Default Budget Config ─── */
const DEFAULT_BUDGET: BudgetConfig = {
  max_per_session: 50,
  max_per_tip: 5,
  rate_limit_seconds: 30,
};

/* ─── In-memory state ─── */
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

/* ─── Wallet Operations ─── */

/** Convert human-readable USDT amount to on-chain units (6 decimals).
 *  Uses string splitting to avoid IEEE 754 floating-point precision loss. */
function toUsdtUnits(amount: number): bigint {
  const parts = amount.toFixed(USDT_DECIMALS).split(".");
  const whole = BigInt(parts[0]) * BigInt(10 ** USDT_DECIMALS);
  const frac = BigInt(parts[1] ?? "0");
  return whole + frac;
}

/** Convert on-chain USDT units to human-readable amount */
function fromUsdtUnits(units: bigint): number {
  const divisor = BigInt(10 ** USDT_DECIMALS);
  const whole = Number(units / divisor);
  const frac = Number(units % divisor) / 10 ** USDT_DECIMALS;
  return whole + frac;
}

export async function getWalletState(): Promise<WalletState> {
  const w = getWallet();
  const address = w.address;

  // Query ERC-20 USDT balance
  let balance = 0;
  try {
    const erc20 = new Contract(USDT_CONTRACT, [
      "function balanceOf(address) view returns (uint256)",
    ]);
    const data = erc20.interface.encodeFunctionData("balanceOf", [address]);
    const provider = w.provider;
    if (!provider) throw new Error("No provider connected");
    const result: string = await provider.call({ to: USDT_CONTRACT, data });
    if (result && result !== "0x") {
      balance = fromUsdtUnits(BigInt(result));
    }
  } catch {
    console.warn("USDT balance query failed, returning 0");
    balance = 0;
  }

  return { address, balance, currency: "USDT", chain: CHAIN };
}

/** Send USDT tip directly to the creator — single ERC-20 transfer */
export async function sendTip(
  amount: number,
  creatorAddress: string
): Promise<TxResult[]> {
  const validation = canTip(amount);
  if (!validation.allowed) {
    throw new Error(validation.reason);
  }

  const w = getWallet();
  const units = toUsdtUnits(amount);

  try {
    const erc20 = new Contract(USDT_CONTRACT, [
      "function transfer(address to, uint256 amount) returns (bool)",
    ], w);
    const tx = await erc20.transfer(creatorAddress, units);

    // Update budget
    budgetTracker.spent_this_session += amount;
    budgetTracker.tips_count += 1;
    budgetTracker.last_tip_at = Date.now();
    budgetTracker.remaining = budgetConfig.max_per_session - budgetTracker.spent_this_session;

    return [{
      success: true,
      tx_hash: tx.hash,
      amount,
      recipient: creatorAddress,
      chain: CHAIN,
      timestamp: Date.now(),
    }];
  } catch (err) {
    console.error("Tip transfer failed:", err instanceof Error ? err.message : err);
    return [{
      success: false,
      tx_hash: "",
      amount,
      recipient: creatorAddress,
      chain: CHAIN,
      timestamp: Date.now(),
    }];
  }
}
