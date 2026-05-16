/* ────────────────────────────────────────────── */
/*  Invictus Edge — Signals. Cycles. Conviction. */
/*  Numerological Timing Engine                  */
/*  Ted House Method                            */
/* ────────────────────────────────────────────── */

"use strict";

/* ==============================================
   CONSTANTS
   ============================================== */

var TED_BIRTH = { month: 5, day: 1, year: 1999 };
var MASTERS = { 11: true, 22: true, 33: true };

/* ==============================================
   CORE UTILITIES
   ============================================== */

function reduceNumber(n) {
  "use strict";
  // Master numbers ONLY preserved if n itself is 11, 22, or 33
  // Intermediates that pass through 11/22/33 continue to single digit
  n = Number(n);
  if (MASTERS[n]) { return n; }
  while (n > 9) {
    n = String(n).split("").reduce(function (s, d) { return s + parseInt(d, 10); }, 0);
  }
  return n;
}

function formatCompoundReduced(compound) {
  "use strict";
  var reduced = reduceNumber(compound);
  return compound + "/" + reduced;
}

function digitSum(n) {
  "use strict";
  return String(Math.abs(n)).split("").reduce(function (s, d) { return s + parseInt(d, 10); }, 0);
}

function splitDigitsIgnoreZeros(dateStr) {
  "use strict";
  var digits = [];
  var chars = dateStr.split("");
  for (var i = 0; i < chars.length; i++) {
    var c = chars[i];
    if (c >= "1" && c <= "9") {
      digits.push(parseInt(c, 10));
    }
  }
  return digits;
}

function makeCycleResult(compound) {
  "use strict";
  return {
    compound: compound,
    reduced: reduceNumber(compound),
    display: formatCompoundReduced(compound)
  };
}

function padTwo(n) {
  "use strict";
  return n < 10 ? "0" + n : "" + n;
}

function toDateStr(date) {
  "use strict";
  return date.getUTCFullYear() + "-" + padTwo(date.getUTCMonth() + 1) + "-" + padTwo(date.getUTCDate());
}

/* ==============================================
   UNIVERSAL CYCLES
   ============================================== */

function calcUY(year) {
  "use strict";
  return makeCycleResult(digitSum(year));
}

function calcUM(year, month) {
  "use strict";
  var uy = calcUY(year);
  return makeCycleResult(month + uy.reduced);
}

function calcUD(year, month, day) {
  "use strict";
  var dateStr = year + "-" + padTwo(month) + "-" + padTwo(day);
  var digits = splitDigitsIgnoreZeros(dateStr);
  var sum = 0;
  for (var i = 0; i < digits.length; i++) {
    sum += digits[i];
  }
  return makeCycleResult(sum);
}

/* ==============================================
   PERSONAL CYCLES (Ted House Method)
   ============================================== */

function calcPY(year, birthMonth, birthDay) {
  "use strict";
  birthMonth = birthMonth || TED_BIRTH.month;
  birthDay = birthDay || TED_BIRTH.day;
  return makeCycleResult(birthMonth + birthDay + digitSum(year));
}

function calcPM(pyCompound, currentMonth) {
  "use strict";
  return makeCycleResult(pyCompound + currentMonth);
}

function calcPD(pmCompound, currentDay) {
  "use strict";
  return makeCycleResult(pmCompound + currentDay);
}

/* ==============================================
   INSTRUMENT CYCLES
   ============================================== */

function getInstrumentFoundation(foundationDate) {
  "use strict";
  if (!foundationDate) { return makeCycleResult(0); }
  var parts = foundationDate.split("-");
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);
  var day = parseInt(parts[2], 10);
  var dateStr = year + "-" + padTwo(month) + "-" + padTwo(day);
  var digits = splitDigitsIgnoreZeros(dateStr);
  var sum = 0;
  for (var i = 0; i < digits.length; i++) {
    sum += digits[i];
  }
  return makeCycleResult(sum);
}

function getInstrumentPY(foundationDate, year) {
  "use strict";
  if (!foundationDate) { return makeCycleResult(0); }
  var parts = foundationDate.split("-");
  var month = parseInt(parts[1], 10);
  var day = parseInt(parts[2], 10);
  return makeCycleResult(month + day + digitSum(year));
}

