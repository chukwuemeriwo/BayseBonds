"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MAX_BUY_PRICE, MIN_BUY_PRICE } from "@/lib/bonds";
import type { Currency } from "@/lib/types";
import type { Aggregates } from "./filters";
import { formatLiquidity, formatPercent, formatPriceRange } from "./format";

const COUNT_UP_MS = 600;

function CountUp({ value, currency }: { value: number; currency: Currency }) {
  const target = Number.isFinite(value) && value > 0 ? value : 0;
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || target <= 0) {
      setDisplay(target);
      return;
    }
    setDisplay(0);
    const start = performance.now();
    let frame = 0;
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / COUNT_UP_MS);
      setDisplay(Math.max(0, target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <span className="font-display tabular-nums" aria-label={formatLiquidity(target, currency)}>
      {formatLiquidity(Math.max(0, display), currency)}
    </span>
  );
}

function nextPaysLabel(days: number | null): string {
  if (days == null) return "—";
  return days === 1 ? "next pays in 1 day" : `next pays in ${days} days`;
}

export default function Hero({
  aggregates,
  year,
  currency,
}: {
  aggregates: Aggregates;
  year: number;
  currency: Currency;
}) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <section className="border-b border-hairline">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-10 md:gap-10 md:px-6 md:py-14">
        <p className="font-display text-[42px] leading-[0.95] tracking-[-0.03em] text-ink md:text-[72px]">
          put your idle capital to work
        </p>
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-12">
          <div className="flex min-w-0 flex-1 flex-col gap-4 md:flex-row md:items-end md:gap-8">
            <div ref={containerRef} className="relative">
              <div className="flex items-start gap-2 md:gap-3">
                <p className="font-display text-[110px] leading-[0.85] tracking-[-0.04em] text-ink md:text-[200px]">
                  <CountUp value={aggregates.totalLiquidity} currency={currency} />
                </p>
                <button
                  type="button"
                  aria-label="How this total is calculated"
                  aria-expanded={open}
                  aria-controls={popoverId}
                  onClick={() => setOpen((v) => !v)}
                  className="mt-3 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-hairline text-[12px] font-medium text-muted transition-colors hover:border-ink hover:text-ink md:mt-6 md:h-7 md:w-7 md:text-[13px]"
                >
                  i
                </button>
              </div>
              {open && (
                <div
                  id={popoverId}
                  role="dialog"
                  className="absolute left-0 top-[calc(100%+8px)] z-20 w-[min(100vw-2rem,320px)] border border-hairline bg-surface p-4 shadow-none"
                >
                  <p className="text-[13px] font-medium text-ink">How this is calculated</p>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted">
                    Sum of AMM pool liquidity across every event with a listed bond in the current filters — open binary
                    markets with a fee-inclusive buy price of {formatPriceRange(MIN_BUY_PRICE, MAX_BUY_PRICE, currency)} that pay out by Dec 31 {year} (sports, player
                    stats, esports, weather, and crypto price markets excluded). It is capital sitting in those pools,
                    not your personal profit.
                  </p>
                </div>
              )}
            </div>
            <p className="max-w-[22rem] pb-1 text-[22px] font-medium leading-tight tracking-[-0.02em] text-ink md:max-w-[28rem] md:text-[32px]">
              sitting in near-certain Bayse predictions that pay out before Dec 31.
            </p>
          </div>
          <dl className="font-mono-num shrink-0 space-y-1 text-[13px] leading-relaxed text-ink md:pb-2 md:text-right md:text-[14px]">
            <div>
              <dt className="sr-only">Bond count</dt>
              <dd>
                {aggregates.count.toLocaleString("en-US")} bonds
                <span className="sr-only"> ending by Dec 31 {year}</span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Average return</dt>
              <dd>{formatPercent(aggregates.avgReturn)} avg return</dd>
            </div>
            <div>
              <dt className="sr-only">Next payout</dt>
              <dd>{nextPaysLabel(aggregates.nextPays)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
