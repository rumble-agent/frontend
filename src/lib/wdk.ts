import WDK from "@tetherto/wdk";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import { Contract } from "ethers";
import type { WalletState, TipSplit, TxResult, BudgetConfig, BudgetTracker } from "./types";

/* ─── WDK Singleton ─── */
const SEED_PHRASE = process.env.WDK_SEED_PHRASE ?? "";
const EVM_PROVIDER = process.env.WDK_EVM_PROVIDER ?? "https://sepolia.drpc.org";
const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS ?? "0xdAC17F958D2ee523a2206206994597C13D831ec7";
export const CHAIN = process.env.WDK_CHAIN ?? "ethereum-sepolia";
const USDT_DECIMALS = 6;

const EDITOR_ADDRESS = process.env.EDITOR_WALLET_ADDRESS ?? "0x000000000000000000000000000000000000dEaD";
const CHARITY_ADDRESS = process.env.CHARITY_WALLET_ADDRESS ?? "0x000000000000000000000000000000000000dEaD";
const TIP_SPLITTER_ADDRESS = process.env.TIP_SPLITTER_ADDRESS ?? "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wdkInstance: InstanceType<typeof WDK> | null = null;

function getWDK(): InstanceType<typeof WDK> {
  if (!SEED_PHRASE || SEED_PHRASE.includes("your twelve word")) {
    throw new Error("WDK_SEED_PHRASE not configured. Set it in .env.local");
  }
  if (!wdkInstance) {
    wdkInstance = new WDK(SEED_PHRASE);
    wdkInstance.registerWallet("ethereum", WalletManagerEvm, {
      provider: EVM_PROVIDER,
      transferMaxFee: 100000000000000, // 0.0001 ETH max fee safety guard
    });
  }
  return wdkInstance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAccount(): Promise<any> {
  const wdk = getWDK();
  return wdk.getAccount("ethereum", 0);
}

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
  budgetConfig = {
    ...budgetConfig,
    ...config,
    split_rules: config.split_rules
      ? { ...budgetConfig.split_rules, ...config.split_rules }
      : budgetConfig.split_rules,
  };
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

/* ─── Calculate Tip Split (remainder goes to last recipient to avoid rounding loss) ─── */
export function calculateSplit(amount: number, creatorAddress: string): TipSplit[] {
  const { split_rules } = budgetConfig;
  const creatorAmount = Number((amount * split_rules.creator).toFixed(2));
  const editorAmount = Number((amount * split_rules.editor).toFixed(2));
  // Remainder to community pool — ensures splits sum to exactly `amount`
  const communityAmount = Number((amount - creatorAmount - editorAmount).toFixed(2));

  return [
    {
      recipient: creatorAddress,
      label: "Creator",
      percentage: split_rules.creator * 100,
      amount: creatorAmount,
    },
    {
      recipient: EDITOR_ADDRESS,
      label: "Editor",
      percentage: split_rules.editor * 100,
      amount: editorAmount,
    },
    {
      recipient: CHARITY_ADDRESS,
      label: "Community Pool",
      percentage: split_rules.charity * 100,
      amount: communityAmount,
    },
  ];
}

/* ─── WDK Wallet Operations ─── */

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
  const account = await getAccount();
  const address: string = await account.getAddress();

  // Query ERC-20 USDT balance
  let balance = 0;
  try {
    const erc20 = new Contract(USDT_CONTRACT, [
      "function balanceOf(address) view returns (uint256)",
    ]);
    const data = erc20.interface.encodeFunctionData("balanceOf", [address]);
    const result: string = await account._provider.call({ to: USDT_CONTRACT, data });
    if (result && result !== "0x") {
      balance = fromUsdtUnits(BigInt(result));
    }
  } catch {
    console.warn("USDT balance query failed, returning 0");
    balance = 0;
  }

  return { address, balance, currency: "USDT", chain: CHAIN };
}

export async function sendTip(
  amount: number,
  creatorAddress: string
): Promise<TxResult[]> {
  const validation = canTip(amount);
  if (!validation.allowed) {
    throw new Error(validation.reason);
  }

  // Use TipSplitter contract if deployed, otherwise fallback to direct transfers
  if (TIP_SPLITTER_ADDRESS) {
    return sendTipViaSplitter(amount, creatorAddress);
  }
  return sendTipDirect(amount, creatorAddress);
}

