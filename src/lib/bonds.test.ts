import { describe, expect, it } from "vitest";
import {
  apy,
  buildBond,
  buildQuestion,
  daysLeft,
  dedupeBonds,
  isAcceptableQuote,
  isEligibleEvent,
  isInWindow,
  mapCategory,
  resolveEndDate,
  returnPct,
  selectCandidates,
  sideLabel,
  type BayseEvent,
  type BayseMarket,
  type BayseQuote,
} from "./bonds";

const NOW = new Date("2026-11-21T10:00:00Z");

const market = (overrides: Partial<BayseMarket> & Pick<BayseMarket, "id" | "title">): BayseMarket => ({
  status: "open",
  outcome1Id: `${overrides.id}-yes`,
  outcome1Label: "Yes",
  outcome1Price: 0.5,
  outcome2Id: `${overrides.id}-no`,
  outcome2Label: "No",
  outcome2Price: 0.5,
  ...overrides,
});

const statePolice: BayseEvent = {
  id: "eb90f119-d0b1-4565-aae8-f99d46755a3a",
  slug: "will-president-tinubu-reject-the-state-police-constitutional-amendment-bill",
  title: "Will President Tinubu Reject the State Police Constitutional Amendment Bill?",
  category: "POLITICS",
  type: "SINGLE_MARKET",
  engine: "AMM",
  status: "open",
  closingDate: "",
  resolutionDate: "2026-12-30T22:59:00Z",
  liquidity: 40,
  markets: [
    {
      id: "82b248c8-edd2-42a9-8976-00d526c202ec",
      title: "Will President Tinubu Reject the State Police Constitutional Amendment Bill?",
      status: "open",
      outcome1Id: "91da2cb8-dd00-49c4-8e71-f0f284c4163f",
      outcome1Label: "Yes",
      outcome1Price: 0.1,
      outcome2Id: "3f838e3f-0c8f-4199-88bc-60e3582351c5",
      outcome2Label: "No",
      outcome2Price: 0.9,
    },
  ],
};

const statePoliceQuote: BayseQuote = {
  price: 0.9566,
  amount: 10,
  fee: 0,
  quantity: 10.45,
  currentMarketPrice: 0.9,
  profitPercentage: 4.5345021885787,
  tradeGoesOverMaxLiability: false,
  completeFill: true,
};

const tinubuDisqualified: BayseEvent = {
  id: "47721a8b-b189-41f3-a846-2eb2c013a2d7",
  slug: "will-tinubu-be-disqualified-for-the-2027-presidential-election",
  title: "Will Tinubu be disqualified from the 2027 Presidential Election?",
  category: "Politics",
  type: "SINGLE_MARKET",
  engine: "AMM",
  status: "open",
  closingDate: "",
  resolutionDate: "",
  liquidity: 50,
  markets: [
    market({
      id: "069b650b-b310-4322-8da4-583252c85997",
      title: "Will Tinubu be disqualified from the 2027 Presidential Election?",
      outcome1Price: 0.0444,
      outcome2Price: 0.9556,
    }),
  ],
};

const usdNgn: BayseEvent = {
  id: "4606731a-84ac-4f4e-a2e6-33495b7ecfe3",
  slug: "price-of-usd-ngn-by-the-end-of-the-year",
  title: "Price of USD/NGN by the End of the Year?",
  category: "FINANCE",
  type: "COMBINED_MARKETS",
  engine: "AMM",
  status: "open",
  closingDate: "",
  resolutionDate: "2026-12-31T22:59:00Z",
  liquidity: 100,
  markets: [
    market({ id: "d0f487d9-ec1a-40c9-a898-e7148b8c8f3c", title: "1,391.00 - 1,500.00", outcome1Price: 0.4227, outcome2Price: 0.5773 }),
    market({ id: "fc079830-c674-4c96-bc3e-4e5bdc32f02f", title: " Below 1,250.00 ", outcome1Price: 0.1388, outcome2Price: 0.8612 }),
    market({ id: "closed-market", title: "Above 1,600.00", status: "closed", outcome1Price: 0.02, outcome2Price: 0.98 }),
  ],
};

