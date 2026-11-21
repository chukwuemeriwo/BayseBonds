import type { Bond, Category } from "./types";

export type BayseMarket = {
  id: string;
  title: string;
  status: string;
  outcome1Id: string;
  outcome1Label: string;
  outcome1Price: number;
  outcome2Id: string;
  outcome2Label: string;
  outcome2Price: number;
  feePercentage?: number;
};

export type BayseEvent = {
  id: string;
  slug: string;
  title: string;
  category: string;
  type: string;
  engine?: string;
  status: string;
  closingDate?: string;
  resolutionDate?: string;
  liquidity?: number;
  seriesSlug?: string | null;
  assetSymbolPair?: string | null;
  markets: BayseMarket[];
};

export type BayseQuote = {
  price: number;
  currentMarketPrice?: number;
  quantity?: number;
  amount?: number;
  fee?: number;
  profitPercentage?: number;
  completeFill?: boolean;
  tradeGoesOverMaxLiability?: boolean;
};

export type Outcome = { id: string; label: string; price: number };

export type Candidate = {
  event: BayseEvent;
  market: BayseMarket;
  outcome: Outcome;
  end: number;
};

export const DAY_MS = 86_400_000;
export const MIN_MID_PRICE = 0.85;
export const MIN_BUY_PRICE = 0.95;
export const MAX_BUY_PRICE = 0.995;

const EXCLUDED_CATEGORIES = new Set(["SPORTS", "PLAYER STATS", "ESPORTS", "WEATHER"]);
const CRYPTO_PRICE_TITLE = /price|\$|\bhit\b|cross|above|below|reach|up or down/i;
const CATEGORY_MAP: Record<string, Category> = {
  POLITICS: "Politics",
  CRYPTO: "Crypto",
  FINANCE: "Economy",
  ECONOMY: "Economy",
};

export const normalizeCategory = (category: string | undefined): string =>
  (category ?? "").trim().toUpperCase();

export const mapCategory = (category: string | undefined): Category =>
  CATEGORY_MAP[normalizeCategory(category)] ?? "Other";

export const isCryptoPriceEvent = (event: BayseEvent): boolean =>
  Boolean(event.assetSymbolPair || event.seriesSlug) ||
  (normalizeCategory(event.category) === "CRYPTO" && CRYPTO_PRICE_TITLE.test(event.title));

export const isEligibleEvent = (event: BayseEvent): boolean =>
  event.status === "open" &&
  !EXCLUDED_CATEGORIES.has(normalizeCategory(event.category)) &&
  !isCryptoPriceEvent(event);

export const resolveEndDate = (event: BayseEvent): number | null => {
  const raw = event.resolutionDate || event.closingDate;
  if (!raw) return null;
  const end = Date.parse(raw);
  return Number.isFinite(end) ? end : null;
};

export const yearEnd = (year: number): number => Date.UTC(year, 11, 31, 23, 59, 59, 999);

export const isInWindow = (end: number, now: Date): boolean =>
  end - now.getTime() >= DAY_MS && end <= yearEnd(now.getUTCFullYear());

export const buildQuestion = (event: BayseEvent, market: BayseMarket): string =>
  event.type === "SINGLE_MARKET"
    ? event.title.trim()
    : `${event.title.trim()} — ${market.title.trim()}`;

export const sideLabel = (label: string): string => label.trim().toUpperCase();

export const returnPct = (buyPrice: number): number => 1 / buyPrice - 1;

export const daysLeft = (end: number, now: Date): number =>
  Math.max(1, Math.ceil((end - now.getTime()) / DAY_MS));

export const apy = (ret: number, days: number): number => Math.pow(1 + ret, 365 / days) - 1;

export const marketOutcomes = (market: BayseMarket): Outcome[] => [
  { id: market.outcome1Id, label: market.outcome1Label, price: market.outcome1Price },
  { id: market.outcome2Id, label: market.outcome2Label, price: market.outcome2Price },
];

export const selectCandidates = (events: BayseEvent[], now: Date): Candidate[] =>
  events.filter(isEligibleEvent).flatMap((event) => {
    const end = resolveEndDate(event);
    if (end === null || !isInWindow(end, now)) return [];
    return (event.markets ?? [])
      .filter((market) => market.status === "open")
      .flatMap((market) =>
        marketOutcomes(market)
          .filter((outcome) => outcome.id && outcome.price >= MIN_MID_PRICE)
          .map((outcome) => ({ event, market, outcome, end })),
      );
  });

export const isAcceptableQuote = (quote: BayseQuote | null | undefined): quote is BayseQuote =>
  !!quote &&
  Number.isFinite(quote.price) &&
  quote.completeFill !== false &&
  quote.tradeGoesOverMaxLiability !== true &&
  quote.price >= MIN_BUY_PRICE &&
  quote.price <= MAX_BUY_PRICE;

export const eventLiquidity = (event: BayseEvent | undefined): number | undefined =>
  typeof event?.liquidity === "number" ? event.liquidity : undefined;

export function ngnLiquidityResolver(usdEvents: BayseEvent[], ngnEvents: BayseEvent[]): (event: BayseEvent) => number {
  const ngnById = new Map(ngnEvents.map((event) => [event.id, eventLiquidity(event)]));
  const rates = usdEvents
    .map((event) => [eventLiquidity(event), ngnById.get(event.id)] as const)
    .filter(([usd, ngn]) => !!usd && !!ngn)
    .map(([usd, ngn]) => (ngn as number) / (usd as number))
    .sort((a, b) => a - b);
  if (rates.length === 0) throw new Error("Bayse NGN liquidity unavailable");
  const rate = rates[Math.floor(rates.length / 2)];
  return (event) => ngnById.get(event.id) ?? (eventLiquidity(event) ?? 0) * rate;
}

export const buildBond = (
  { event, market, outcome, end }: Candidate,
  buyPrice: number,
  now: Date,
  liquidityNgn: number,
): Bond => {
  const ret = returnPct(buyPrice);
  const days = daysLeft(end, now);
  return {
    id: `${market.id}:${outcome.id}`,
    question: buildQuestion(event, market),
    side: sideLabel(outcome.label),
    buyPrice,
    returnPct: ret,
    daysLeft: days,
    apy: apy(ret, days),
    liquidity: { USD: eventLiquidity(event) ?? 0, NGN: liquidityNgn },
    eventId: event.id,
    endDate: new Date(end).toISOString(),
    tradeUrl: `https://bayse.markets/market/${event.slug}`,
    category: mapCategory(event.category),
    slug: event.slug,
  };
};

export const dedupeBonds = (bonds: Bond[]): Bond[] =>
  [...new Map(bonds.map((bond) => [bond.id, bond])).values()].sort((a, b) => b.apy - a.apy);
