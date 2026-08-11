/**
 * Append-only cash ledger. Studio cash is still mirrored on GameState.cash;
 * ledger provides auditable history and never rerolls.
 */
export type LedgerCategory =
  | "sales"
  | "marketing"
  | "development"
  | "payroll"
  | "rent"
  | "research"
  | "contract"
  | "publisher"
  | "office"
  | "cheat"
  | "other";

export type LedgerEntry = {
  id: string;
  week: number;
  day?: number;
  amount: number;
  category: LedgerCategory;
  label: string;
  gameId?: string;
  /** Deterministic ref for dedupe (e.g. sales week). */
  ref?: string;
};

export type FinanceLedger = {
  entries: LedgerEntry[];
  /** Running balance after last entry (should match cash). */
  balance: number;
};

/** Cent-stable money (matches finance/transaction.moneyRound). */
function moneyRound(n: number): number {
  return Math.round(n * 100) / 100;
}

export function emptyLedger(startingCash = 0): FinanceLedger {
  return {
    entries:
      startingCash !== 0
        ? [
            {
              id: "open",
              week: 0,
              amount: startingCash,
              category: "other",
              label: "Opening balance",
              ref: "open",
            },
          ]
        : [],
    balance: startingCash,
  };
}

export function applyLedger(
  ledger: FinanceLedger | null | undefined,
  entry: Omit<LedgerEntry, "id"> & { id?: string },
): FinanceLedger {
  const base = ledger ?? emptyLedger(0);
  // Idempotent: same ref not applied twice
  if (entry.ref && base.entries.some((e) => e.ref === entry.ref)) {
    return base;
  }
  const id =
    entry.id ??
    `${entry.category}-${entry.week}-${entry.ref ?? base.entries.length}`;
  const amount = moneyRound(entry.amount);
  const next: LedgerEntry = {
    id,
    week: entry.week,
    day: entry.day,
    amount,
    category: entry.category,
    label: entry.label,
    gameId: entry.gameId,
    ref: entry.ref,
  };
  return {
    entries: [...base.entries, next].slice(-500),
    balance: moneyRound(base.balance + amount),
  };
}
