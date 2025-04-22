
/**
 * Symbol Mapper with margin flagging for Kraken pairs.
 * Matches Binance USDT assets with Kraken USD pairs.
 * Adds 'margin: true/false' for Kraken-side pairs.
 */

async function getKrakenSymbols() {
    const res = await fetch('https://api.kraken.com/0/public/AssetPairs');
    const data = await res.json();
    const pairs = data.result;

    const krakenSymbols = {};
    for (let key in pairs) {
        const pair = pairs[key];
        if (pair.wsname && pair.wsname.endsWith("/USD")) {
            const name = pair.wsname.replace("/USD", "");
            krakenSymbols[name.toUpperCase()] = {
                kraken: key,
                margin: pair.leverage_buy.length > 0 || pair.leverage_sell.length > 0
            };
        }
    }
    return krakenSymbols;
}

async function getBinanceSymbols() {
    const res = await fetch('https://api.binance.com/api/v3/exchangeInfo');
    const data = await res.json();
    const binanceSymbols = {};

    for (let symbol of data.symbols) {
        if (symbol.quoteAsset === "USDT" && symbol.status === "TRADING") {
            binanceSymbols[symbol.baseAsset.toUpperCase()] = symbol.symbol;
        }
    }
    return binanceSymbols;
}

async function refreshSymbolMap() {
    const kraken = await getKrakenSymbols();
    const binance = await getBinanceSymbols();

    const map = {};
    const onlyInBinance = [];
    const onlyInKraken = [];

    for (let asset in binance) {
        if (kraken[asset]) {
            map[binance[asset]] = {
                kraken: kraken[asset].kraken,
                margin: kraken[asset].margin
            };
        } else {
            onlyInBinance.push(binance[asset]);
        }
    }

    for (let asset in kraken) {
        if (!binance[asset]) {
            onlyInKraken.push(kraken[asset].kraken);
        }
    }

    console.log("Symbol map updated:");
    console.log(map);
    console.log("Only in Binance:", onlyInBinance);
    console.log("Only in Kraken:", onlyInKraken);

    const blob = new Blob([JSON.stringify(map, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'symbol_map.json';
    link.click();
}
