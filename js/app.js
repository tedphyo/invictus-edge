document.addEventListener("DOMContentLoaded", () => {
    // ── DOM refs ──
    const datePicker = document.getElementById("date-picker");
    const symbolSearchInput = document.getElementById("symbol-search-input");
    const symbolSearchResults = document.getElementById("symbol-search-results");
    const symbolSelect = document.getElementById("symbol-select");
    const currentSymbolDisplay = document.getElementById("current-symbol");
    const numerologyContainer = document.getElementById("numerology-container");
    const statusDot = document.getElementById("status-dot");
    const statusIndicator = document.getElementById("status-indicator");
    const marketSPYPrice = document.getElementById("spy-price");
    const marketSPYChange = document.getElementById("spy-change");
    const marketQQQPrice = document.getElementById("qqq-price");
    const marketQQQChange = document.getElementById("qqq-change");
    const marketDIAPrice = document.getElementById("dia-price");
    const marketDIAChange = document.getElementById("dia-change");
    const tradingViewContainer = document.getElementById("tradingview-advanced-chart");
    const chartLoading = document.getElementById("chart-loading");
    const chartSource = document.getElementById("chart-source");
    const chartTabs = document.querySelectorAll("[data-chart-symbol]");
    const bdSymbol = document.getElementById("bd-symbol");
    const bdLast = document.getElementById("bd-last");
    const bdChange = document.getElementById("bd-change");
    const bdRange = document.getElementById("bd-range");
    const bdHilo = document.getElementById("bd-hilo");
    const bdPrevClose = document.getElementById("bd-prevclose");
    const lastUpdatedEl = document.getElementById("last-updated");
    const signalBanner = document.getElementById("signal-banner");
    const watchlistPanel = document.getElementById("watchlist-panel");
    const watchlistToggle = document.getElementById("watchlist-toggle");
    const watchlistItems = document.getElementById("watchlist-items");

    // ── Data provider (swap this block to change source) ──
    const DATA_PROVIDER = {
        name: "finnhub",
        key: "d8fab4hr01qub7kgngsgd8fab4hr01qub7kgngt0",
        quote: function (symbol) {
            return "https://finnhub.io/api/v1/quote?symbol=" + encodeURIComponent(symbol) + "&token=" + this.key;
        },
        search: function (query) {
            return "https://finnhub.io/api/v1/search?q=" + encodeURIComponent(query) + "&token=" + this.key;
        },
        profile: function (symbol) {
            return "https://finnhub.io/api/v1/stock/profile2?symbol=" + encodeURIComponent(symbol) + "&token=" + this.key;
        }
    };

    // ── Listing (IPO) dates (numerology) ──
    // The instrument's market birthday — the day it began trading. ETFs use their
    // inception/first-trade date; stocks use their IPO date. Curated values take
    // priority; any symbol not listed here is resolved live from the data
    // provider's IPO date and cached, so every searched ticker shows its OWN
    // listing date on the same basis — never a stale leftover, never a mixed basis.
    const FOUNDATION_DATES = {
        "SPY": "1993-01-22",
        "QQQ": "1999-03-10",
        "DIA": "1998-01-14",
        "NVDA": "1999-01-22",
        "AAPL": "1980-12-12",
        "TSLA": "2010-06-29",
        "MSFT": "1986-03-13",
        "AMD": "1972-09-27",
        "INTC": "1971-10-13",
        "GOOGL": "2004-08-19",
        "GOOG": "2004-08-19",
        "AMZN": "1997-05-15",
        "META": "2012-05-18",
        "NFLX": "2002-05-23"
    };

    const INDEX_SYMBOLS = ["SPY", "QQQ", "DIA"];
    const WATCHLIST_SYMBOLS = ["SPY", "QQQ", "NVDA", "AAPL", "TSLA", "MSFT"];

    let currentCalculations = {};
    // Resolved foundation dates, seeded from the curated table and extended at
    // runtime with provider-fetched listing dates. Keyed by uppercase symbol.
    const foundationCache = Object.assign({}, FOUNDATION_DATES);
    let numerologyReqSeq = 0;
    let selectedSymbol = currentSymbolDisplay.textContent || "SPY";
    let chartSymbol = "SPY";
    let watchlistData = [];
    let liveTimer = null;
    let watchlistRefreshTimer = null;
    let retryTimer = null;
    let isPaused = false;
    let chartInterval = "15m";
    let lastSuccessTime = Date.now();
    let refreshFailCount = 0;

    const INTERVAL_MAP = {
        "1m": { tv: "1" },
        "5m": { tv: "5" },
        "15m": { tv: "15" },
        "1h": { tv: "60" },
        "D": { tv: "D" }
    };
    function getInterval() { return INTERVAL_MAP[chartInterval] || INTERVAL_MAP["15m"]; }

    // ── Load persisted state ──
    const savedSymbol = localStorage.getItem("invictus-edge-symbol");
    const savedInterval = localStorage.getItem("invictus-edge-interval");
    if (savedSymbol && savedSymbol !== "Custom") {
        selectedSymbol = savedSymbol;
        currentSymbolDisplay.textContent = savedSymbol;
    }
    if (savedInterval) chartInterval = savedInterval;

    // ── Status indicator ──
    function setStatus(state) {
        if (!statusDot || !statusIndicator) return;
        if (state === "live") {
            statusIndicator.textContent = "Live";
            statusDot.style.backgroundColor = "#34d399";
        } else if (state === "loading") {
            statusIndicator.textContent = "Loading…";
            statusDot.style.backgroundColor = "#d4af37";
        } else {
            statusIndicator.textContent = "Offline";
            statusDot.style.backgroundColor = "#fb7185";
        }
    }

    // ── Quote fetch (Finnhub) ──
    async function fetchQuote(symbol) {
        setStatus("loading");
        try {
            const res = await fetch(DATA_PROVIDER.quote(symbol));
            if (!res.ok) throw new Error("HTTP " + res.status);
            const q = await res.json();
            const price = Number(q && q.c);
            if (!Number.isFinite(price) || price === 0) {
                setStatus("offline");
                return { symbol: symbol, _source: "unavailable" };
            }
            setStatus("live");
            return {
                symbol: symbol,
                price: price,
                change: Number(q.d),
                changePercent: Number(q.dp),
                high: Number(q.h),
                low: Number(q.l),
                open: Number(q.o),
                prevClose: Number(q.pc),
                timestamp: (Number(q.t) || Math.floor(Date.now() / 1000)) * 1000,
                _source: "finnhub"
            };
        } catch (err) {
            console.warn("Quote fetch failed for " + symbol + ":", err.message || err);
            setStatus("offline");
            return { symbol: symbol, _source: "unavailable" };
        }
    }

    function fmt(n, d = 2) { return Number.isFinite(Number(n)) ? Number(n).toFixed(d) : "--"; }

    // ── Cycle-bias verdict lookup (precomputed, mechanism-free) ──
    function getVerdict(sym, dateStr) {
        if (!window.InvictusVerdicts) return null;
        return window.InvictusVerdicts.get(String(sym).toUpperCase(), dateStr);
    }
    function todayStr() { return new Date().toISOString().split("T")[0]; }

    // Each cycle number translated into a MARKET read (rooted in its numerology):
    // the spec is how the tape tends to behave, the tags are the playbook action.
    function getEnergySpec(n) {
        const map = {
            1: { spec: "Trend ignition — fresh directional push, lead the breakout", tags: ["breakout", "lead the move"] },
            2: { spec: "Two-sided balance — choppy range, wait for confirmation", tags: ["range-bound", "confirm first"] },
            3: { spec: "Volatility expansion — wide, headline-driven swings", tags: ["wide range", "expansion"] },
            4: { spec: "Structure holds — defined support/resistance, range discipline", tags: ["respect levels", "S/R holds"] },
            5: { spec: "Momentum — fast directional moves, ride continuation", tags: ["momentum", "ride the trend"] },
            6: { spec: "Mean reversion — fade extremes back toward VWAP/value", tags: ["mean reversion", "fade to VWAP"] },
            7: { spec: "Trap risk — false breaks, low conviction, trim size", tags: ["fakeout risk", "reduce size"] },
            8: { spec: "Institutional flow — strong trend follow-through, capital in motion", tags: ["smart money", "trend follow"] },
            9: { spec: "Exhaustion — cycle climax, reversal & profit-take risk", tags: ["exhaustion", "reversal risk"] },
            11: { spec: "Sharp inflection — violent two-way turns, stay nimble", tags: ["sharp turns", "high alert"] },
            22: { spec: "Major level — institutional battleground, big-figure test", tags: ["major level", "institutional"] },
            33: { spec: "Sentiment extreme — crowd capitulation or euphoria climax", tags: ["sentiment extreme", "stay disciplined"] }
        };
        return map[n] || { spec: "Neutral tape — no clear cycle edge", tags: ["neutral"] };
    }

    // ── Numerology dashboard render ──
    function renderNumerologyDashboard(data) {
        numerologyContainer.innerHTML = `
            <div class="grid-row grid-row-3">
                <div class="card card-ud"><div class="card-title">Universal Day</div><div class="card-value">${data.ud.value}<span class="card-number">/${data.ud.reduced}</span></div><div class="card-chain">Universal Year ${data.ud.universalYear}</div></div>
                <div class="card card-pd"><div class="card-title">${data.symbolFoundation.symbol} Cycle Day</div><div class="card-value">${data.symbolCycle.value}<span class="card-number">/${data.symbolCycle.reduced}</span></div><div class="card-chain">Symbol session cycle</div></div>
                <div class="card instr-current"><div class="card-title">${data.symbolFoundation.symbol} Listing</div><div class="card-value">${data.symbolFoundation.value}<span class="card-number">/${data.symbolFoundation.reduced}</span></div><div class="card-chain">${data.symbolFoundation.date}</div></div>
            </div>
            <div class="grid-row grid-row-2">
                <div class="card compat-card"><div class="card-title">Market Cycle Alignment</div><div class="compat-text">${data.compatibility.universal}</div></div>
                <div class="card compat-card"><div class="card-title">${data.symbolFoundation.symbol} Cycle Alignment</div><div class="compat-text">${data.compatibility.cycle}</div></div>
            </div>
            <div class="grid-row grid-row-2">
                <div class="card energy-card"><div class="card-title">Universal Energy Spec</div><div class="energy-spec">${data.universalEnergy.spec}</div><div class="energy-tags">${data.universalEnergy.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}</div></div>
                <div class="card energy-card"><div class="card-title">${data.symbolFoundation.symbol} Session Energy</div><div class="energy-spec">${data.symbolEnergy.spec}</div><div class="energy-tags">${data.symbolEnergy.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}</div></div>
            </div>
            <div class="grid-row"><div class="card guardrail-card ${data.guardrail.type}"><div class="card-title">Guardrail</div><div class="guardrail-text">${data.guardrail.message}</div><div class="market-notice">A ${data.guardrail.marketBias} day for ${data.symbolFoundation.symbol}</div></div></div>`;

        document.getElementById("sig-ud").textContent = data.ud.reduced;
        document.getElementById("sig-ud-int").textContent = data.ud.interpretation;
        document.getElementById("sig-pd").textContent = data.symbolCycle.reduced;
        document.getElementById("sig-pd-int").textContent = data.symbolCycle.interpretation;
        const signalItem = document.getElementById("sig-signal");
        const signalIntItem = document.getElementById("sig-signal-int");
        const parent = signalItem.parentElement;
        parent.classList.remove("v-srally", "v-rally", "v-neutral", "v-bear", "v-sbear", "v-vol");
        const verdict = data.signal;
        if (verdict && verdict.v && window.InvictusVerdicts) {
            const meta = window.InvictusVerdicts.meta(verdict.v);
            signalItem.textContent = meta.sym;
            const prefix = data.signalScope === "market" ? "Broad-market backdrop (SPY): " : "";
            signalIntItem.textContent = prefix + meta.tag + " — " + meta.note;
            parent.classList.add(meta.cls);
        } else {
            signalItem.textContent = "—";
            signalIntItem.textContent = "Cycle bias unavailable for this date.";
        }
    }

    // Chart banner reflects the CHART symbol's cycle bias for today (verdict model).
    function updateChartBanner() {
        if (!signalBanner) return;
        signalBanner.className = "signal-banner";
        const v = getVerdict(chartSymbol, todayStr());
        if (!v || !window.InvictusVerdicts) {
            signalBanner.classList.add("banner-none");
            signalBanner.textContent = "Cycle bias loading…";
            return;
        }
        const meta = window.InvictusVerdicts.meta(v.v);
        signalBanner.classList.add(meta.cls);
        signalBanner.innerHTML = "<span>" + meta.sym + "</span> " + chartSymbol + " CYCLE BIAS &mdash; " + meta.tag;
    }

    function computeNumerologyAlignment(symbol) {
        if (!currentCalculations || !currentCalculations.ud) return false;
        const sym = String(symbol || "").toUpperCase();
        if (!foundationCache[sym]) return false;
        try {
            const numerology = window.InvictusNumerology;
            if (!numerology) return false;
            const targetDate = new Date((datePicker.value || new Date().toISOString().split("T")[0]) + "T00:00:00Z");
            const inst = numerology.getInstrumentReading(sym, targetDate, foundationCache[sym]);
            return currentCalculations.ud.reduced === inst.foundation.reduced;
        } catch (e) {
            return false;
        }
    }

    async function fetchAndRenderNumerology(date, symbol, foundationDate) {
        try {
            const numerology = window.InvictusNumerology;
            const targetDate = new Date(date + "T00:00:00Z");
            const daily = numerology.getDailyReading(targetDate);
            const hasFoundation = !!foundationDate;
            const instrument = numerology.getInstrumentReading(symbol, targetDate, foundationDate);
            const ud = daily.universal.day;
            const symCycle = instrument.cycle.day;
            const inst = instrument.foundation;
            const universalEnergy = getEnergySpec(ud.reduced);
            const symbolEnergy = hasFoundation ? getEnergySpec(symCycle.reduced) : { spec: "Foundation date unavailable", tags: ["no data"] };
            const alignment = hasFoundation && (ud.reduced === inst.reduced || symCycle.reduced === inst.reduced);
            const foundationValue = hasFoundation ? inst.compound : "—";
            const foundationReduced = hasFoundation ? inst.reduced : "—";
            const foundationDisplay = hasFoundation ? inst.display : "—";
            const cycleValue = hasFoundation ? symCycle.compound : "—";
            const cycleReduced = hasFoundation ? symCycle.reduced : "—";
            const cycleDisplay = hasFoundation ? symCycle.display : "—";
            // Cycle Bias is calibrated per index (SPY/QQQ/DIA). For any other
            // ticker we fall back to the broad-market (SPY) read for that date so
            // the card always carries a real, date-varying bias instead of a dead
            // placeholder — clearly labelled as the market backdrop, not a
            // symbol-specific stat.
            let signal = getVerdict(symbol, date);
            let signalScope = "symbol";
            if (!signal) {
                const backdrop = getVerdict("SPY", date);
                if (backdrop) { signal = backdrop; signalScope = "market"; }
            }
            currentCalculations = {
                ud: { value: ud.compound, reduced: ud.reduced, display: ud.display, universalYear: daily.universal.year.display, universalMonth: daily.universal.month.display, interpretation: universalEnergy.spec },
                symbolCycle: { value: cycleValue, reduced: cycleReduced, display: cycleDisplay, interpretation: symbolEnergy.spec },
                symbolFoundation: { symbol, value: foundationValue, reduced: foundationReduced, date: hasFoundation ? foundationDate : "Listing date unavailable" },
                compatibility: {
                    universal: hasFoundation ? `${symbol} listing ${foundationDisplay} vs Universal Day ${ud.display} — ${ud.reduced === inst.reduced ? "aligned" : "not aligned"}` : `No listing date on file for ${symbol}.`,
                    cycle: hasFoundation ? `${symbol} listing ${foundationDisplay} vs ${symbol} cycle day ${cycleDisplay} — ${symCycle.reduced === inst.reduced ? "aligned" : "not aligned"}` : `Cycle alignment needs a listing date.`
                },
                universalEnergy, symbolEnergy,
                guardrail: { type: alignment ? "aligned" : "neutral", message: !hasFoundation ? `No listing date on file for ${symbol}; lean on price/VWAP.` : (alignment ? `${symbol} is numerologically aligned today. Still require chart confirmation.` : `${symbol} has no direct cycle alignment today. Let price/VWAP confirm.`), marketBias: alignment ? "heightened attention" : "neutral/planning" },
                signal, signalScope
            };
            renderNumerologyDashboard(currentCalculations);
            updateChartBanner();
        } catch (error) {
            console.error("Numerology calculation failed:", error);
            numerologyContainer.innerHTML = `<div class="numerology-unavailable"><div class="card-title">Numerology</div><div class="unavailable-label">Cycle calculation unavailable</div></div>`;
        }
    }

    // ── Market index cards ──
    function updateMarketCard(priceEl, changeEl, quote) {
        if (!priceEl || !changeEl) return;
        if (!quote || quote._source === "unavailable") {
            priceEl.textContent = "—";
            changeEl.textContent = "Offline";
            changeEl.className = "change offline";
            return;
        }
        priceEl.textContent = fmt(quote.price);
        const chg = quote.change;
        const sign = chg > 0 ? "+" : "";
        changeEl.textContent = sign + fmt(chg) + " (" + sign + fmt(quote.changePercent) + "%)";
        changeEl.className = "change " + (chg >= 0 ? "positive" : "negative");
    }

    // ── Breakdown (derived from a single live quote) ──
    function renderBreakdown(quote) {
        if (!quote || quote._source === "unavailable") {
            bdSymbol.textContent = chartSymbol || "—";
            bdLast.textContent = "—";
            bdChange.textContent = "—";
            bdChange.className = "";
            bdRange.textContent = "—";
            bdHilo.textContent = "—";
            bdPrevClose.textContent = "—";
            if (chartSource) chartSource.textContent = "Live quote unavailable";
            return;
        }
        const chg = quote.change;
        const sign = chg > 0 ? "+" : "";
        bdSymbol.textContent = quote.symbol;
        bdLast.textContent = "$" + fmt(quote.price);
        bdChange.textContent = sign + fmt(chg) + " (" + sign + fmt(quote.changePercent) + "%)";
        bdChange.className = chg >= 0 ? "positive" : "negative";
        bdRange.textContent = "$" + fmt(quote.high - quote.low);
        bdHilo.textContent = "$" + fmt(quote.high) + " / $" + fmt(quote.low);
        bdPrevClose.textContent = "$" + fmt(quote.prevClose);
        if (chartSource) chartSource.textContent = quote.symbol + " • live quote • " + new Date(quote.timestamp).toLocaleTimeString();
    }

    // ── Watchlist ──
    async function fetchWatchlist() {
        const quotes = await Promise.all(WATCHLIST_SYMBOLS.map(s => fetchQuote(s)));
        watchlistData = quotes.map(q => ({
            symbol: q.symbol,
            quote: q._source === "unavailable" ? { price: "--", change: 0, changePercent: 0 } : { price: q.price, change: q.change, changePercent: q.changePercent },
            _source: q._source
        }));
        renderWatchlist();
    }

    function renderWatchlist() {
        if (!watchlistItems) return;
        if (!watchlistData || !watchlistData.length) {
            watchlistItems.innerHTML = '<div class="watchlist-loading">No data</div>';
            return;
        }
        watchlistItems.innerHTML = "";
        watchlistData.forEach(item => {
            const sym = String(item.symbol || "").toUpperCase();
            const unavailable = item._source === "unavailable";
            const q = item.quote || {};
            const price = unavailable ? "--" : (Number.isFinite(Number(q.price)) ? Number(q.price).toFixed(2) : "--");
            const change = unavailable ? 0 : (Number.isFinite(Number(q.change)) ? Number(q.change) : 0);
            const changePct = unavailable ? 0 : (Number.isFinite(Number(q.changePercent)) ? Number(q.changePercent) : 0);
            const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
            const pctStr = changePct >= 0 ? `+${changePct.toFixed(2)}%` : `${changePct.toFixed(2)}%`;
            const aligned = computeNumerologyAlignment(sym);

            const card = document.createElement("div");
            card.className = `watchlist-card${chartSymbol === sym ? " active" : ""}${unavailable ? " unavailable" : ""}`;
            card.innerHTML = `
                <span class="wl-symbol">${sym}</span>
                <span class="wl-right">
                    <span class="wl-price">${unavailable ? "--" : "$" + price}</span>
                    <span class="wl-change ${unavailable ? "offline" : (change >= 0 ? "positive" : "negative")}">${unavailable ? "Offline" : changeStr + " (" + pctStr + ")"}</span>
                </span>
                <span class="wl-num-dot ${aligned ? "aligned" : "not-aligned"}" title="${aligned ? "Numerologically aligned" : "Not aligned"}"></span>
            `;
            card.addEventListener("click", () => {
                if (sym !== chartSymbol) {
                    selectSymbol(sym);
                }
            });
            watchlistItems.appendChild(card);
        });
    }

    // ── Watchlist toggle ──
    if (watchlistToggle && watchlistPanel) {
        let watchlistCollapsed = false;
        try {
            const saved = localStorage.getItem("invictus-edge-watchlist-collapsed");
            if (saved === "true") watchlistCollapsed = true;
        } catch (e) { /* ignore */ }
        if (watchlistCollapsed) {
            watchlistPanel.classList.add("collapsed");
            watchlistToggle.innerHTML = "&raquo;";
        }
        watchlistToggle.addEventListener("click", () => {
            watchlistCollapsed = !watchlistCollapsed;
            watchlistPanel.classList.toggle("collapsed", watchlistCollapsed);
            watchlistToggle.innerHTML = watchlistCollapsed ? "&raquo;" : "&laquo;";
            try {
                localStorage.setItem("invictus-edge-watchlist-collapsed", String(watchlistCollapsed));
            } catch (e) { /* ignore */ }
        });
    }

    // ── TradingView embed ──
    function toTradingViewSymbol(symbol) {
        const clean = String(symbol || "SPY").toUpperCase().trim();
        if (clean.includes(":")) return clean;
        if (clean === "SPY" || clean === "QQQ" || clean === "DIA") return `BATS:${clean}`;
        return `NASDAQ:${clean}`;
    }

    function tradingViewEmbedUrl(symbol) {
        const cfg = getInterval();
        const isMobile = (typeof window !== "undefined" && window.innerWidth <= 768);
        // The legacy widgetembed honors query-param flags (e.g. hidesidetoolbar),
        // NOT the JSON-hash equivalents — so the chart is configured via query string.
        const studies = isMobile ? ["STD;VWAP", "STD;EMA"] : ["STD;Volume", "STD;VWAP", "STD;EMA"];
        const params = {
            frameElementId: "tradingview-advanced-chart",
            symbol: toTradingViewSymbol(symbol),
            interval: cfg.tv,
            hidesidetoolbar: isMobile ? "1" : "0",
            hidetoptoolbar: "0",
            hide_side_toolbar: isMobile ? "1" : "0",
            hide_legend: isMobile ? "1" : "0",
            symboledit: "1",
            saveimage: isMobile ? "0" : "1",
            details: isMobile ? "0" : "1",
            hideideas: "1",
            theme: "dark",
            style: "1",
            timezone: "America/Chicago",
            withdateranges: isMobile ? "0" : "1",
            studies: JSON.stringify(studies),
            locale: "en"
        };
        const qs = Object.keys(params)
            .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
            .join("&");
        return `https://s.tradingview.com/widgetembed/?${qs}`;
    }

    function renderTradingViewWidget(symbol) {
        if (!tradingViewContainer) return;
        chartLoading.textContent = `Loading TradingView ${symbol}...`;
        chartLoading.style.display = "flex";
        tradingViewContainer.src = tradingViewEmbedUrl(symbol);
        tradingViewContainer.onload = () => setTimeout(() => { chartLoading.style.display = "none"; }, 900);
        tradingViewContainer.onerror = () => {
            console.warn("TradingView iframe load error for", symbol);
            chartLoading.textContent = "Chart widget unavailable";
        };
        setTimeout(() => {
            if (chartLoading.style.display !== "none") chartLoading.style.display = "none";
        }, 15000);
    }

    async function loadChart(symbol) {
        chartSymbol = symbol;
        chartTabs.forEach(btn => btn.classList.toggle("active", btn.dataset.chartSymbol === symbol));
        updateChartBanner();
        renderTradingViewWidget(symbol);
        const quote = await fetchQuote(symbol);
        renderBreakdown(quote);
        if (watchlistItems && watchlistData.length) {
            watchlistItems.querySelectorAll(".watchlist-card").forEach(card => {
                const symEl = card.querySelector(".wl-symbol");
                const sym = symEl ? symEl.textContent.trim() : "";
                card.classList.toggle("active", sym === symbol);
            });
        }
    }

    // ── Resolve a symbol's foundation date: curated table first, then the
    //    provider's listing date (cached). Never returns another symbol's date. ──
    async function resolveFoundationDate(sym) {
        if (foundationCache[sym]) return foundationCache[sym];
        try {
            const res = await fetch(DATA_PROVIDER.profile(sym));
            if (res.ok) {
                const profile = await res.json();
                const ipo = profile && profile.ipo;
                if (typeof ipo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ipo)) {
                    foundationCache[sym] = ipo;
                    return ipo;
                }
            }
        } catch (err) {
            console.warn("Foundation date lookup failed for " + sym + ":", err.message || err);
        }
        return null;
    }

    // ── Numerology refresh for the selected symbol ──
    async function refreshNumerology(symbol) {
        const sym = String(symbol).toUpperCase();
        const today = datePicker.value || new Date().toISOString().split("T")[0];
        const seq = ++numerologyReqSeq;
        const foundationDate = await resolveFoundationDate(sym);
        // A newer symbol/date request superseded this fetch — drop the stale render.
        if (seq !== numerologyReqSeq) return;
        fetchAndRenderNumerology(today, sym, foundationDate);
    }

    // ── Symbol search (Finnhub) ──
    async function handleSearchInput() {
        const query = symbolSearchInput.value.trim();
        symbolSearchResults.innerHTML = "";
        if (query.length < 2) { symbolSearchResults.style.display = "none"; return; }
        try {
            const res = await fetch(DATA_PROVIDER.search(query));
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            const results = (data && Array.isArray(data.result)) ? data.result.slice(0, 8) : [];
            if (!results.length) {
                const div = document.createElement("div");
                div.className = "search-result-item dim";
                div.textContent = "No results found";
                symbolSearchResults.appendChild(div);
            } else {
                results.forEach(item => {
                    const sym = (item.displaySymbol || item.symbol || "").toUpperCase();
                    if (!sym) return;
                    const div = document.createElement("div");
                    div.className = "search-result-item";
                    div.textContent = sym + (item.description ? " — " + item.description : "");
                    div.addEventListener("click", () => { selectSymbol(sym); symbolSearchResults.style.display = "none"; });
                    symbolSearchResults.appendChild(div);
                });
            }
        } catch (err) {
            const div = document.createElement("div");
            div.className = "search-result-item dim";
            div.textContent = "Search unavailable";
            symbolSearchResults.appendChild(div);
        }
        symbolSearchResults.style.display = "block";
    }

    // ── State persistence ──
    function saveState() {
        try {
            localStorage.setItem("invictus-edge-symbol", selectedSymbol);
            localStorage.setItem("invictus-edge-interval", chartInterval);
        } catch (e) {
            console.warn("localStorage write failed:", e);
        }
    }

    // ── Last updated badge ──
    function updateLastUpdated() {
        if (!lastUpdatedEl) return;
        const now = new Date();
        const ts = now.toLocaleTimeString("en-US", { hour12: false });
        const secondsSinceSuccess = (Date.now() - lastSuccessTime) / 1000;
        let badgeClass = "last-updated-badge";
        if (document.hidden) badgeClass += " paused";
        else if (secondsSinceSuccess > 75) badgeClass += " stale";
        else badgeClass += " fresh";
        lastUpdatedEl.textContent = `Last updated: ${ts}`;
        lastUpdatedEl.className = badgeClass;
    }

    // ── Live refresh (index cards + breakdown) ──
    async function refreshLive() {
        if (document.hidden || isPaused) return;
        try {
            const needed = INDEX_SYMBOLS.slice();
            if (!needed.includes(chartSymbol)) needed.push(chartSymbol);
            const quotes = {};
            await Promise.all(needed.map(async (s) => { quotes[s] = await fetchQuote(s); }));
            updateMarketCard(marketSPYPrice, marketSPYChange, quotes["SPY"]);
            updateMarketCard(marketQQQPrice, marketQQQChange, quotes["QQQ"]);
            updateMarketCard(marketDIAPrice, marketDIAChange, quotes["DIA"]);
            if (quotes[chartSymbol]) renderBreakdown(quotes[chartSymbol]);
            const anyLive = Object.keys(quotes).some(k => quotes[k] && quotes[k]._source !== "unavailable");
            if (anyLive) {
                lastSuccessTime = Date.now();
                refreshFailCount = 0;
                if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
            }
            updateLastUpdated();
        } catch (e) {
            console.warn("Live refresh failed:", e);
            refreshFailCount++;
            if (lastUpdatedEl) lastUpdatedEl.className = "last-updated-badge stale";
            if (refreshFailCount < 3) {
                if (retryTimer) clearTimeout(retryTimer);
                retryTimer = setTimeout(refreshLive, 5000);
            }
        }
    }

    async function refreshWatchlistData() {
        if (document.hidden || isPaused) return;
        try { await fetchWatchlist(); } catch (e) { console.warn("Watchlist refresh failed:", e); }
    }

    // ── Symbol selection ──
    function selectSymbol(symbol) {
        selectedSymbol = symbol;
        currentSymbolDisplay.textContent = symbol;
        symbolSearchInput.value = "";
        symbolSearchResults.innerHTML = "";
        symbolSearchResults.style.display = "none";
        let optionExists = false;
        for (let i = 0; i < symbolSelect.options.length; i++) {
            if (symbolSelect.options[i].value === symbol) { symbolSelect.value = symbol; optionExists = true; break; }
        }
        if (!optionExists && symbol !== "SPY" && symbol !== "QQQ") {
            const newOption = document.createElement("option");
            newOption.value = symbol;
            newOption.textContent = symbol;
            symbolSelect.insertBefore(newOption, symbolSelect.options[symbolSelect.options.length - 1]);
        }
        symbolSelect.value = symbol;
        saveState();
        refreshNumerology(symbol);
        loadChart(symbol);
    }

    // ── Event listeners ──
    symbolSearchInput.addEventListener("input", handleSearchInput);
    symbolSearchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            const firstResult = symbolSearchResults.querySelector(".search-result-item:not(.dim)");
            if (firstResult) firstResult.click();
            else if (symbolSearchInput.value) selectSymbol(symbolSearchInput.value.toUpperCase());
            event.preventDefault();
        }
    });
    document.addEventListener("click", (event) => {
        if (!symbolSearchInput.contains(event.target) && !symbolSearchResults.contains(event.target)) symbolSearchResults.style.display = "none";
    });
    symbolSelect.addEventListener("change", (event) => {
        const symbol = event.target.value;
        if (symbol === "Custom") {
            symbolSearchInput.focus();
            symbolSearchInput.placeholder = "Enter custom symbol (e.g., AAPL)";
            symbolSelect.value = selectedSymbol;
        } else selectSymbol(symbol);
    });
    chartTabs.forEach(btn => btn.addEventListener("click", () => selectSymbol(btn.dataset.chartSymbol)));

    document.querySelectorAll(".timeframe-btn").forEach(btn => btn.addEventListener("click", () => {
        const interval = btn.dataset.chartInterval;
        chartInterval = interval;
        document.querySelectorAll(".timeframe-btn").forEach(b => b.classList.toggle("active", b.dataset.chartInterval === interval));
        saveState();
        renderTradingViewWidget(chartSymbol);
    }));

    datePicker.addEventListener("change", (event) => {
        refreshNumerology(selectedSymbol);
        if (watchlistData.length) renderWatchlist();
        void event;
    });

    document.addEventListener("visibilitychange", () => {
        isPaused = document.hidden;
        updateLastUpdated();
        if (!isPaused) {
            refreshLive();
            refreshWatchlistData();
        }
    });

    // Re-render the chart only when crossing the mobile/desktop breakpoint
    // (avoids reloading on mobile URL-bar scroll jitter).
    let wasMobileChart = window.innerWidth <= 768;
    let chartResizeTimer = null;
    window.addEventListener("resize", () => {
        const nowMobile = window.innerWidth <= 768;
        if (nowMobile === wasMobileChart) return;
        wasMobileChart = nowMobile;
        clearTimeout(chartResizeTimer);
        chartResizeTimer = setTimeout(() => renderTradingViewWidget(chartSymbol), 400);
    });

    // Verdicts load asynchronously (calendar.js) — refresh banner + bias card once ready.
    document.addEventListener("invictus-verdicts-ready", () => {
        updateChartBanner();
        refreshNumerology(selectedSymbol);
    });

    // ── Init ──
    datePicker.value = new Date().toISOString().split("T")[0];
    selectSymbol(selectedSymbol);
    refreshLive();
    refreshWatchlistData();
    updateLastUpdated();

    liveTimer = setInterval(refreshLive, 30 * 1000);
    watchlistRefreshTimer = setInterval(refreshWatchlistData, 45 * 1000);
});