const btcUpDown: BayseEvent = {
  id: "79789ac3-36a6-4872-99e8-e204a0d645e6",
  slug: "btc-up-or-down-15m-1795251600000",
  title: "Bitcoin Up or Down - 15 minutes?",
  category: "CRYPTO",
  type: "SINGLE_MARKET",
  engine: "CLOB",
  status: "open",
  closingDate: "2026-11-21T09:14:59.999Z",
  resolutionDate: "2026-11-21T09:16:00Z",
  liquidity: 213.1,
  seriesSlug: "crypto-btc-15min",
  assetSymbolPair: "BTCUSDT_CHAINLINK_TWAP_60",
  markets: [market({ id: "c47a54ae-3892-4ac6-a275-efb089dfe263", title: "Bitcoin Up or Down - 15 minutes?" })],
};

const btcPriceHit: BayseEvent = {
  id: "9cd53628-e8ad-46d1-8eb8-ec30fa716ca2",
  slug: "what-price-will-bitcoin-hit-in-2026",
  title: "What price will Bitcoin hit in 2026?",
  category: "CRYPTO",
  type: "GROUPED_MARKETS",
  engine: "AMM",
  status: "open",
  closingDate: "2026-12-20T04:59:00Z",
  resolutionDate: "2026-12-20T22:59:00Z",
  liquidity: 5530,
  markets: [market({ id: "971f5baf-e245-4fee-ae2a-59e58653a6c5", title: "↓ 50,000", outcome1Price: 0.04, outcome2Price: 0.96 })],
};

const btcVsGold: BayseEvent = {
  id: "51cbcd0b-a2c5-4bd6-8321-e899e678dc82",
  slug: "will-btc-outperform-gold-in-2026",
  title: "Will Bitcoin outperform Gold in 2026?",
  category: "CRYPTO",
  type: "SINGLE_MARKET",
  engine: "AMM",
  status: "open",
  closingDate: "2026-12-31T05:00:00Z",
  resolutionDate: "2026-12-31T05:00:00Z",
  liquidity: 5988,
  markets: [
    market({
      id: "e12b7c60-76c5-4509-a9c7-87e69e929f60",
      title: "Will BTC outperform Gold in 2026?",
      outcome1Price: 0.155,
      outcome2Price: 0.845,
    }),
  ],
};

const pochettino: BayseEvent = {
  id: "bf790202-0e5d-4ffc-9ae9-c10e86365a25",
  slug: "will-pochettino-win-any-of-his-first-three-games-as-manchester-united-manager",
  title: "Will Pochettino Win Any of His First Three Games as Manchester United Manager?",
  category: "SPORTS",
  type: "SINGLE_MARKET",
  status: "open",
  resolutionDate: "2026-12-15T22:59:00Z",
  liquidity: 500,
  markets: [market({ id: "d206770b-423a-4088-87f5-cc93f5f7a5e4", title: "Pochettino", outcome1Price: 0.97, outcome2Price: 0.03 })],
};

const kudus: BayseEvent = {
  id: "821ded9c-10f8-487a-88b1-783986a7de6f",
  slug: "kudus-7-0-sofascore-rating-vs-ipswich",
  title: "Kudus 7.2+ Sofascore Rating vs Ipswich?",
  category: "player stats",
  type: "SINGLE_MARKET",
  status: "open",
  resolutionDate: "2026-12-21T22:59:00Z",
  liquidity: 300,
  markets: [market({ id: "d2c73194-1163-4918-bce9-496ba2bf44a0", title: "Kudus", outcome1Price: 0.96, outcome2Price: 0.04 })],
};

