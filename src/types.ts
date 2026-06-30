export type TradeDirection = 'BUY' | 'SELL';

export interface ForexPair {
  symbol: string;         // e.g. "EUR/USD"
  name: string;           // e.g. "Euro / US Dollar"
  baseCurrency: string;   // e.g. "EUR"
  quoteCurrency: string;  // e.g. "USD"
  pipDecimalPlaces: number; // 4 for EURUSD, 2 for USDJPY, 2 for XAUUSD, etc.
  contractSize: number;   // 100,000 for Forex standard, 100 for Gold
  defaultPrice: number;   // Initial fallback rate
}

export interface TradeSetup {
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLossPrice: number;
  accountBalance: number;
  accountCurrency: string; // Default USD
  riskType: 'percentage' | 'cash';
  riskValue: number;      // e.g. 1 for 1% or 100 for $100
}

export interface TakeProfitTarget {
  ratio: number;          // e.g. 1.0, 2.0, 3.0 (Risk/Reward)
  price: number;          // Calculated target price
  profitCash: number;     // Cash reward if hit
  pips: number;           // Target size in pips
}

export interface LotSizeCalculation {
  riskCash: number;
  stopLossPips: number;
  pipValueUSD: number;
  standardLots: number;
  miniLots: number;
  microLots: number;
  positionUnits: number;
  totalLotSize: number;   // exact lots
  targets: TakeProfitTarget[];
  isInvalid: boolean;
  errorMessage?: string;
}

export interface MacroVectorInput {
  monetaryPolicy: string; // Preset value or custom input
  geopolitics: string;    // Preset value or custom input
  cbParticipation: string;// Preset value or custom input
  marketMood: string;     // Preset value or custom input
}

export interface VectorAnalysis {
  rating: 'Bullish' | 'Bearish' | 'Neutral';
  score: number; // e.g. -2 for bearish, +2 for bullish, 0 neutral
  analysis: string;
}

export interface MacroBiasResult {
  assetSymbol: string;
  bias: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
  aggregateScore: number; // -100 to 100 scale
  vectors: {
    monetaryPolicy: VectorAnalysis;
    geopolitics: VectorAnalysis;
    cbParticipation: VectorAnalysis;
    marketMood: VectorAnalysis;
  };
  executiveSummary: string;
  tradingImplications: string;
  riskManagementAdvice: string;
  suggestedRiskMultiplier: number; // e.g., 0.5x, 1.0x, 1.5x based on confluence
  timestamp: string;
}

export interface LivePrice {
  symbol: string;
  price: number;
  change24h: number; // percentage
  bid: number;
  ask: number;
  high: number;
  low: number;
  lastUpdated: string;
}
