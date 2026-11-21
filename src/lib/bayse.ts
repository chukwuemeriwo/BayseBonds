import { unstable_cache } from "next/cache";
import {
  buildBond,
  dedupeBonds,
  ngnLiquidityResolver,
  isAcceptableQuote,
  selectCandidates,
  type BayseEvent,
  type BayseQuote,
  type Candidate,
} from "./bonds";
import type { Bond, BondsPayload, Currency } from "./types";

const API_BASE = "https://relay.bayse.markets/v1/pm";
const PAGE_SIZE = 100;
const REVALIDATE_SECONDS = 300;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const MAX_RETRY_AFTER_MS = 10_000;
const QUOTE_CONCURRENCY = 8;
const QUOTE_AMOUNT_USD = 10;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const UNAVAILABLE = "Bayse data is temporarily unavailable";

type FetchInit = RequestInit & { next?: { revalidate?: number; tags?: string[] } };

type EventsPage = {
  events: BayseEvent[];
  pagination: { page: number; size: number; lastPage: number; totalCount: number };
};

export class BayseHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryDelay = (response: Response | null, body: string, attempt: number): number => {
  const header = Number(response?.headers.get("retry-after"));
  const fromBody = Number(safeParse<{ retryAfter?: number }>(body)?.retryAfter);
  const seconds = [fromBody, header].find((value) => Number.isFinite(value) && value > 0);
  return seconds ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS) : 500 * 2 ** attempt;
};

const safeParse = <T>(text: string): T | null => {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

async function fetchJson<T>(url: string, init: FetchInit, attempt = 0): Promise<T> {
  let response: Response | null = null;
  let body = "";
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    body = await response.text();
  } catch (error) {
    if (attempt >= MAX_RETRIES) throw error;
  }
  if (response?.ok) {
    const parsed = safeParse<T>(body);
    if (parsed === null) throw new BayseHttpError(response.status, "Invalid JSON from Bayse");
    return parsed;
  }
  if (response && (!RETRYABLE_STATUSES.has(response.status) || attempt >= MAX_RETRIES)) {
    const message = safeParse<{ message?: string }>(body)?.message ?? (body || response.statusText);
    throw new BayseHttpError(response.status, message);
  }
  await sleep(retryDelay(response, body, attempt));
  return fetchJson<T>(url, init, attempt + 1);
}

const fetchEventsPage = (page: number, currency: Currency) =>
  fetchJson<EventsPage>(`${API_BASE}/events?page=${page}&size=${PAGE_SIZE}&currency=${currency}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });

export async function fetchAllEvents(currency: Currency = "USD"): Promise<BayseEvent[]> {
  const first = await fetchEventsPage(1, currency);
  const lastPage = Math.max(1, first.pagination?.lastPage ?? 1);
  const rest = await Promise.allSettled(
    Array.from({ length: lastPage - 1 }, (_, index) => fetchEventsPage(index + 2, currency)),
  );
  return [
    ...(first.events ?? []),
    ...rest.flatMap((result) => (result.status === "fulfilled" ? (result.value.events ?? []) : [])),
  ];
}

export async function fetchQuote({ event, market, outcome }: Candidate): Promise<BayseQuote | null> {
  try {
    return await fetchJson<BayseQuote>(`${API_BASE}/events/${event.id}/markets/${market.id}/quote`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side: "BUY", outcomeId: outcome.id, amount: QUOTE_AMOUNT_USD, currency: "USD" }),
    });
  } catch (error) {
    if (error instanceof BayseHttpError && error.status >= 400 && error.status < 500 && error.status !== 429) {
      return null;
    }
    throw error;
  }
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]).then(
        (value) => ({ status: "fulfilled", value }) as const,
        (reason) => ({ status: "rejected", reason }) as const,
      );
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function buildPayload(now: Date): Promise<BondsPayload> {
  const [events, ngnEvents] = await Promise.all([fetchAllEvents("USD"), fetchAllEvents("NGN").catch(() => [])]);
  const liquidityNgn = ngnLiquidityResolver(events, ngnEvents);
  const candidates = selectCandidates(events, now);
  const quotes = await mapPool(candidates, QUOTE_CONCURRENCY, fetchQuote);
  if (candidates.length > 0 && quotes.every((result) => result.status === "rejected")) {
    throw new Error("All Bayse quote requests failed");
  }
  const bonds = quotes.flatMap((result, index): Bond[] =>
    result.status === "fulfilled" && isAcceptableQuote(result.value)
      ? [buildBond(candidates[index], result.value.price, now, liquidityNgn(candidates[index].event))]
      : [],
  );
  return { bonds: dedupeBonds(bonds), fetchedAt: new Date().toISOString(), year: now.getUTCFullYear() };
}

async function safely(load: () => Promise<BondsPayload>, now: Date): Promise<BondsPayload> {
  try {
    return await load();
  } catch {
    return { bonds: [], fetchedAt: new Date().toISOString(), year: now.getUTCFullYear(), error: UNAVAILABLE };
  }
}

const cachedPayload = unstable_cache(() => buildPayload(new Date()), ["bayse-bonds"], {
  revalidate: REVALIDATE_SECONDS,
  tags: ["bonds"],
});

export async function computeBonds({ now = new Date() }: { now?: Date } = {}): Promise<BondsPayload> {
  return safely(() => buildPayload(now), now);
}

export async function getBonds(): Promise<BondsPayload> {
  return safely(cachedPayload, new Date());
}
