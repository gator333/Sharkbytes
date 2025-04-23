
/**
 * Enhanced Symbol Mapper for SwampGatorScanner
 * - Compares Binance and Kraken symbols by base asset (e.g., BTC, ETH)
 * - Outputs 3 lists: common coins, only in Binance, only in Kraken
 * - Produces a downloadable symbol_map.json
 * - Logs a comparison summary file for tracking historical diffs
 */

async function fetchBinanceSymbols() {
  const res = await fetch("https://api.binance.com/api/v3/exchangeInfo");
  const data = await res.json();
  const symbols = {};
  for (let s of data.symbols) {
    if (s.quoteAsset === "USDT" && s.status === "TRADING") {
      symbols[s.baseAsset.toUpperCase()] = {
        binanceSymbol: s.symbol,
        name: s.baseAsset
      };
    }
  }
  return symbols;
}

async function fetchKrakenSymbols() {
  const res = await fetch("https://api.kraken.com/0/public/AssetPairs");
  const data = await res.json();
  const symbols = {};
  for (let key in data.result) {
    const pair = data.result[key];
    if (pair.wsname && pair.wsname.endsWith("/USD")) {
      const base = pair.wsname.split("/")[0].toUpperCase();
      symbols[base] = {
        krakenSymbol: key,
        name: base,
        margin: (pair.leverage_buy && pair.leverage_buy.length > 0)
      };
    }
  }
  return symbols;
}

async function buildSymbolMap() {
  const binance = await fetchBinanceSymbols();
  const kraken = await fetchKrakenSymbols();

  const symbolMap = {};
  const common = [];
  const onlyBinance = [];
  const onlyKraken = [];

  for (let base in binance) {
    if (kraken[base]) {
      symbolMap[binance[base].binanceSymbol] = {
        symbol: base,
        name: base,
        kraken: kraken[base].krakenSymbol,
        margin: kraken[base].margin
      };
      common.push(base);
    } else {
      onlyBinance.push(base);
    }
  }

  for (let base in kraken) {
    if (!binance[base]) {
      onlyKraken.push(base);
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    commonSymbols: common,
    onlyOnBinance: onlyBinance,
    onlyOnKraken: onlyKraken
  };

  const mapBlob = new Blob([JSON.stringify(symbolMap, null, 2)], { type: 'application/json' });
  const summaryBlob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });

  const mapUrl = URL.createObjectURL(mapBlob);
  const summaryUrl = URL.createObjectURL(summaryBlob);

  const a1 = document.createElement('a');
  a1.href = mapUrl;
  a1.download = 'symbol_map.json';
  a1.click();

  const a2 = document.createElement('a');
  a2.href = summaryUrl;
  a2.download = 'symbol_map_summary.json';
  a2.click();

  console.log("Mapping complete. Files downloaded.");
}
