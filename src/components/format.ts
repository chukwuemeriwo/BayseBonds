import { DAY_MS } from "@/lib/bonds";

export function trimFixed(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.0$/, "");
}

export function formatLiquidity(value: number): string {
  if (value >= 1e9) return `$${trimFixed(value / 1e9, 1)}B`;
  if (value >= 1e6) return `$${trimFixed(value / 1e6, 1)}M`;
  if (value >= 1e3) {
    const thousands = value / 1e3;
    return `$${trimFixed(thousands, thousands >= 100 ? 0 : 1)}K`;
  }
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function formatPrice(price: number): string {
  return `${Math.round(100 * price)}¢`;
}

export function formatProfit(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value >= 0 ? `+$${abs}` : `-$${abs}`;
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
