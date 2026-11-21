export const CATEGORIES = ["Politics", "Crypto", "Economy", "Other"] as const;

export type Category = (typeof CATEGORIES)[number];

export const CURRENCIES = ["NGN", "USD"] as const;

export type Currency = (typeof CURRENCIES)[number];

export type Bond = {
  id: string;
  question: string;
  side: string;
  buyPrice: number;
  returnPct: number;
  daysLeft: number;
  apy: number;
  liquidity: Record<Currency, number>;
  eventId: string;
  endDate: string;
  tradeUrl: string;
  category: Category;
  slug: string;
};

export type BondsPayload = {
  bonds: Bond[];
  fetchedAt: string;
  year: number;
  error?: string;
};
