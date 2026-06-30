import { ForexPair } from "./types";

export const FOREX_PAIRS: ForexPair[] = [
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    baseCurrency: "EUR",
    quoteCurrency: "USD",
    pipDecimalPlaces: 4,
    contractSize: 100000,
    defaultPrice: 1.0850,
  },
  {
    symbol: "GBP/USD",
    name: "British Pound / US Dollar",
    baseCurrency: "GBP",
    quoteCurrency: "USD",
    pipDecimalPlaces: 4,
    contractSize: 100000,
    defaultPrice: 1.2720,
  },
  {
    symbol: "USD/JPY",
    name: "US Dollar / Japanese Yen",
    baseCurrency: "USD",
    quoteCurrency: "JPY",
    pipDecimalPlaces: 2,
    contractSize: 100000,
    defaultPrice: 156.40,
  },
  {
    symbol: "AUD/USD",
    name: "Australian Dollar / US Dollar",
    baseCurrency: "AUD",
    quoteCurrency: "USD",
    pipDecimalPlaces: 4,
    contractSize: 100000,
    defaultPrice: 0.6650,
  },
  {
    symbol: "USD/CAD",
    name: "US Dollar / Canadian Dollar",
    baseCurrency: "USD",
    quoteCurrency: "CAD",
    pipDecimalPlaces: 4,
    contractSize: 100000,
    defaultPrice: 1.3680,
  },
  {
    symbol: "USD/CHF",
    name: "US Dollar / Swiss Franc",
    baseCurrency: "USD",
    quoteCurrency: "CHF",
    pipDecimalPlaces: 4,
    contractSize: 100000,
    defaultPrice: 0.9020,
  },
  {
    symbol: "NZD/USD",
    name: "New Zealand Dollar / US Dollar",
    baseCurrency: "NZD",
    quoteCurrency: "USD",
    pipDecimalPlaces: 4,
    contractSize: 100000,
    defaultPrice: 0.6120,
  },
  {
    symbol: "XAU/USD",
    name: "Gold / US Dollar",
    baseCurrency: "XAU",
    quoteCurrency: "USD",
    pipDecimalPlaces: 2,
    contractSize: 100, // 100 ounces per standard lot
    defaultPrice: 2330.00,
  },
];

// Presets for Macro Bias inputs
export const MACRO_PRESETS = {
  monetaryPolicy: [
    { label: "Fed Hawkish (Bullish USD)", value: "Fed signaling high yields and persistent rate hike pressure. Hawkish USD dominance." },
    { label: "Fed Dovish (Bearish USD)", value: "Fed signaling rate cuts, lowering yields. Dovish expansionary environment." },
    { label: "ECB Dovish vs Fed Steady", value: "ECB cutting rates while Fed holds steady. Bearish EUR/USD stance." },
    { label: "BOJ Rate Hike Looming", value: "Bank of Japan preparing to hike rates or reduce bond buying. Bullish JPY pressure." },
    { label: "Neutral / Stable Rates", value: "Central banks on hold. Balanced yield differentials, no immediate rate changes." },
  ],
  geopolitics: [
    { label: "Low / Historical Baseline", value: "No major escalating international conflicts. Safe-haven premium is compressed." },
    { label: "Moderate Risk / Trade Tariffs", value: "Rising trade tensions, tariff threats between major economies. Moderate defense hedging." },
    { label: "High Tension / Active Conflict", value: "High escalating active military or trade blockades. Heavy capital flight into Gold and Safe Havens." },
    { label: "Sanction Escalation", value: "Sweeping financial sanctions impacting liquidity and safe-haven flows." },
  ],
  cbParticipation: [
    { label: "Steady Commercial Flows", value: "Standard commercial import/export currency flows. Balanced institutional liquidity." },
    { label: "CB Accumulation (Buying)", value: "Aggressive central bank reserves diversification, buying physical gold and safe liquid instruments." },
    { label: "Institutional Liquidations", value: "Large funds and commercial banks active sellers, liquidating inventories into cash." },
    { label: "Sovereign Debt Buying", value: "Foreign central banks actively purchasing government bonds, supporting the currency base." },
  ],
  marketMood: [
    { label: "Strong Risk-On (Equities Up)", value: "Equity markets breaking highs, VIX index below 13. Systemic thirst for high-beta currency yields." },
    { label: "Moderate / Range-bound Mood", value: "Standard sideways market profile. Calm credit spreads, typical trendless volatility." },
    { label: "Risk-Off Panic (VIX Spiking)", value: "Systemic selloffs in equities. VIX spikes above 25. High-volume funding dollar squeeze and gold rush." },
    { label: "Carry Trade unwinding", value: "Investors rapidly closing high-yield carry trades, buying back low-yield funding currencies." },
  ],
};