/* ─── Atomic tip via TipSplitter contract (single tx) ─── */
async function sendTipViaSplitter(
  amount: number,
  creatorAddress: string
): Promise<TxResult[]> {
  const account = await getAccount();
  const address: string = await account.getAddress();
  const totalUnits = toUsdtUnits(amount);
  const splits = calculateSplit(amount, creatorAddress);

  const { split_rules } = budgetConfig;
  const creatorBps = Math.round(split_rules.creator * 10000);
  const editorBps = Math.round(split_rules.editor * 10000);

  const splitterAbi = new Contract(TIP_SPLITTER_ADDRESS, [
    "function tipWithSplit(uint256 amount, address creator, address editor, address community, uint256 creatorBps, uint256 editorBps) external",
  ]);
  const erc20Abi = new Contract(USDT_CONTRACT, [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ]);

  try {
    // Step 1: Check current allowance and approve if needed
    const allowanceData = erc20Abi.interface.encodeFunctionData("allowance", [address, TIP_SPLITTER_ADDRESS]);
    const allowanceResult: string = await account._provider.call({ to: USDT_CONTRACT, data: allowanceData });
    const currentAllowance = BigInt(allowanceResult || "0x0");

    if (currentAllowance < totalUnits) {
      // USDT requires resetting allowance to 0 before setting a new non-zero value
      if (currentAllowance > BigInt(0)) {
        const resetData = erc20Abi.interface.encodeFunctionData("approve", [TIP_SPLITTER_ADDRESS, 0]);
        await account.sendTransaction({ to: USDT_CONTRACT, data: resetData });
      }
      const approveData = erc20Abi.interface.encodeFunctionData("approve", [TIP_SPLITTER_ADDRESS, totalUnits]);
      await account.sendTransaction({ to: USDT_CONTRACT, data: approveData });
    }

    // Step 2: Call tipWithSplit — single atomic transaction
    const tipData = splitterAbi.interface.encodeFunctionData("tipWithSplit", [
      totalUnits,
      creatorAddress,
      EDITOR_ADDRESS,
      CHARITY_ADDRESS,
      creatorBps,
      editorBps,
    ]);
    const { hash } = await account.sendTransaction({ to: TIP_SPLITTER_ADDRESS, data: tipData });

    // All splits succeeded atomically
    const results: TxResult[] = splits.map((split) => ({
      success: true,
      tx_hash: hash,
      amount: split.amount,
      recipient: split.recipient,
      chain: CHAIN,
      timestamp: Date.now(),
    }));

    budgetTracker.spent_this_session += amount;
    budgetTracker.tips_count += 1;
    budgetTracker.last_tip_at = Date.now();
    budgetTracker.remaining = budgetConfig.max_per_session - budgetTracker.spent_this_session;

    return results;
  } catch (err) {
    console.error("TipSplitter failed:", err instanceof Error ? err.message : err);
    return splits.map((split) => ({
      success: false,
      tx_hash: "",
      amount: split.amount,
      recipient: split.recipient,
      chain: CHAIN,
      timestamp: Date.now(),
    }));
  }
}

/* ─── Fallback: direct transfers (3 separate txs) ─── */
async function sendTipDirect(
  amount: number,
  creatorAddress: string
): Promise<TxResult[]> {
  const account = await getAccount();
  const splits = calculateSplit(amount, creatorAddress);
  const results: TxResult[] = [];

  for (const split of splits) {
    try {
      const { hash } = await account.transfer({
        token: USDT_CONTRACT,
        recipient: split.recipient,
        amount: toUsdtUnits(split.amount),
      });

      results.push({
        success: true,
        tx_hash: hash,
        amount: split.amount,
        recipient: split.recipient,
        chain: CHAIN,
        timestamp: Date.now(),
      });
    } catch (err) {
      results.push({
        success: false,
        tx_hash: "",
        amount: split.amount,
        recipient: split.recipient,
        chain: CHAIN,
        timestamp: Date.now(),
      });
      console.error(`Transfer failed for ${split.label}:`, err instanceof Error ? err.message : err);
    }
  }

  // Update budget tracker based on actual successful amounts
  const successAmount = results.filter((r) => r.success).reduce((sum, r) => sum + r.amount, 0);
  if (successAmount > 0) {
    budgetTracker.spent_this_session += successAmount;
    budgetTracker.tips_count += 1;
    budgetTracker.last_tip_at = Date.now();
    budgetTracker.remaining = budgetConfig.max_per_session - budgetTracker.spent_this_session;
  }

  return results;
}
