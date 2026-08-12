/**
 * Atomic cash + ledger mutation. Duplicate `ref` blocks BOTH cash and ledger.
 */
import {
  applyLedger,
  type FinanceLedger,
  type LedgerCategory,
} from "./ledger";

export type CashTxn = {
  week: number;
  amount: number;
  category: LedgerCategory;
  label: string;
  ref: string;
  gameId?: string;
  day?: number;
};

export type TxnResult = {
  cash: number;
  ledger: FinanceLedger;
  applied: boolean;
};

/** Round money to cents for stable equality (display still dollars). */
export function moneyRound(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Apply a cash delta only if the ledger accepts the ref (idempotent).
 * Cash and ledger stay in lockstep.
 */
export function applyCashTransaction(
  cash: number,
  ledger: FinanceLedger | null | undefined,
  entry: CashTxn,
): TxnResult {
  const amount = moneyRound(entry.amount);
  const before = ledger ?? { entries: [], balance: cash };
  if (entry.ref && before.entries.some((e) => e.ref === entry.ref)) {
    return { cash, ledger: before, applied: false };
  }
  const nextLedger = applyLedger(before, {
    week: entry.week,
    day: entry.day,
    amount,
    category: entry.category,
    label: entry.label,
    gameId: entry.gameId,
    ref: entry.ref,
  });
  return {
    cash: moneyRound(cash + amount),
    ledger: nextLedger,
    applied: true,
  };
}

export function ledgerBalance(
  ledger: FinanceLedger | null | undefined,
  fallbackCash: number,
): number {
  if (!ledger) return fallbackCash;
  return moneyRound(ledger.balance);
}
