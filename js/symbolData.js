// Symbol data for Invictus Edge numerology
// Includes founding dates and IPO/listing dates as fallback
// Sources checked: Wikipedia, corporate investor relations, NASDAQ, NYSE archives

"use strict";

window.InvictusSymbolData = {
  // Provided by Ted
  SPY: {
    label: "SPY",
    type: "ETF",
    founded: { month: 1, day: 22, year: 1993, source: "Inception" }
  },
  QQQ: {
    label: "QQQ",
    type: "ETF",
    founded: { month: 3, day: 10, year: 1999, source: "Inception" }
  },

  // Added by Chronos
  NVDA: {
    label: "NVDA",
    type: "Equity",
    founded: { month: 4, day: 5, year: 1993, source: "Founding Date" }, // Source: NVIDIA corporate history
    ipo: { month: 1, day: 22, year: 1999, source: "IPO Date" } // Source: NASDAQ
  },
  AAPL: {
    label: "AAPL",
    type: "Equity",
    founded: { month: 4, day: 1, year: 1976, source: "Founding Date" }, // Source: Apple corporate history
    ipo: { month: 12, day: 12, year: 1980, source: "IPO Date" } // Source: NASDAQ
  },
  TSLA: {
    label: "TSLA",
    type: "Equity",
    founded: { month: 7, day: 1, year: 2003, source: "Founding Date" }, // Source: Tesla corporate history
    ipo: { month: 6, day: 29, year: 2010, source: "IPO Date" } // Source: NASDAQ
  },
  MSFT: {
    label: "MSFT",
    type: "Equity",
    founded: { month: 4, day: 4, year: 1975, source: "Founding Date" }, // Source: Microsoft corporate history
    ipo: { month: 3, day: 13, year: 1986, source: "IPO Date" } // Source: NASDAQ
  },
  // Add more symbols here
};
