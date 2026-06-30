import { LotSizeCalculation, TradeSetup, TakeProfitTarget, ForexPair } from "../types";

export function getPipSize(symbol: string): number {
  if (symbol === "USD/JPY") return 0.01;
  if (symbol === "XAU/USD") return 0.1;
  return 0.0001;
}

export function calculateLotSize(
  setup: TradeSetup,
  pair: ForexPair,
  currentPrices: { [key: string]: number }
): LotSizeCalculation {
  const { direction, entryPrice, stopLossPrice, accountBalance, riskType, riskValue } = setup;

  // 1. Calculate risk in cash
  let riskCash = 0;
  if (riskType === "percentage") {
    riskCash = accountBalance * (riskValue / 100);
  } else {
    riskCash = riskValue;
  }

  // 2. Validate prices and calculate stop loss in pips
  const pipSize = getPipSize(pair.symbol);
  
  if (entryPrice <= 0 || stopLossPrice <= 0) {
    return {
      riskCash,
      stopLossPips: 0,
      pipValueUSD: 0,
      standardLots: 0,
      miniLots: 0,
      microLots: 0,
      positionUnits: 0,
      totalLotSize: 0,
      targets: [],
      isInvalid: true,
      errorMessage: "Prices must be positive numbers.",
    };
  }

  let stopLossPips = 0;
  if (direction === "BUY") {
    if (stopLossPrice >= entryPrice) {
      return {
        riskCash,
        stopLossPips: 0,
        pipValueUSD: 0,
        standardLots: 0,
        miniLots: 0,
        microLots: 0,
        positionUnits: 0,
        totalLotSize: 0,
        targets: [],
        isInvalid: true,
        errorMessage: "For BUY orders, Stop Loss must be BELOW the Entry Price.",
      };
    }
    stopLossPips = (entryPrice - stopLossPrice) / pipSize;
  } else { // SELL
    if (stopLossPrice <= entryPrice) {
      return {
        riskCash,
        stopLossPips: 0,
        pipValueUSD: 0,
        standardLots: 0,
        miniLots: 0,
        microLots: 0,
        positionUnits: 0,
        totalLotSize: 0,
        targets: [],
        isInvalid: true,
        errorMessage: "For SELL orders, Stop Loss must be ABOVE the Entry Price.",
      };
    }
    stopLossPips = (stopLossPrice - entryPrice) / pipSize;
  }

  if (stopLossPips <= 0) {
    return {
      riskCash,
      stopLossPips: 0,
      pipValueUSD: 0,
      standardLots: 0,
      miniLots: 0,
      microLots: 0,
      positionUnits: 0,
      totalLotSize: 0,
      targets: [],
      isInvalid: true,
      errorMessage: "Stop loss price is too close to entry price.",
    };
  }

  // 3. Determine Quote Currency Conversion Rate to USD
  // For standard pairs, contract value is calculated in quote currency
  let quoteToUsdRate = 1.0;
  const quote = pair.quoteCurrency;

  if (quote !== "USD") {
    // If quote is JPY, CAD, CHF, etc.
    // In our set of pairs, JPY, CAD, CHF are quoted with USD base (USD/JPY, USD/CAD, USD/CHF)
    // Therefore, the price of the pair represents how much Quote Currency equals 1 USD.
    // So 1 unit of Quote Currency = 1 / Price USD.
    const price = currentPrices[pair.symbol] || entryPrice;
    if (price > 0) {
      quoteToUsdRate = 1 / price;
    }
  }

  // Pip value for 1 standard lot = pipSize * ContractSize * Quote-to-USD Rate
  const pipValueUSD = pipSize * pair.contractSize * quoteToUsdRate;

  // 4. Calculate total lot size required
  // Risk Cash = LotSize * StopLossPips * PipValueFor1Lot
  // LotSize = Risk Cash / (StopLossPips * PipValueFor1Lot)
  const totalLotSize = riskCash / (stopLossPips * pipValueUSD);

  if (isNaN(totalLotSize) || !isFinite(totalLotSize) || totalLotSize <= 0) {
    return {
      riskCash,
      stopLossPips,
      pipValueUSD,
      standardLots: 0,
      miniLots: 0,
      microLots: 0,
      positionUnits: 0,
      totalLotSize: 0,
      targets: [],
      isInvalid: true,
      errorMessage: "Could not calculate lot size. Please verify your inputs.",
    };
  }

  // 5. Convert to standard lot units
  // Standard Lots = 100,000 units (1.00)
  // Mini Lots = 10,000 units (0.10)
  // Micro Lots = 1,000 units (0.01)
  const positionUnits = totalLotSize * pair.contractSize;
  
  // Floor standard lots
  const standardLots = Math.floor(totalLotSize);
  // Floor mini lots
  const miniLots = Math.floor((totalLotSize - standardLots) * 10);
  // Round micro lots
  const microLots = Math.round(((totalLotSize - standardLots) * 10 - miniLots) * 10);

  // 6. Generate Take Profit targets based on risk/reward ratios
  const ratios = [1.0, 2.0, 3.0, 4.0];
  const targets: TakeProfitTarget[] = ratios.map((ratio) => {
    const targetPips = stopLossPips * ratio;
    const priceOffset = targetPips * pipSize;
    const price = direction === "BUY" ? entryPrice + priceOffset : entryPrice - priceOffset;
    const profitCash = riskCash * ratio;

    return {
      ratio,
      price,
      profitCash,
      pips: targetPips,
    };
  });

  return {
    riskCash,
    stopLossPips,
    pipValueUSD,
    standardLots,
    miniLots,
    microLots,
    positionUnits,
    totalLotSize,
    targets,
    isInvalid: false,
  };
}