function getInstrumentPM(foundationDate, year, month) {
  "use strict";
  var py = getInstrumentPY(foundationDate, year);
  return makeCycleResult(py.compound + month);
}

function getInstrumentPD(foundationDate, year, month, day) {
  "use strict";
  var pm = getInstrumentPM(foundationDate, year, month);
  return makeCycleResult(pm.compound + day);
}

/* ==============================================
   ALL-IN-ONE READINGS
   ============================================== */

function getDailyReading(date, birthMonth, birthDay) {
  "use strict";
  var year = date.getUTCFullYear();
  var month = date.getUTCMonth() + 1;
  var day = date.getUTCDate();

  var py = calcPY(year, birthMonth, birthDay);
  var pm = calcPM(py.compound, month);
  var pd = calcPD(pm.compound, day);

  return {
    date: toDateStr(date),
    universal: {
      year: calcUY(year),
      month: calcUM(year, month),
      day: calcUD(year, month, day)
    },
    personal: {
      year: py,
      month: pm,
      day: pd
    }
  };
}

function getInstrumentReading(symbol, date, foundationDate) {
  "use strict";
  var year = date.getUTCFullYear();
  var month = date.getUTCMonth() + 1;
  var day = date.getUTCDate();

  return {
    symbol: symbol,
    foundation: getInstrumentFoundation(foundationDate),
    personal: {
      year: getInstrumentPY(foundationDate, year),
      month: getInstrumentPM(foundationDate, year, month),
      day: getInstrumentPD(foundationDate, year, month, day)
    }
  };
}

function getMarketSnapshot(date, instrumentMetas) { // instrumentMetas is a map of {symbol: {ipoDate: "YYYY-MM-DD", ...}}
  "use strict";
  var reading = getDailyReading(date);
  var spyMeta = instrumentMetas.SPY || { ipoDate: "1993-01-22" }; // Fallback to hardcoded if not provided
  var qqqMeta = instrumentMetas.QQQ || { ipoDate: "1999-03-10" }; // Fallback to hardcoded if not provided

  var spy = getInstrumentReading("SPY", date, spyMeta.ipoDate);
  var qqq = getInstrumentReading("QQQ", date, qqqMeta.ipoDate);

  // Build compatibility line
  var compat = "";
  var td = reading.personal.day.reduced;
  var sd = spy.personal.day.reduced;
  var qd = qqq.personal.day.reduced;
  if (td === sd && td === qd) {
    compat = "Triple alignment — " + reading.personal.day.display + " across Ted, SPY, QQQ";
  } else if (td === sd) {
    compat = "Ted & SPY aligned at " + td + " — broad market confirmation";
  } else if (td === qd) {
    compat = "Ted & QQQ aligned at " + td + " — tech momentum play";
  } else {
    compat = "Ted " + reading.personal.day.display + " | SPY " + spy.personal.day.display + " | QQQ " + qqq.personal.day.display;
  }

  return {
    date: reading.date,
    universal: reading.universal,
    trader: reading.personal,
    instruments: {
      SPY: spy,
      QQQ: qqq
    },
    compatibility: compat
  };
}

/* ==============================================
   EXPOSE
   ============================================== */

window.InvictusNumerology = {
  // Core
  reduceNumber: reduceNumber,
  formatCompoundReduced: formatCompoundReduced,
  digitSum: digitSum,
  splitDigitsIgnoreZeros: splitDigitsIgnoreZeros,
  makeCycleResult: makeCycleResult,

  // Universal
  calcUY: calcUY,
  calcUM: calcUM,
  calcUD: calcUD,

  // Personal
  calcPY: calcPY,
  calcPM: calcPM,
  calcPD: calcPD,

  // Instrument
  getInstrumentFoundation: getInstrumentFoundation,
  getInstrumentPY: getInstrumentPY,
  getInstrumentPM: getInstrumentPM,
  getInstrumentPD: getInstrumentPD,
  getInstrumentReading: getInstrumentReading,

  // All-in-One
  getDailyReading: getDailyReading,
  getMarketSnapshot: getMarketSnapshot,

  // Constants (for tests)
  TED_BIRTH_MONTH: TED_BIRTH.month,
  TED_BIRTH_DAY: TED_BIRTH.day,
};
