"use client";

import { Fragment } from "react";
import type { Bond, Currency } from "@/lib/types";
import { PAGE_SIZE, type SortKey } from "./filters";
import { formatApy, formatEnds, formatPrice, formatProfit } from "./format";

const CELL = "whitespace-nowrap px-2 py-[18px] font-mono-num text-[13px]";
const NUM_CELL = "whitespace-nowrap px-2 py-[18px] text-right font-mono-num text-[13px]";
const STATIC_HEADER = "px-2 py-3 text-right text-[12px] font-medium text-muted";

function SortHeader({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: SortKey;
  sort: SortKey;
  onSort: (column: SortKey) => void;
}) {
  const active = sort === column;
  return (
    <th scope="col" aria-sort={active ? "descending" : "none"} className="px-2 py-3 text-[12px] font-medium text-right">
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 ${active ? "text-ink" : "text-muted hover:text-ink"}`}
      >
        {label}
        {active && <span aria-hidden>↓</span>}
      </button>
    </th>
  );
}

function TradeLink({ bond, className }: { bond: Bond; className: string }) {
  return (
    <a href={bond.tradeUrl} target="_blank" rel="noopener noreferrer" className={className}>
      Trade
    </a>
  );
}

function bondCells(bond: Bond, amount: number, currency: Currency, now: Date) {
  return {
    price: formatPrice(bond.buyPrice, currency),
    profit: formatProfit(amount * bond.returnPct, currency),
    ends: formatEnds(bond.daysLeft, new Date(bond.endDate), now),
    apy: formatApy(bond.apy),
  };
}

const SEPARATOR = <span className="text-muted"> · </span>;

export default function BondTable({
  bonds,
  amount,
  currency,
  sort,
  onSort,
  visibleCount,
  onShowMore,
}: {
  bonds: Bond[];
  amount: number;
  currency: Currency;
  sort: SortKey;
  onSort: (column: SortKey) => void;
  visibleCount: number;
  onShowMore: () => void;
}) {
  if (bonds.length === 0) {
    return <p className="py-16 text-center text-[14px] text-muted">No bonds match. Try a lower min price or a longer range.</p>;
  }

  const now = new Date();
  const visible = bonds.slice(0, visibleCount);
  const remaining = bonds.length - visibleCount;

  return (
    <div>
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="px-2 py-3 text-[12px] font-medium text-muted text-left">
                Market
              </th>
              <th scope="col" className="px-2 py-3 text-[12px] font-medium text-muted text-left">
                Side
              </th>
              <th scope="col" className={STATIC_HEADER}>
                Price
              </th>
              <SortHeader label="You make" column="return" sort={sort} onSort={onSort} />
              <SortHeader label="Ends" column="ends" sort={sort} onSort={onSort} />
              <SortHeader label="APY" column="apy" sort={sort} onSort={onSort} />
              <th scope="col" className={STATIC_HEADER}>
                Trade
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((bond) => {
              const cells = bondCells(bond, amount, currency, now);
              return (
                <tr key={bond.id} className="border-b border-hairline transition-colors hover:bg-row-hover">
                  <td className="max-w-[420px] truncate px-2 py-[18px] text-[14px] font-medium text-ink">
                    <span title={bond.question}>{bond.question}</span>
                  </td>
                  <td className={`${CELL} text-ink`}>{bond.side}</td>
                  <td className={`${NUM_CELL} text-ink`}>{cells.price}</td>
                  <td className={`${NUM_CELL} text-profit`}>{cells.profit}</td>
                  <td className={`${NUM_CELL} text-ink`}>{cells.ends}</td>
                  <td className={`${NUM_CELL} text-ink`}>{cells.apy}</td>
                  <td className="whitespace-nowrap px-2 py-[18px] text-right text-[13px]">
                    <TradeLink bond={bond} className="font-medium text-accent hover:underline" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="md:hidden">
        {visible.map((bond) => {
          const cells = bondCells(bond, amount, currency, now);
          const parts = [
            <span key="side">{bond.side}</span>,
            <span key="price">{cells.price}</span>,
            <span key="profit" className="text-profit">
              {cells.profit}
            </span>,
            <span key="ends">{cells.ends}</span>,
            <span key="apy">{cells.apy} APY</span>,
            <TradeLink key="trade" bond={bond} className="font-medium text-accent" />,
          ];
          return (
            <li key={bond.id} className="border-b border-hairline py-4 hover:bg-row-hover">
              <p className="truncate text-[14px] font-medium text-ink" title={bond.question}>
                {bond.question}
              </p>
              <p className="mt-2 font-mono-num text-[12px] leading-relaxed text-ink">
                {parts.map((part, i) => (
                  <Fragment key={i}>
                    {i > 0 && SEPARATOR}
                    {part}
                  </Fragment>
                ))}
              </p>
            </li>
          );
        })}
      </ul>
      {remaining > 0 && (
        <div className="flex justify-center py-8">
          <button type="button" onClick={onShowMore} className="text-[14px] font-medium text-accent hover:underline">
            Show more ({Math.min(PAGE_SIZE, remaining)} of {remaining} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
