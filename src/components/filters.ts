import { CATEGORIES, CURRENCIES, type Bond, type Category, type Currency } from "@/lib/types";
import { DAY_MS, MAX_BUY_PRICE, MIN_BUY_PRICE } from "@/lib/bonds";
import { daysUntil } from "./format";

export type Range = "week" | "month" | "year";
export type SortKey = "liquidity" | "return" | "apy" | "ends";
export type CategoryFilter = "all" | Category;

export type ViewState = {
  range: Range;
  minPrice: number;
  amount: number;
  sort: SortKey;
  category: CategoryFilter;
  query: string;
  currency: Currency;
};

export type Aggregates = {
  totalLiquidity: number;
  count: number;
  avgReturn: number;
  nextPays: number | null;
};

export const PAGE_SIZE = 50;
export const MIN_PRICES = [MIN_BUY_PRICE, 0.97] as const;
export const DEFAULT_AMOUNTS: Record<Currency, number> = { NGN: 100_000, USD: 1000 };
export const DEFAULT_STATE: ViewState = {
  range: "year",
  minPrice: MIN_BUY_PRICE,
  amount: DEFAULT_AMOUNTS.NGN,
  sort: "liquidity",
  category: "all",
  query: "",
  currency: "NGN",
};

const RANGE_CAPS: Record<Range, number | null> = { week: 7, month: 30, year: null };
const SORT_KEYS: readonly SortKey[] = ["liquidity", "return", "apy", "ends"];

export function filterBonds(
  bonds: Bond[],
  opts: { range: Range; minPrice: number; category: CategoryFilter; q: string; now?: Date },
): Bond[] {
  const now = opts.now ?? new Date();
  const q = opts.q.trim().toLowerCase();
  const cap = RANGE_CAPS[opts.range];
  return bonds.filter((bond) => {
    if (bond.buyPrice < opts.minPrice || bond.buyPrice > MAX_BUY_PRICE) return false;
    if (opts.category !== "all" && bond.category !== opts.category) return false;
    const end = new Date(bond.endDate);
    if (end.getTime() - now.getTime() < DAY_MS) return false;
    if (cap != null && daysUntil(end, now) > cap) return false;
    return !q || bond.question.toLowerCase().includes(q);
  });
}

export function sortBonds(bonds: Bond[], sort: SortKey): Bond[] {
  return [...bonds].sort((a, b) => {
    switch (sort) {
      case "return":
        return b.returnPct - a.returnPct;
      case "ends":
        return a.daysLeft - b.daysLeft || new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      case "liquidity":
        return b.liquidity.USD - a.liquidity.USD;
      default:
        return b.apy - a.apy;
    }
  });
}

export function aggregate(bonds: Bond[], currency: Currency): Aggregates {
  if (bonds.length === 0) return { totalLiquidity: 0, count: 0, avgReturn: 0, nextPays: null };
  const eventLiquidity = new Map<string, number>();
  let weight = 0;
  let weighted = 0;
  let nextPays: number | null = null;
  for (const bond of bonds) {
    const liquidity = bond.liquidity[currency];
    eventLiquidity.set(bond.eventId, Math.max(eventLiquidity.get(bond.eventId) ?? 0, liquidity));
    weight += liquidity;
    weighted += bond.returnPct * liquidity;
    nextPays = nextPays == null ? bond.daysLeft : Math.min(nextPays, bond.daysLeft);
  }
  let totalLiquidity = 0;
  for (const value of eventLiquidity.values()) totalLiquidity += value;
  return {
    totalLiquidity,
    count: bonds.length,
    avgReturn: weight > 0 ? weighted / weight : 0,
    nextPays,
  };
}

function parseAmount(value: string | null, currency: Currency): number {
  const fallback = DEFAULT_AMOUNTS[currency];
  if (value == null || value.trim() === "") return fallback;
  const n = Number(value);
  return !Number.isFinite(n) || n < 0 ? fallback : Math.round(n);
}

function parseCurrency(value: string | null): Currency {
  const upper = value?.toUpperCase();
  return (CURRENCIES as readonly string[]).includes(upper ?? "") ? (upper as Currency) : DEFAULT_STATE.currency;
}

export function parseState(params: URLSearchParams): ViewState {
  const range = params.get("range");
  const min = Number(params.get("min"));
  const sort = params.get("sort");
  const cat = params.get("cat");
  const currency = parseCurrency(params.get("cur"));
  return {
    range: range === "week" || range === "month" || range === "year" ? range : DEFAULT_STATE.range,
    minPrice: (MIN_PRICES as readonly number[]).includes(min) ? min : DEFAULT_STATE.minPrice,
    amount: parseAmount(params.get("amt"), currency),
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : DEFAULT_STATE.sort,
    category: cat && (CATEGORIES as readonly string[]).includes(cat) ? (cat as Category) : "all",
    query: params.get("q") ?? "",
    currency,
  };
}

export function writeState(pathname: string, state: ViewState): void {
  const params = new URLSearchParams();
  if (state.range !== DEFAULT_STATE.range) params.set("range", state.range);
  if (state.minPrice !== DEFAULT_STATE.minPrice) params.set("min", String(state.minPrice));
  if (state.currency !== DEFAULT_STATE.currency) params.set("cur", state.currency.toLowerCase());
  if (state.amount !== DEFAULT_AMOUNTS[state.currency]) params.set("amt", String(state.amount));
  if (state.sort !== DEFAULT_STATE.sort) params.set("sort", state.sort);
  if (state.category !== DEFAULT_STATE.category) params.set("cat", state.category);
  if (state.query.trim()) params.set("q", state.query.trim());
  const search = params.toString();
  window.history.replaceState(null, "", search ? `${pathname}?${search}` : pathname);
}