const openAiIpo: BayseEvent = {
  id: "08577d2e-1edf-49f5-bffc-7776b062595b",
  slug: "openai-ipo-closing-market-cap",
  title: "OpenAI IPO Closing Market Cap?",
  category: "TECHNOLOGY",
  type: "COMBINED_MARKETS",
  status: "open",
  closingDate: "2028-01-01T04:58:00Z",
  resolutionDate: "2028-01-01T04:59:00Z",
  liquidity: 7998,
  markets: [market({ id: "84dcd1b5-c220-44db-9dfb-75aceeafb058", title: "No IPO by December 31, 2027", outcome1Price: 0.04, outcome2Price: 0.96 })],
};

const paused: BayseEvent = { ...statePolice, id: "paused-event", status: "paused" };

describe("event exclusions", () => {
  it("keeps open non-excluded events", () => {
    expect(isEligibleEvent(statePolice)).toBe(true);
    expect(isEligibleEvent(usdNgn)).toBe(true);
    expect(isEligibleEvent(btcVsGold)).toBe(true);
    expect(isEligibleEvent(openAiIpo)).toBe(true);
  });

  it("drops paused, sports, player stats and crypto price events", () => {
    expect(isEligibleEvent(paused)).toBe(false);
    expect(isEligibleEvent(pochettino)).toBe(false);
    expect(isEligibleEvent(kudus)).toBe(false);
    expect(isEligibleEvent({ ...statePolice, category: "Esports" })).toBe(false);
    expect(isEligibleEvent({ ...statePolice, category: "WEATHER" })).toBe(false);
    expect(isEligibleEvent(btcUpDown)).toBe(false);
    expect(isEligibleEvent(btcPriceHit)).toBe(false);
    expect(isEligibleEvent({ ...usdNgn, seriesSlug: "stocks-spy-1d" })).toBe(false);
  });
});

describe("category mapping", () => {
  it("maps Bayse categories case-insensitively", () => {
    expect(mapCategory("POLITICS")).toBe("Politics");
    expect(mapCategory("Politics")).toBe("Politics");
    expect(mapCategory("CRYPTO")).toBe("Crypto");
    expect(mapCategory("FINANCE")).toBe("Economy");
    expect(mapCategory("ECONOMY")).toBe("Economy");
    expect(mapCategory("TECHNOLOGY")).toBe("Other");
    expect(mapCategory("SOCIAL MEDIA")).toBe("Other");
    expect(mapCategory("HEADIES")).toBe("Other");
    expect(mapCategory(undefined)).toBe("Other");
  });
});

describe("question and side", () => {
  it("uses the event title for single markets", () => {
    expect(buildQuestion(statePolice, statePolice.markets[0])).toBe(statePolice.title);
  });

  it("joins event and market titles for multi-market events", () => {
    expect(buildQuestion(usdNgn, usdNgn.markets[1])).toBe("Price of USD/NGN by the End of the Year? — Below 1,250.00");
  });

  it("uppercases outcome labels", () => {
    expect(sideLabel("Yes")).toBe("YES");
    expect(sideLabel(" No ")).toBe("NO");
    expect(sideLabel("Up")).toBe("UP");
  });
});

describe("yield math", () => {
  it("matches the polybonds compound APY example", () => {
    expect(apy(0.041666666666666706, 5)).toBeCloseTo(18.687926896423576, 9);
  });

  it("derives return from buy price", () => {
    expect(returnPct(0.96)).toBeCloseTo(0.041666666666666706, 12);
  });

  it("rounds days up with a floor of one", () => {
    expect(daysLeft(NOW.getTime() + 4.2 * 86_400_000, NOW)).toBe(5);
    expect(daysLeft(NOW.getTime() + 1000, NOW)).toBe(1);
  });
});

