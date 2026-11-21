"use client";

import { CATEGORIES } from "@/lib/types";
import { MIN_PRICES, type CategoryFilter, type Range, type SortKey, type ViewState } from "./filters";
import { formatPrice } from "./format";

const RANGE_TABS: { id: Range; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "year", label: "Before Dec 31" },
];

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  ...CATEGORIES.map((c) => ({ id: c, label: c })),
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "liquidity", label: "Liquidity" },
  { value: "return", label: "Return" },
  { value: "apy", label: "APY" },
  { value: "ends", label: "Ends" },
];

const SELECT_CLASS = "h-9 border border-hairline bg-surface px-2 font-mono-num text-[13px] text-ink";

function TabList<T extends string>({
  label,
  tabs,
  active,
  size,
  onSelect,
}: {
  label: string;
  tabs: { id: T; label: string }[];
  active: T;
  size: string;
  onSelect: (id: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap items-end gap-5">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab.id)}
            className={`relative pb-2 ${size} font-medium transition-colors ${selected ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {tab.label}
            {selected && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />}
          </button>
        );
      })}
    </div>
  );
}

export default function Controls({
  state,
  onChange,
}: {
  state: ViewState;
  onChange: (patch: Partial<ViewState>) => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-hairline py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-end md:gap-6">
          <TabList
            label="Time range"
            tabs={RANGE_TABS}
            active={state.range}
            size="text-[14px]"
            onSelect={(range) => onChange({ range })}
          />
          <label className="flex flex-col gap-1 text-[12px] text-muted">
            Min price
            <select
              value={String(state.minPrice)}
              onChange={(e) => onChange({ minPrice: Number(e.target.value) })}
              className={SELECT_CLASS}
            >
              {MIN_PRICES.map((value) => (
                <option key={value} value={value}>
                  {formatPrice(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[12px] text-muted md:max-w-[220px]">
            Search
            <input
              type="search"
              value={state.query}
              onChange={(e) => onChange({ query: e.target.value })}
              placeholder="Filter markets"
              className="h-9 w-full border border-hairline bg-surface px-3 text-[13px] text-ink placeholder:text-muted"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted">
            Sort
            <select
              value={state.sort}
              onChange={(e) => onChange({ sort: e.target.value as SortKey })}
              className={SELECT_CLASS}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-[14px] text-ink">
          <span>If I put in $</span>
          <input
            type="text"
            inputMode="numeric"
            value={state.amount.toLocaleString("en-US")}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, "");
              onChange({ amount: digits ? Number(digits) : 0 });
            }}
            aria-label="Investment amount in dollars"
            className="h-9 w-[7.5rem] border border-hairline bg-surface px-2 text-right font-mono-num text-[14px] text-ink"
          />
        </label>
      </div>
      <TabList
        label="Category"
        tabs={CATEGORY_TABS}
        active={state.category}
        size="text-[13px]"
        onSelect={(category) => onChange({ category })}
      />
    </div>
  );
}
