"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { BondsPayload } from "@/lib/types";
import { PAGE_SIZE, aggregate, filterBonds, parseState, sortBonds, writeState, type ViewState } from "./filters";
import BondTable from "./BondTable";
import Controls from "./Controls";
import Footer from "./Footer";
import Hero from "./Hero";

export default function BayseBondsApp({ initial }: { initial: BondsPayload }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ViewState>(() => parseState(new URLSearchParams(searchParams.toString())));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const update = useCallback((patch: Partial<ViewState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    setVisibleCount(PAGE_SIZE);
  }, []);

  useEffect(() => {
    writeState(pathname, state);
  }, [pathname, state]);

  useEffect(() => {
    const onPopState = () => {
      setState(parseState(new URLSearchParams(window.location.search)));
      setVisibleCount(PAGE_SIZE);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const bonds = useMemo(
    () =>
      sortBonds(
        filterBonds(initial.bonds, {
          range: state.range,
          minPrice: state.minPrice,
          q: state.query,
          category: state.category,
        }),
        state.sort,
      ),
    [initial.bonds, state],
  );
  const aggregates = useMemo(() => aggregate(bonds, state.currency), [bonds, state.currency]);
  const unavailable = !!initial.error && initial.bonds.length === 0;

  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-[1200px] items-center px-4 py-4 md:px-6">
          <p className="text-[18px] font-semibold tracking-[-0.02em]">BayseBonds</p>
        </div>
      </header>
      {unavailable ? (
        <div className="mx-auto max-w-[1200px] px-4 py-24 text-center md:px-6">
          <p className="text-[16px] text-ink">Bayse data is temporarily unavailable</p>
        </div>
      ) : (
        <>
          <Hero aggregates={aggregates} year={initial.year} currency={state.currency} />
          <main className="mx-auto max-w-[1200px] px-4 md:px-6">
            <Controls state={state} onChange={update} />
            <BondTable
              bonds={bonds}
              amount={state.amount}
              currency={state.currency}
              sort={state.sort}
              onSort={(sort) => update({ sort })}
              visibleCount={visibleCount}
              onShowMore={() => setVisibleCount((n) => n + PAGE_SIZE)}
            />
          </main>
        </>
      )}
      <Footer />
    </div>
  );
}
