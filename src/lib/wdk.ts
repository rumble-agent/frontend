import { Contract, JsonRpcProvider, Wallet } from "ethers";
import type { WalletState, TxResult, BudgetConfig, BudgetTracker } from "./types";

/* ─── Config ─── */
const PRIVATE_KEY = process.env.WDK_PRIVATE_KEY ?? "";
const EVM_PROVIDER = process.env.WDK_EVM_PROVIDER ?? "https://sepolia.drpc.org";
const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS ?? "";
const TIP_SPLITTER = process.env.TIP_SPLITTER_ADDRESS ?? "";
export const CHAIN = process.env.WDK_CHAIN ?? "ethereum-sepolia";
const USDT_DECIMALS = 6;

/* ─── ABIs ─── */
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const TIP_SPLITTER_ABI = [
  "function tipWithSplit(uint256 amount, address creator, address editor, address community, uint256 creatorBps, uint256 editorBps)",
];

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
    throw new Error("WDK_PRIVATE_KEY not configured");
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(PRIVATE_KEY)) {
    throw new Error("WDK_PRIVATE_KEY format invalid");
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

/* ─── Tip mutex (prevents concurrent tips from overspending budget) ─── */
let tipInProgress = false;

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
  if (tipInProgress) {
    return { allowed: false, reason: "Another tip is in progress" };
  }
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
  const provider = w.provider;

  let balance = 0;
  let ethBalance = 0;

  if (provider) {
    // Fetch ETH balance (needed for gas)
    try {
      const ethRaw = await provider.getBalance(address);
      ethBalance = Number(ethRaw) / 1e18;
    } catch {
      console.warn("ETH balance query failed");
    }
  }

  if (USDT_CONTRACT && provider) {
    try {
      const erc20 = new Contract(USDT_CONTRACT, ERC20_ABI);
      const data = erc20.interface.encodeFunctionData("balanceOf", [address]);
      const result: string = await provider.call({ to: USDT_CONTRACT, data });
      if (result && result !== "0x") {
        balance = fromUsdtUnits(BigInt(result));
      }
    } catch {
      console.warn("USDT balance query failed, returning 0");
    }
  }

  return {
    address, balance, currency: "USDT", chain: CHAIN,
    eth_balance: Number(ethBalance.toFixed(6)),
    contracts: {
      usdt: USDT_CONTRACT || null,
      tip_splitter: TIP_SPLITTER || null,
    },
  };
}

/** Send USDT tip — routes through TipSplitter contract if configured, otherwise direct ERC-20 transfer */
export async function sendTip(
  amount: number,
  creatorAddress: string
): Promise<TxResult[]> {
  if (!USDT_CONTRACT) {
    throw new Error("USDT_CONTRACT_ADDRESS not configured");
  }

  const validation = canTip(amount);
  if (!validation.allowed) {
    throw new Error(validation.reason);
  }

  // Acquire mutex
  tipInProgress = true;

  const w = getWallet();
  const units = toUsdtUnits(amount);

  try {
    let txHash: string;

    if (TIP_SPLITTER) {
      // Route through TipSplitter contract
      const erc20 = new Contract(USDT_CONTRACT, ERC20_ABI, w);

      // USDT approve pattern: reset to 0 first, then set new allowance
      const resetTx = await erc20.approve(TIP_SPLITTER, 0);
      await resetTx.wait();
      const approveTx = await erc20.approve(TIP_SPLITTER, units);
      await approveTx.wait();

      // 100% to creator (10000 bps), editor/community = agent wallet (receives 0%)
      const splitter = new Contract(TIP_SPLITTER, TIP_SPLITTER_ABI, w);
      const tx = await splitter.tipWithSplit(units, creatorAddress, w.address, w.address, 10000, 0);
      const receipt = await tx.wait();
      if (!receipt || receipt.status === 0) {
        throw new Error("TipSplitter transaction reverted on-chain");
      }
      txHash = tx.hash;
    } else {
      // Fallback: direct ERC-20 transfer
      const erc20 = new Contract(USDT_CONTRACT, ERC20_ABI, w);
      const tx = await erc20.transfer(creatorAddress, units);
      const receipt = await tx.wait();
      if (!receipt || receipt.status === 0) {
        throw new Error("Transaction reverted on-chain");
      }
      txHash = tx.hash;
    }

    // Only update budget after confirmed success
    budgetTracker.spent_this_session += amount;
    budgetTracker.tips_count += 1;
    budgetTracker.last_tip_at = Date.now();
    budgetTracker.remaining = budgetConfig.max_per_session - budgetTracker.spent_this_session;

    return [{
      success: true,
      tx_hash: txHash,
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
  } finally {
    tipInProgress = false;
  }
}
