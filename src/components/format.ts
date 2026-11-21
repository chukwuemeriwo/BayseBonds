import { DAY_MS } from "@/lib/bonds";
import type { Currency } from "@/lib/types";

export const CURRENCY_SYMBOL: Record<Currency, string> = { NGN: "₦", USD: "$" };

export function trimFixed(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.0$/, "");
}

export function formatLiquidity(value: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOL[currency];
  if (value >= 1e9) return `${symbol}${trimFixed(value / 1e9, 1)}B`;
  if (value >= 1e6) return `${symbol}${trimFixed(value / 1e6, 1)}M`;
  if (value >= 1e3) {
    const thousands = value / 1e3;
    return `${symbol}${trimFixed(thousands, thousands >= 100 ? 0 : 1)}K`;
  }
  return `${symbol}${Math.round(value).toLocaleString("en-US")}`;
}

function withPriceUnit(amount: string, currency: Currency): string {
  return currency === "NGN" ? `₦${amount}` : `${amount}¢`;
}

export function formatPrice(price: number, currency: Currency): string {
  return withPriceUnit(String(Math.round(100 * price)), currency);
}

export function formatPriceRange(min: number, max: number, currency: Currency): string {
  const range = `${withPriceUnit(trimFixed(100 * min, 1), currency)}–${withPriceUnit(trimFixed(100 * max, 1), currency)}`;
  return currency === "NGN" ? `${range} per ₦100 share` : range;
}

export function formatProfit(value: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOL[currency];
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value >= 0 ? `+${symbol}${abs}` : `-${symbol}${abs}`;
}

export function formatPercent(value: number): string {
  return `${(100 * value).toFixed(1)}%`;
}

export function formatApy(value: number): string {
  const pct = 100 * value;
  return pct > 999 ? ">999%" : `${Math.round(pct)}%`;
}

export function formatEnds(daysLeft: number, end: Date, now: Date): string {
  return end.getTime() - now.getTime() < DAY_MS ? "<1d" : `${daysLeft}d`;
}

export function daysUntil(end: Date, now: Date): number {
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));
}