describe("end date window", () => {
  it("prefers resolutionDate and falls back to closingDate", () => {
    expect(resolveEndDate(statePolice)).toBe(Date.parse("2026-12-30T22:59:00Z"));
    expect(resolveEndDate({ ...statePolice, resolutionDate: "", closingDate: "2026-12-01T00:00:00Z" })).toBe(
      Date.parse("2026-12-01T00:00:00Z"),
    );
    expect(resolveEndDate(tinubuDisqualified)).toBeNull();
    expect(resolveEndDate({ ...statePolice, resolutionDate: "not a date" })).toBeNull();
  });

  it("requires at least a day left and payout by year end UTC", () => {
    expect(isInWindow(Date.parse("2026-12-31T23:59:59.999Z"), NOW)).toBe(true);
    expect(isInWindow(Date.parse("2027-01-01T00:00:00Z"), NOW)).toBe(false);
    expect(isInWindow(NOW.getTime() + 86_400_000, NOW)).toBe(true);
    expect(isInWindow(NOW.getTime() + 86_399_999, NOW)).toBe(false);
  });
});

describe("candidate selection", () => {
  const events = [statePolice, tinubuDisqualified, usdNgn, btcUpDown, btcPriceHit, btcVsGold, pochettino, kudus, openAiIpo, paused];

  it("keeps only plausible outcomes from eligible in-window open markets", () => {
    const ids = selectCandidates(events, NOW).map((c) => `${c.market.id}:${c.outcome.id}`);
    expect(ids).toEqual([
      "82b248c8-edd2-42a9-8976-00d526c202ec:3f838e3f-0c8f-4199-88bc-60e3582351c5",
      "fc079830-c674-4c96-bc3e-4e5bdc32f02f:fc079830-c674-4c96-bc3e-4e5bdc32f02f-no",
    ]);
  });
});

describe("quote acceptance", () => {
  it("accepts complete quotes inside the bond price band", () => {
    expect(isAcceptableQuote(statePoliceQuote)).toBe(true);
    expect(isAcceptableQuote({ price: 0.95 })).toBe(true);
    expect(isAcceptableQuote({ price: 0.995 })).toBe(true);
  });

  it("rejects quotes outside the band or not fully fillable", () => {
    expect(isAcceptableQuote(null)).toBe(false);
    expect(isAcceptableQuote({ price: 0.9194 })).toBe(false);
    expect(isAcceptableQuote({ price: 0.9961 })).toBe(false);
    expect(isAcceptableQuote({ ...statePoliceQuote, completeFill: false })).toBe(false);
    expect(isAcceptableQuote({ ...statePoliceQuote, tradeGoesOverMaxLiability: true })).toBe(false);
  });
});

describe("bond construction", () => {
  it("builds a bond from a real quote", () => {
    const [candidate] = selectCandidates([statePolice], NOW);
    const bond = buildBond(candidate, statePoliceQuote.price, NOW);
    expect(bond).toMatchObject({
      id: "82b248c8-edd2-42a9-8976-00d526c202ec:3f838e3f-0c8f-4199-88bc-60e3582351c5",
      question: statePolice.title,
      side: "NO",
      buyPrice: 0.9566,
      daysLeft: 40,
      liquidity: 40,
      eventId: statePolice.id,
      endDate: "2026-12-30T22:59:00.000Z",
      tradeUrl: `https://bayse.markets/market/${statePolice.slug}`,
      category: "Politics",
      slug: statePolice.slug,
    });
    expect(bond.returnPct).toBeCloseTo(1 / 0.9566 - 1, 12);
    expect(bond.apy).toBeCloseTo(Math.pow(1 / 0.9566, 365 / 40) - 1, 12);
  });

  it("defaults missing liquidity to zero and dedupes by id", () => {
    const [candidate] = selectCandidates([{ ...statePolice, liquidity: undefined }], NOW);
    const bond = buildBond(candidate, 0.97, NOW);
    expect(bond.liquidity).toBe(0);
    expect(dedupeBonds([bond, { ...bond }])).toHaveLength(1);
  });
});
