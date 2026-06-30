import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  DollarSign, 
  ShieldAlert, 
  Percent, 
  SlidersHorizontal, 
  Target, 
  Sparkles, 
  Info, 
  Coins, 
  BookOpen, 
  Zap,
  CheckCircle,
  HelpCircle,
  ArrowRightLeft
} from "lucide-react";
import { FOREX_PAIRS, MACRO_PRESETS } from "./constants";
import { TradeSetup, TradeDirection, MacroBiasResult, LivePrice } from "./types";
import { calculateLotSize } from "./utils/calculator";

export default function App() {
  // --- STATE MANAGEMENT ---
  const [selectedSymbol, setSelectedSymbol] = useState<string>("EUR/USD");
  const [direction, setDirection] = useState<TradeDirection>("BUY");
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskType, setRiskType] = useState<"percentage" | "cash">("percentage");
  const [riskPercentage, setRiskPercentage] = useState<number>(1.5);
  const [riskCashAmount, setRiskCashAmount] = useState<number>(150);
  
  const [entryPrice, setEntryPrice] = useState<number>(1.0850);
  const [stopLossPrice, setStopLossPrice] = useState<number>(1.0820);
  const [userEditedEntry, setUserEditedEntry] = useState<boolean>(false);
  const [userEditedStop, setUserEditedStop] = useState<boolean>(false);

  // Live Exchange Rates
  const [rates, setRates] = useState<{ [key: string]: number }>({});
  const [loadingRates, setLoadingRates] = useState<boolean>(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Macro Engine Inputs
  const [monetaryPolicy, setMonetaryPolicy] = useState<string>(MACRO_PRESETS.monetaryPolicy[4].value);
  const [geopolitics, setGeopolitics] = useState<string>(MACRO_PRESETS.geopolitics[0].value);
  const [cbParticipation, setCbParticipation] = useState<string>(MACRO_PRESETS.cbParticipation[0].value);
  const [marketMood, setMarketMood] = useState<string>(MACRO_PRESETS.marketMood[1].value);
  
  // Macro Engine Custom Inputs Toggles
  const [customMonetary, setCustomMonetary] = useState<boolean>(false);
  const [customGeopolitics, setCustomGeopolitics] = useState<boolean>(false);
  const [customCb, setCustomCb] = useState<boolean>(false);
  const [customMood, setCustomMood] = useState<boolean>(false);

  // Macro Analysis Result state
  const [macroResult, setMacroResult] = useState<MacroBiasResult | null>(null);
  const [analyzingMacro, setAnalyzingMacro] = useState<boolean>(false);
  const [macroError, setMacroError] = useState<string | null>(null);
  const [isMacroFallback, setIsMacroFallback] = useState<boolean>(false);
  
  // Risk Multiplier Switch
  const [applyMultiplier, setApplyMultiplier] = useState<boolean>(true);

  // Selected Forex Pair configuration
  const currentPair = useMemo(() => {
    return FOREX_PAIRS.find(p => p.symbol === selectedSymbol) || FOREX_PAIRS[0];
  }, [selectedSymbol]);

  // --- API CALLS ---
  
  // Fetch live price rates
  const fetchRates = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingRates(true);
    try {
      const response = await fetch("/api/rates");
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success && data.rates) {
        setRates(data.rates);
        setRatesError(null);
        setLastRefreshed(new Date());

        // Update entry/stop loss price to current live price if not locked or modified by user
        const livePrice = data.rates[selectedSymbol];
        if (livePrice && livePrice > 0) {
          if (!userEditedEntry) {
            setEntryPrice(livePrice);
          }
          if (!userEditedStop && !userEditedEntry) {
            // Apply a default 30 pip stop loss as a sane initial default for better UX
            const isYenOrGold = selectedSymbol === "USD/JPY" || selectedSymbol === "XAU/USD";
            const pipFactor = isYenOrGold ? (selectedSymbol === "XAU/USD" ? 0.1 : 0.01) : 0.0001;
            const stopLossOffset = 30 * pipFactor;
            
            if (direction === "BUY") {
              setStopLossPrice(Number((livePrice - stopLossOffset).toFixed(currentPair.pipDecimalPlaces + 1)));
            } else {
              setStopLossPrice(Number((livePrice + stopLossOffset).toFixed(currentPair.pipDecimalPlaces + 1)));
            }
          }
        }
      } else {
        throw new Error(data.error || "Rates api returned an unsuccessful response");
      }
    } catch (err: any) {
      console.error(err);
      setRatesError(err.message || "Failed to load active rates. Using fallbacks.");
    } finally {
      if (!quiet) setLoadingRates(false);
    }
  }, [selectedSymbol, userEditedEntry, userEditedStop, direction, currentPair.pipDecimalPlaces]);

  // Trigger Macro Analysis
  const analyzeMacroeconomicBias = async () => {
    setAnalyzingMacro(true);
    setMacroError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetSymbol: selectedSymbol,
          monetaryPolicy,
          geopolitics,
          cbParticipation,
          marketMood,
        }),
      });

      if (!response.ok) {
        throw new Error(`Macro analysis request failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.analysis) {
        setMacroResult(data.analysis);
        setIsMacroFallback(!!data.isFallback);
      } else {
        throw new Error(data.error || "Unable to extract macro consensus analysis");
      }
    } catch (err: any) {
      console.error(err);
      setMacroError(err.message || "Failed to process macro evaluation. Please retry.");
    } finally {
      setAnalyzingMacro(false);
    }
  };

  // --- SIDE EFFECTS ---
  
  // Polling rates
  useEffect(() => {
    fetchRates();
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchRates(true);
      }, 12000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedSymbol, autoRefresh, fetchRates]);

  // Handle symbol change
  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    setUserEditedEntry(false);
    setUserEditedStop(false);
    
    // Preset macro inputs according to pair characteristics to make dashboard smart
    if (symbol === "XAU/USD") {
      setMonetaryPolicy("Fed signaling rate cuts, lowering yields. Dovish expansionary environment.");
      setGeopolitics("High escalating active military or trade blockades. Heavy capital flight into Gold and Safe Havens.");
      setCbParticipation("Aggressive central bank reserves diversification, buying physical gold and safe liquid instruments.");
      setMarketMood("Risk-Off Panic (VIX Spiking)");
    } else if (symbol === "USD/JPY") {
      setMonetaryPolicy("Bank of Japan preparing to hike rates or reduce bond buying. Bullish JPY pressure.");
      setGeopolitics("Low / Historical Baseline");
      setCbParticipation("Steady Commercial Flows");
      setMarketMood("Carry Trade unwinding");
    } else {
      // Defaults for major USD pairs
      setMonetaryPolicy("Central banks on hold. Balanced yield differentials, no immediate rate changes.");
      setGeopolitics("Low / Historical Baseline");
      setCbParticipation("Steady Commercial Flows");
      setMarketMood("Moderate / Range-bound Mood");
    }
    setCustomMonetary(false);
    setCustomGeopolitics(false);
    setCustomCb(false);
    setCustomMood(false);
    setMacroResult(null); // Clear old results to prompt user to run fresh analysis
  };

  // Live price getter helper
  const livePrice = rates[selectedSymbol] || currentPair.defaultPrice;

  // Sync Live price back into Entry
  const handleSyncLivePrice = () => {
    setEntryPrice(livePrice);
    setUserEditedEntry(true);
  };

  // Adjust Stop Loss by preset pips
  const adjustStopLossPips = (pipsDelta: number) => {
    const isYenOrGold = selectedSymbol === "USD/JPY" || selectedSymbol === "XAU/USD";
    const pipFactor = isYenOrGold ? (selectedSymbol === "XAU/USD" ? 0.1 : 0.01) : 0.0001;
    const deltaValue = pipsDelta * pipFactor;
    
    if (direction === "BUY") {
      setStopLossPrice(Number((entryPrice - deltaValue).toFixed(currentPair.pipDecimalPlaces + 1)));
    } else {
      setStopLossPrice(Number((entryPrice + deltaValue).toFixed(currentPair.pipDecimalPlaces + 1)));
    }
    setUserEditedStop(true);
  };

  // Calculate final Risk params considering Macro suggestion
  const activeRiskPercentage = useMemo(() => {
    if (riskType !== "percentage") return riskPercentage;
    if (applyMultiplier && macroResult?.suggestedRiskMultiplier) {
      return Number((riskPercentage * macroResult.suggestedRiskMultiplier).toFixed(2));
    }
    return riskPercentage;
  }, [riskPercentage, riskType, applyMultiplier, macroResult]);

  const activeRiskCash = useMemo(() => {
    if (riskType === "percentage") {
      return accountBalance * (activeRiskPercentage / 100);
    }
    if (applyMultiplier && macroResult?.suggestedRiskMultiplier) {
      return Number((riskCashAmount * macroResult.suggestedRiskMultiplier).toFixed(2));
    }
    return riskCashAmount;
  }, [riskCashAmount, riskType, activeRiskPercentage, accountBalance, applyMultiplier, macroResult]);

  // --- FINAL LOT SIZE CALCULATION ---
  const calculationResult = useMemo(() => {
    const tradeSetup: TradeSetup = {
      symbol: selectedSymbol,
      direction,
      entryPrice,
      stopLossPrice,
      accountBalance,
      accountCurrency: "USD",
      riskType: "cash", // Force Cash calculation using the calculated active risk cash
      riskValue: activeRiskCash
    };

    return calculateLotSize(tradeSetup, currentPair, rates);
  }, [selectedSymbol, direction, entryPrice, stopLossPrice, accountBalance, activeRiskCash, currentPair, rates]);

  // Sane default preset helper values
  const quickBalancePresets = [5000, 10000, 25000, 50000, 100000];
  const quickRiskPercentages = [0.1, 0.2, 0.3, 0.4, 0.5, 1.0, 1.5, 2.0, 3.0];

  // Helper colors for Macro bias state
  const getBiasColorDetails = (bias: string) => {
    switch (bias) {
      case "Strong Bullish":
        return { text: "text-[#4d663b]", bg: "bg-[#e2f0d9]", border: "border-[#b8d6a3]", label: "Strong Bullish" };
      case "Bullish":
        return { text: "text-[#5A5A40]", bg: "bg-[#F7F5F0]", border: "border-[#E8E4DB]", label: "Bullish" };
      case "Strong Bearish":
        return { text: "text-[#9e3b3b]", bg: "bg-[#fdeded]", border: "border-[#f4c3c3]", label: "Strong Bearish" };
      case "Bearish":
        return { text: "text-[#c26161]", bg: "bg-[#fbf2f2]", border: "border-[#eed6d6]", label: "Bearish" };
      default:
        return { text: "text-[#6b6b5b]", bg: "bg-[#f3f2ee]", border: "border-[#dfdbd1]", label: "Neutral Bias" };
    }
  };

  const biasColors = macroResult ? getBiasColorDetails(macroResult.bias) : null;

  return (
    <div id="app_root" className="min-h-screen bg-[#FDFCF9] text-[#3D3D35] flex flex-col font-sans selection:bg-[#5A5A40] selection:text-white antialiased">
      
      {/* HEADER */}
      <header id="main_header" className="sticky top-0 z-50 px-6 lg:px-12 py-5 flex flex-col sm:flex-row items-center justify-between border-b border-[#E8E4DB] bg-[#F7F5F0]/95 backdrop-blur-md gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-[#5A5A40] rounded-2xl flex items-center justify-center shadow-sm text-white">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#2C2C24] flex items-center gap-2">
              ForexFlow <span className="text-[#8C7B6C] font-normal italic">Calculator</span>
            </h1>
            <p className="text-[11px] text-[#8C7B6C] tracking-wide uppercase font-semibold">Macro Integration Engine</p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {/* Rate Tracker Badge */}
          <div className="bg-white border border-[#E8E4DB] px-4 py-2 rounded-xl flex items-center gap-3 shadow-2xs">
            <span className="text-xs font-semibold text-[#8C7B6C]">Live API:</span>
            <span className="text-xs font-bold text-[#5A5A40] font-mono flex items-center gap-2">
              {loadingRates ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8C7B6C]" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#8EA87C] inline-block animate-pulse"></span>
              )}
              {selectedSymbol}: {livePrice.toFixed(currentPair.pipDecimalPlaces + 1)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              id="btn_refresh_rates"
              onClick={() => fetchRates(false)}
              className="p-3.5 bg-white hover:bg-[#F7F5F0] border border-[#E8E4DB] rounded-xl transition-all duration-150 text-[#5A5A40] hover:scale-110 shadow-xs"
              title="Refresh pricing"
            >
              <RefreshCw className={`w-5 h-5 ${loadingRates ? "animate-spin text-[#8EA87C]" : ""}`} />
            </button>

            <label className="flex items-center gap-2 bg-white border border-[#E8E4DB] px-3 py-1.5 rounded-xl cursor-pointer select-none text-xs text-[#5A5A40] font-semibold">
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded-sm accent-[#5A5A40]" 
              />
              Auto Stream
            </label>
          </div>

          <div className="h-8 w-[1px] bg-[#E8E4DB] hidden md:block"></div>
          
          <div className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs">
            Standard Contract Size: {currentPair.contractSize.toLocaleString()} Units
          </div>
        </div>
      </header>

      {/* BODY WRAPPER */}
      <main id="main_content" className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: THE CORE CALCULATOR INPUTS (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white border border-[#E8E4DB] rounded-3xl p-6 lg:p-8 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#5A5A40]"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs uppercase tracking-[0.2em] text-[#8C7B6C] font-extrabold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Position Parameters
              </h2>
              <span className="text-xs text-[#8C7B6C] font-medium italic">
                Last Price Updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            </div>

            <div className="space-y-6">
              
              {/* ROW 1: Currency Selection & Account Balance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Selector */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="symbol_selector" className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center justify-between">
                    <span>Currency Pair / Asset</span>
                    <span className="text-[10px] text-[#8C7B6C] capitalize font-medium">{currentPair.name}</span>
                  </label>
                  <div className="relative">
                    <select 
                      id="symbol_selector"
                      value={selectedSymbol}
                      onChange={(e) => handleSymbolChange(e.target.value)}
                      className="w-full bg-[#F7F5F0] border border-[#E8E4DB] text-[#2C2C24] font-bold rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#5A5A40] transition-all cursor-pointer"
                    >
                      {FOREX_PAIRS.map((pair) => (
                        <option key={pair.symbol} value={pair.symbol}>
                          {pair.symbol} ({pair.symbol === "XAU/USD" ? "Gold" : "Forex"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Account Balance */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="input_balance" className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
                      Account Balance (USD)
                    </label>
                    <span className="text-[10px] text-[#8C7B6C] font-bold uppercase tracking-wider">Quick Presets</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 w-full">
                    {quickBalancePresets.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAccountBalance(val)}
                        className={`py-2 text-xs border rounded-lg transition-all font-mono font-bold text-center w-full ${
                          accountBalance === val
                            ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-xs scale-102"
                            : "bg-white text-[#8C7B6C] border-[#E8E4DB] hover:bg-[#5A5A40] hover:text-white"
                        }`}
                      >
                        {val / 1000}k
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7B6C] font-semibold">
                      $
                    </div>
                    <input 
                      id="input_balance"
                      type="number" 
                      value={accountBalance || ""} 
                      onChange={(e) => setAccountBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-[#F7F5F0] border border-[#E8E4DB] text-[#2C2C24] font-mono font-bold rounded-2xl pl-8 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#5A5A40] transition-all"
                      placeholder="10000"
                    />
                  </div>
                </div>

              </div>

              {/* ROW 2: Trade Direction Selection */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider">Trade Direction</span>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    id="btn_direction_buy"
                    type="button"
                    onClick={() => {
                      setDirection("BUY");
                      // Adjust stop loss to go below entry if it was opposite
                      if (stopLossPrice >= entryPrice) {
                        const isYenOrGold = selectedSymbol === "USD/JPY" || selectedSymbol === "XAU/USD";
                        const pipFactor = isYenOrGold ? (selectedSymbol === "XAU/USD" ? 0.1 : 0.01) : 0.0001;
                        setStopLossPrice(Number((entryPrice - 30 * pipFactor).toFixed(currentPair.pipDecimalPlaces + 1)));
                      }
                    }}
                    className={`py-5 px-6 rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 border transition-all duration-200 ${
                      direction === "BUY"
                        ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-md scale-102"
                        : "bg-white text-[#5A5A40] border-[#E8E4DB] hover:bg-[#F7F5F0] hover:shadow-xs"
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    BUY / LONG (Bid: {rates[selectedSymbol]?.toFixed(currentPair.pipDecimalPlaces + 1) || livePrice})
                  </button>
                  <button
                    id="btn_direction_sell"
                    type="button"
                    onClick={() => {
                      setDirection("SELL");
                      // Adjust stop loss to go above entry if it was opposite
                      if (stopLossPrice <= entryPrice) {
                        const isYenOrGold = selectedSymbol === "USD/JPY" || selectedSymbol === "XAU/USD";
                        const pipFactor = isYenOrGold ? (selectedSymbol === "XAU/USD" ? 0.1 : 0.01) : 0.0001;
                        setStopLossPrice(Number((entryPrice + 30 * pipFactor).toFixed(currentPair.pipDecimalPlaces + 1)));
                      }
                    }}
                    className={`py-5 px-6 rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 border transition-all duration-200 ${
                      direction === "SELL"
                        ? "bg-[#C97C7C] text-white border-[#C97C7C] shadow-md scale-102"
                        : "bg-white text-[#C97C7C] border-[#E8E4DB] hover:bg-[#FBF2F2] hover:shadow-xs"
                    }`}
                  >
                    <TrendingDown className="w-5 h-5" />
                    SELL / SHORT (Ask: {rates[selectedSymbol]?.toFixed(currentPair.pipDecimalPlaces + 1) || livePrice})
                  </button>
                </div>
              </div>

              {/* ROW 3: Risk Configuration Options */}
              <div className="bg-[#F7F5F0] rounded-2xl p-4 border border-[#E8E4DB] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2.5 p-1.5 bg-white rounded-xl border border-[#E8E4DB]">
                    <button
                      type="button"
                      onClick={() => setRiskType("percentage")}
                      className={`px-5.5 py-3 rounded-lg text-sm font-extrabold transition-all ${
                        riskType === "percentage" 
                          ? "bg-[#5A5A40] text-white shadow-xs" 
                          : "text-[#8C7B6C] hover:bg-[#F7F5F0]"
                      }`}
                    >
                      Risk Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRiskType("cash")}
                      className={`px-5.5 py-3 rounded-lg text-sm font-extrabold transition-all ${
                        riskType === "cash" 
                          ? "bg-[#5A5A40] text-white shadow-xs" 
                          : "text-[#8C7B6C] hover:bg-[#F7F5F0]"
                      }`}
                    >
                      Risk Fixed Cash ($)
                    </button>
                  </div>

                  {/* Visual feedback if macro suggestions are integrated */}
                  {macroResult && applyMultiplier && (
                    <div className="text-[11px] text-[#4d663b] bg-[#e2f0d9] border border-[#b8d6a3] px-2 py-1 rounded-md font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#4d663b]" />
                      Macro-scaled: {macroResult.suggestedRiskMultiplier}x
                    </div>
                  )}
                </div>

                {riskType === "percentage" ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <span className="text-xs text-[#8C7B6C] font-semibold">Slide to adjust risk percentage of your balance:</span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {quickRiskPercentages.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setRiskPercentage(p)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                              riskPercentage === p 
                                ? "bg-[#5A5A40] text-white border-[#5A5A40] scale-105 shadow-xs" 
                                : "bg-white hover:bg-[#F7F5F0] text-[#8C7B6C] border-[#E8E4DB]"
                            }`}
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="0.1" 
                        max="10.0" 
                        step="0.1"
                        value={riskPercentage}
                        onChange={(e) => setRiskPercentage(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-[#E8E4DB] rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
                      />
                      <div className="w-20 bg-white border border-[#E8E4DB] rounded-xl px-2 py-1 text-center text-sm font-mono font-bold text-[#2C2C24]">
                        {riskPercentage}%
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-[#8C7B6C] pt-1">
                      <span>Standard Base Risk: ${(accountBalance * (riskPercentage / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      {macroResult && applyMultiplier && (
                        <span className="font-bold text-[#4d663b]">
                          Macro Impact Risk: ${activeRiskCash.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({activeRiskPercentage}%)
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="input_risk_cash" className="text-xs font-semibold text-[#8C7B6C]">Amount at risk per trade (USD):</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7B6C] font-semibold">
                        $
                      </div>
                      <input 
                        id="input_risk_cash"
                        type="number" 
                        value={riskCashAmount || ""}
                        onChange={(e) => setRiskCashAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-white border border-[#E8E4DB] text-[#2C2C24] font-mono font-bold rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        placeholder="150"
                      />
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-[#8C7B6C] pt-1">
                      <span>Standard Base Cash Risk: ${riskCashAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      {macroResult && applyMultiplier && (
                        <span className="font-bold text-[#4d663b]">
                          Macro Impact Cash Risk: ${activeRiskCash.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({((activeRiskCash / accountBalance) * 100).toFixed(2)}% of balance)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ROW 4: Price Inputs (Entry & Stop Loss) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center gap-1">
                    Price Parameters
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSyncLivePrice}
                      className="px-4 py-2.5 text-xs sm:text-sm font-extrabold bg-[#8EA87C] hover:bg-[#7e996c] text-white rounded-xl flex items-center gap-1.5 transition-all shadow-xs hover:scale-102"
                    >
                      <Zap className="w-4 h-4" /> Set Entry to Live
                    </button>
                    {(userEditedEntry || userEditedStop) && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserEditedEntry(false);
                          setUserEditedStop(false);
                          fetchRates();
                        }}
                        className="text-xs text-[#8C7B6C] underline hover:text-[#5A5A40]"
                      >
                        Reset Lock
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Entry Price */}
                  <div className="flex flex-col gap-2 bg-[#F7F5F0] p-4 rounded-2xl border border-[#E8E4DB]">
                    <div className="flex justify-between items-center">
                      <label htmlFor="input_entry_price" className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
                        Entry Price
                      </label>
                      {userEditedEntry && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-sm font-bold uppercase">Locked</span>
                      )}
                    </div>
                    <input 
                      id="input_entry_price"
                      type="number" 
                      step="0.00001"
                      value={entryPrice || ""} 
                      onChange={(e) => {
                        setEntryPrice(parseFloat(e.target.value) || 0);
                        setUserEditedEntry(true);
                      }}
                      className="w-full bg-white border border-[#E8E4DB] text-[#2C2C24] rounded-xl px-4 py-3 text-base font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                    <div className="text-[11px] text-[#8C7B6C] flex justify-between items-center pt-1">
                      <span>Interactive Entry Value</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEntryPrice(livePrice);
                          setUserEditedEntry(true);
                        }}
                        className="hover:bg-[#5A5A40] hover:text-white border border-[#E8E4DB] px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all uppercase tracking-wider"
                      >
                        Match live
                      </button>
                    </div>
                  </div>

                  {/* Stop Loss Price */}
                  <div className="flex flex-col gap-2 bg-[#FBF2F2] p-4 rounded-2xl border border-[#E8D9D9]">
                    <div className="flex justify-between items-center">
                      <label htmlFor="input_stop_loss_price" className="text-xs font-bold text-[#9e3b3b] uppercase tracking-wider">
                        Stop Loss Price
                      </label>
                      <span className="text-[10px] text-[#C97C7C] font-bold">Absolute Risk boundary</span>
                    </div>
                    <input 
                      id="input_stop_loss_price"
                      type="number" 
                      step="0.00001"
                      value={stopLossPrice || ""} 
                      onChange={(e) => {
                        setStopLossPrice(parseFloat(e.target.value) || 0);
                        setUserEditedStop(true);
                      }}
                      className="w-full bg-white border border-[#E8D9D9] text-[#9e3b3b] rounded-xl px-4 py-3 text-base font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#C97C7C]"
                    />
                    
                    {/* Quick Pip Adjusters */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-[#E8D9D9]/50 mt-2">
                      <span className="text-[10px] font-bold text-[#9e3b3b] uppercase tracking-wider">Modify Stop Offset:</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {[-50, -30, -10, 10, 30, 50].map((pips) => (
                          <button
                            key={pips}
                            type="button"
                            onClick={() => adjustStopLossPips(pips)}
                            className="px-3 py-1.5 text-xs bg-white hover:bg-[#5A5A40] hover:text-white border border-[#E8D9D9] rounded-lg font-bold text-[#9e3b3b] transition-all min-w-[2.75rem] text-center shadow-3xs"
                          >
                            {pips > 0 ? `+${pips}` : pips}p
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* DYNAMIC INFORMATION CARD */}
          <div className="bg-[#F7F5F0] border border-[#E8E4DB] rounded-2xl p-5 flex items-start gap-3">
            <Info className="w-5 h-5 text-[#8C7B6C] shrink-0 mt-0.5" />
            <div className="text-xs text-[#8C7B6C] leading-relaxed">
              <p className="font-bold text-[#5A5A40] mb-1">Interactive Pip & Calculation Mechanics:</p>
              Your lot size calculations automatically scale to match quote parameters. For standard currency pairs like <span className="font-mono text-[#5A5A40]">EUR/USD</span>, 1 Pip equals 0.0001 units. For Yen-based pairs (<span className="font-mono text-[#5A5A40]">USD/JPY</span>), 1 Pip is 0.01. Gold (<span className="font-mono text-[#5A5A40]">XAU/USD</span>) uses a contract size of 100 ounces with 1 Pip defined as $0.10. Sizing represents standard contracts of 100,000 units.
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: CALCULATION RESULTS & ADVANCED MACRO (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* TOP BOX: RECOMMENDATIONS */}
          <div className="bg-[#F7F5F0] border-2 border-[#5A5A40] rounded-3xl p-6 lg:p-8 flex flex-col relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 bg-[#5A5A40] text-white text-[10px] font-extrabold tracking-wider rounded-full uppercase">
                Optimized Exposure
              </span>
            </div>

            <span className="text-xs uppercase tracking-[0.2em] text-[#8C7B6C] font-extrabold mb-3 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#5A5A40]" /> Recommended Lot Size
            </span>

            {/* ERROR DISPLAY */}
            {calculationResult.isInvalid ? (
              <div className="py-8 text-center text-[#c26161]">
                <ShieldAlert className="w-12 h-12 mx-auto mb-3" />
                <p className="font-bold text-sm">Calculation Halted</p>
                <p className="text-xs mt-1 bg-[#fdeded] p-2.5 rounded-xl border border-[#eed6d6] inline-block">
                  {calculationResult.errorMessage}
                </p>
              </div>
            ) : (
              <>
                <div className="my-3 text-center">
                  <div className="text-6xl font-black text-[#2C2C24] font-mono tracking-tight flex items-baseline justify-center">
                    {calculationResult.totalLotSize.toFixed(2)}
                    <span className="text-2xl text-[#8C7B6C] ml-2 font-normal italic">standard lots</span>
                  </div>
                  
                  {/* LOT FRACTIONAL BREAKDOWN */}
                  <div className="mt-4 flex justify-center gap-1.5 flex-wrap">
                    <span className="px-3 py-1 bg-white border border-[#E8E4DB] rounded-lg text-xs font-mono font-semibold text-[#5A5A40]">
                      <strong className="text-sm font-bold">{calculationResult.standardLots}</strong> Standard Lots
                    </span>
                    <span className="px-3 py-1 bg-white border border-[#E8E4DB] rounded-lg text-xs font-mono font-semibold text-[#5A5A40]">
                      <strong className="text-sm font-bold">{calculationResult.miniLots}</strong> Mini (0.1)
                    </span>
                    <span className="px-3 py-1 bg-white border border-[#E8E4DB] rounded-lg text-xs font-mono font-semibold text-[#5A5A40]">
                      <strong className="text-sm font-bold">{calculationResult.microLots}</strong> Micro (0.01)
                    </span>
                  </div>
                </div>

                {/* TWO COLUMN METRICS */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="bg-white/70 rounded-2xl p-3 text-center border border-[#E8E4DB]">
                    <p className="text-[10px] uppercase tracking-wider text-[#8C7B6C] font-extrabold mb-1">Position Units</p>
                    <p className="text-base font-extrabold text-[#2C2C24] font-mono">
                      {Math.round(calculationResult.positionUnits).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/70 rounded-2xl p-3 text-center border border-[#E8E4DB]">
                    <p className="text-[10px] uppercase tracking-wider text-[#8C7B6C] font-extrabold mb-1">Stop Loss Pips</p>
                    <p className="text-base font-extrabold text-[#2C2C24] font-mono">
                      {calculationResult.stopLossPips.toFixed(1)} pips
                    </p>
                  </div>
                </div>

                {/* GENERAL FINANCES */}
                <div className="mt-6 pt-5 border-t border-[#E8E4DB] space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8C7B6C] font-semibold uppercase tracking-wider">Total Risk Cash ($)</span>
                    <span className="text-sm font-bold text-[#c26161] font-mono">
                      -${calculationResult.riskCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8C7B6C] font-semibold uppercase tracking-wider">Pip Value USD</span>
                    <span className="text-sm font-bold text-[#2C2C24] font-mono">
                      ${calculationResult.pipValueUSD.toFixed(2)} <span className="text-[10px] text-[#8C7B6C] font-normal">/ lot</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8C7B6C] font-semibold uppercase tracking-wider">Estimated Leverage Needed</span>
                    <span className="text-sm font-bold text-[#2C2C24] font-mono">
                      1:{Math.round(calculationResult.positionUnits / accountBalance)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* BOTTOM BOX: TAKE PROFIT ESTIMATIONS */}
          {!calculationResult.isInvalid && (
            <div className="bg-white border border-[#E8E4DB] rounded-3xl p-6 shadow-xs">
              <h3 className="text-xs uppercase tracking-[0.2em] text-[#8C7B6C] font-extrabold mb-4 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#8EA87C]" /> Profit Targets (R:R Ratio)
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {calculationResult.targets.map((tgt) => (
                  <div key={tgt.ratio} className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E8E4DB] flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-1">
                      <span className="px-1.5 py-0.5 bg-[#5A5A40] text-white text-[9px] font-extrabold rounded-sm">
                        1:{tgt.ratio} R:R
                      </span>
                      <span className="text-[10px] text-[#8C7B6C] font-mono">+{tgt.pips.toFixed(1)}p</span>
                    </div>
                    <div className="text-sm font-mono font-bold text-[#2C2C24] leading-tight">
                      {tgt.price.toFixed(currentPair.pipDecimalPlaces + 1)}
                    </div>
                    <div className="text-[11px] font-bold text-[#8EA87C] mt-1 font-mono">
                      +${tgt.profitCash.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUOTE COMPASS */}
          <div className="bg-[#5A5A40] text-[#FDFCF9] rounded-3xl p-6 relative overflow-hidden shadow-xs">
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
              <Coins className="w-32 h-32" />
            </div>
            <h4 className="text-xs uppercase tracking-[0.15em] text-[#E8E4DB] font-extrabold mb-2">Aesthetic Trading Note</h4>
            <p className="text-xs italic leading-relaxed text-[#F7F5F0]">
              "Sizing isn't about maximizing single-trade upside. It's about preserving dry powder through structural confidence. Execute with systematic discipline."
            </p>
          </div>

        </div>

      </main>

      {/* MACROECONOMIC ANALYTICS SECTION (Full Width Container) */}
      <section id="macro_section" className="max-w-7xl mx-auto w-full p-4 lg:p-8 border-t border-[#E8E4DB] mt-8 bg-[#F7F5F0]">
        
        <div className="bg-white border border-[#E8E4DB] rounded-3xl p-6 lg:p-8 shadow-xs">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-[#8C7B6C] font-extrabold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#5A5A40]" /> Advanced Institutional Evaluation
              </span>
              <h2 className="text-2xl font-black text-[#2C2C24] mt-1 tracking-tight">Macroeconomic Market Bias Engine</h2>
              <p className="text-xs text-[#8C7B6C] mt-0.5">Evaluate global liquidity, safe-havens, interest rate vectors, and geopolitical pressure</p>
            </div>

            <div className="flex items-center gap-3">
              {macroResult && (
                <label className="flex items-center gap-2 bg-[#F7F5F0] border border-[#E8E4DB] px-3.5 py-2 rounded-xl text-xs font-bold text-[#5A5A40] cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={applyMultiplier} 
                    onChange={(e) => setApplyMultiplier(e.target.checked)}
                    className="rounded-sm accent-[#5A5A40]"
                  />
                  Auto-scale Exposure Risk (Multiplier)
                </label>
              )}
              <button
                id="btn_analyze_macro"
                onClick={analyzeMacroeconomicBias}
                disabled={analyzingMacro}
                className="px-9 py-5 bg-[#5A5A40] text-white hover:bg-[#4A4A35] rounded-2xl font-extrabold text-base shadow-md transition-all hover:shadow-lg hover:scale-102 disabled:opacity-50 flex items-center gap-3"
              >
                {analyzingMacro ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Synthesizing Vectors...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Synthesize Market Bias
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* VECTOR INPUT FORM (lg:col-span-6) */}
            <div className="lg:col-span-6 space-y-5">
              
              <div className="p-4 bg-[#FDFCF9] rounded-2xl border border-[#E8E4DB] space-y-4">
                
                {/* Vector 1: Monetary Policy */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
                      1. Monetary Policy & Interest Rates
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomMonetary(!customMonetary)}
                      className="bg-[#F7F5F0] hover:bg-[#5A5A40] hover:text-white border border-[#E8E4DB] px-3 py-1.5 rounded-lg text-xs font-bold text-[#8C7B6C] transition-all"
                    >
                      {customMonetary ? "Use Preset" : "Custom Text"}
                    </button>
                  </div>
                  {customMonetary ? (
                    <textarea
                      value={monetaryPolicy}
                      onChange={(e) => setMonetaryPolicy(e.target.value)}
                      className="w-full bg-white border border-[#E8E4DB] rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                      rows={2}
                      placeholder="Enter custom central bank monetary policy bias..."
                    />
                  ) : (
                    <select
                      value={monetaryPolicy}
                      onChange={(e) => setMonetaryPolicy(e.target.value)}
                      className="w-full bg-white border border-[#E8E4DB] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    >
                      {MACRO_PRESETS.monetaryPolicy.map((item, idx) => (
                        <option key={idx} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Vector 2: Geopolitical Tensions */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
                      2. Geopolitical Tensions
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomGeopolitics(!customGeopolitics)}
                      className="bg-[#F7F5F0] hover:bg-[#5A5A40] hover:text-white border border-[#E8E4DB] px-3 py-1.5 rounded-lg text-xs font-bold text-[#8C7B6C] transition-all"
                    >
                      {customGeopolitics ? "Use Preset" : "Custom Text"}
                    </button>
                  </div>
                  {customGeopolitics ? (
                    <textarea
                      value={geopolitics}
                      onChange={(e) => setGeopolitics(e.target.value)}
                      className="w-full bg-white border border-[#E8E4DB] rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                      rows={2}
                      placeholder="Enter custom geopolitical scenarios..."
                    />
                  ) : (
                    <select
                      value={geopolitics}
                      onChange={(e) => setGeopolitics(e.target.value)}
                      className="w-full bg-white border border-[#E8E4DB] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    >
                      {MACRO_PRESETS.geopolitics.map((item, idx) => (
                        <option key={idx} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Vector 3: CB / Institutional flows */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
                      3. Institutional / CB Participation
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomCb(!customCb)}
                      className="bg-[#F7F5F0] hover:bg-[#5A5A40] hover:text-white border border-[#E8E4DB] px-3 py-1.5 rounded-lg text-xs font-bold text-[#8C7B6C] transition-all"
                    >
                      {customCb ? "Use Preset" : "Custom Text"}
                    </button>
                  </div>
                  {customCb ? (
                    <textarea
                      value={cbParticipation}
                      onChange={(e) => setCbParticipation(e.target.value)}
                      className="w-full bg-white border border-[#E8E4DB] rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                      rows={2}
                      placeholder="Enter custom institutional flows detail..."
                    />
                  ) : (
                    <select
                      value={cbParticipation}
                      onChange={(e) => setCbParticipation(e.target.value)}
                      className="w-full bg-white border border-[#E8E4DB] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    >
                      {MACRO_PRESETS.cbParticipation.map((item, idx) => (
                        <option key={idx} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Vector 4: Market Mood */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
                      4. Market Mood & Sentiment (Risk-On / Risk-Off)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomMood(!customMood)}
                      className="bg-[#F7F5F0] hover:bg-[#5A5A40] hover:text-white border border-[#E8E4DB] px-3 py-1.5 rounded-lg text-xs font-bold text-[#8C7B6C] transition-all"
                    >
                      {customMood ? "Use Preset" : "Custom Text"}
                    </button>
                  </div>
                  {customMood ? (
                    <textarea
                      value={marketMood}
                      onChange={(e) => setMarketMood(e.target.value)}
                      className="w-full bg-white border border-[#E8E4DB] rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                      rows={2}
                      placeholder="Enter custom equity, VIX, spreads mood metrics..."
                    />
                  ) : (
                    <select
                      value={marketMood}
                      onChange={(e) => setMarketMood(e.target.value)}
                      className="w-full bg-white border border-[#E8E4DB] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    >
                      {MACRO_PRESETS.marketMood.map((item, idx) => (
                        <option key={idx} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  )}
                </div>

              </div>

            </div>

            {/* REAL-TIME AI OUTPUT DISPLAY (lg:col-span-6) */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              
              {macroError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs font-semibold leading-relaxed">
                    <p className="font-bold mb-1">Macro Engine Error</p>
                    {macroError}
                  </div>
                </div>
              )}

              {!macroResult && !analyzingMacro && !macroError && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[#E8E4DB] rounded-3xl bg-[#FDFCF9]">
                  <Sparkles className="w-12 h-12 text-[#8C7B6C] mb-3 animate-pulse" />
                  <h4 className="text-sm font-bold text-[#2C2C24]">Ready for Confluence Scan</h4>
                  <p className="text-xs text-[#8C7B6C] max-w-sm mt-1 leading-relaxed">
                    Set your monetary policy parameters on the left, then click <strong>Synthesize Market Bias</strong>. The system will leverage Gemini AI or heuristics to compile a macroeconomic rating and risk profile.
                  </p>
                </div>
              )}

              {analyzingMacro && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#FDFCF9] border border-[#E8E4DB] rounded-3xl">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-[#E8E4DB] border-t-[#5A5A40] animate-spin"></div>
                  </div>
                  <h4 className="text-sm font-bold text-[#2C2C24]">Synthesizing Macro Consensus...</h4>
                  <p className="text-xs text-[#8C7B6C] max-w-sm mt-1 leading-relaxed">
                    Intaking central bank rhetoric, sovereign flows, trade barriers, and global risk indices to construct an aggregate market bias rating.
                  </p>
                </div>
              )}

              {macroResult && !analyzingMacro && biasColors && (
                <div className="flex-1 flex flex-col gap-5">
                  
                  {/* COMPASS HEADER BANNER */}
                  <div className={`p-5 rounded-2xl border ${biasColors.border} ${biasColors.bg} flex items-center justify-between`}>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#8C7B6C]">Aggregate Market Bias</span>
                      <div className={`text-2xl font-black ${biasColors.text} tracking-tight mt-0.5`}>
                        {macroResult.bias}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#8C7B6C]">Score Index</span>
                      <div className="text-xl font-mono font-black text-[#2C2C24] mt-0.5">
                        {macroResult.aggregateScore > 0 ? `+${macroResult.aggregateScore}` : macroResult.aggregateScore}
                      </div>
                    </div>
                  </div>

                  {/* HIGH LEVEL EXECUTIVE BRIEFING */}
                  <div className="p-4 bg-[#F7F5F0] rounded-xl border border-[#E8E4DB] text-xs leading-relaxed text-[#3D3D35]">
                    <span className="font-bold text-[#5A5A40] block mb-1">Executive Briefing:</span>
                    {macroResult.executiveSummary}
                  </div>

                  {/* FOUR VECTOR MINI CHIPS */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-[#FDFCF9] rounded-lg border border-[#E8E4DB] flex justify-between items-center">
                      <span className="text-[10px] text-[#8C7B6C] font-semibold uppercase">1. Policy Rates</span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-sm ${
                        macroResult.vectors.monetaryPolicy.rating === "Bullish" ? "bg-[#e2f0d9] text-[#4d663b]" : 
                        macroResult.vectors.monetaryPolicy.rating === "Bearish" ? "bg-[#fdeded] text-[#9e3b3b]" : "bg-[#f3f2ee] text-[#6b6b5b]"
                      }`}>{macroResult.vectors.monetaryPolicy.rating}</span>
                    </div>
                    <div className="p-2.5 bg-[#FDFCF9] rounded-lg border border-[#E8E4DB] flex justify-between items-center">
                      <span className="text-[10px] text-[#8C7B6C] font-semibold uppercase">2. Geopolitical</span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-sm ${
                        macroResult.vectors.geopolitics.rating === "Bullish" ? "bg-[#e2f0d9] text-[#4d663b]" : 
                        macroResult.vectors.geopolitics.rating === "Bearish" ? "bg-[#fdeded] text-[#9e3b3b]" : "bg-[#f3f2ee] text-[#6b6b5b]"
                      }`}>{macroResult.vectors.geopolitics.rating}</span>
                    </div>
                    <div className="p-2.5 bg-[#FDFCF9] rounded-lg border border-[#E8E4DB] flex justify-between items-center">
                      <span className="text-[10px] text-[#8C7B6C] font-semibold uppercase">3. CB Flows</span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-sm ${
                        macroResult.vectors.cbParticipation.rating === "Bullish" ? "bg-[#e2f0d9] text-[#4d663b]" : 
                        macroResult.vectors.cbParticipation.rating === "Bearish" ? "bg-[#fdeded] text-[#9e3b3b]" : "bg-[#f3f2ee] text-[#6b6b5b]"
                      }`}>{macroResult.vectors.cbParticipation.rating}</span>
                    </div>
                    <div className="p-2.5 bg-[#FDFCF9] rounded-lg border border-[#E8E4DB] flex justify-between items-center">
                      <span className="text-[10px] text-[#8C7B6C] font-semibold uppercase">4. Market Sentiment</span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-sm ${
                        macroResult.vectors.marketMood.rating === "Bullish" ? "bg-[#e2f0d9] text-[#4d663b]" : 
                        macroResult.vectors.marketMood.rating === "Bearish" ? "bg-[#fdeded] text-[#9e3b3b]" : "bg-[#f3f2ee] text-[#6b6b5b]"
                      }`}>{macroResult.vectors.marketMood.rating}</span>
                    </div>
                  </div>

                  {/* IMPLICATIONS & RISK */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="p-3 bg-white rounded-xl border border-[#E8E4DB] text-xs">
                      <strong className="text-[#5A5A40] block mb-0.5">Trading Tactics:</strong>
                      <p className="text-[#8C7B6C] leading-normal">{macroResult.tradingImplications}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#E8E4DB] text-xs">
                      <strong className="text-[#5A5A40] block mb-0.5">Risk Controls:</strong>
                      <p className="text-[#8C7B6C] leading-normal">{macroResult.riskManagementAdvice}</p>
                    </div>
                  </div>

                  {/* RISK SCALE BUTTON */}
                  <div className="p-3 bg-[#e2f0d9] border border-[#b8d6a3] rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#4d663b] shrink-0" />
                      <div className="text-xs">
                        <span className="font-extrabold text-[#4d663b] block leading-tight">Recommended Risk Scale: {macroResult.suggestedRiskMultiplier}x</span>
                        <span className="text-[#8C7B6C] text-[10px]">Adjusts size according to systemic alignment</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setApplyMultiplier(!applyMultiplier)}
                      className={`px-6 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-sm shrink-0 ${
                        applyMultiplier 
                          ? "bg-[#4d663b] text-white" 
                          : "bg-white text-[#4d663b] border border-[#b8d6a3] hover:bg-[#e2f0d9]"
                      }`}
                    >
                      {applyMultiplier ? "Scaling Active" : "Apply Scale"}
                    </button>
                  </div>

                  {isMacroFallback && (
                    <div className="text-right">
                      <span className="text-[9px] text-[#8C7B6C] italic font-semibold">
                        * Deterministic analysis engine running active heuristics.
                      </span>
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>

        </div>

      </section>

      {/* FOOTER */}
      <footer id="main_footer" className="mt-auto h-20 px-6 lg:px-12 border-t border-[#E8E4DB] bg-white flex flex-col sm:flex-row items-center justify-between gap-2 py-4">
        <div className="flex gap-6 text-[11px] font-semibold text-[#8C7B6C] uppercase tracking-wider">
          <span className="cursor-default">ForexFlow Dashboard v1.4</span>
          <span className="hidden sm:inline text-[#E8E4DB]">|</span>
          <span className="cursor-default">Natural Tones Styling</span>
        </div>
        <div className="text-[11px] text-[#8C7B6C] font-semibold">
          Data stream provided by <span className="text-[#5A5A40] underline decoration-[#D9D4CC]">Open Exchange Rates</span>
        </div>
      </footer>

    </div>
  );
}
