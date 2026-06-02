/* ────────────────────────────────────────────── */
/*  Invictus Edge — Signals. Cycles. Conviction. */
/*  Numerological Timing Engine                  */
/*  Cycle Timing Method                         */
/* ────────────────────────────────────────────── */

"use strict";

/* ==============================================
   CONSTANTS
   ============================================== */

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
   INSTRUMENT CYCLES (per-symbol, derived from the
   instrument's own foundation/listing date — never
   from any person's birth data)
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

function getDailyReading(date) {
  "use strict";
  var year = date.getUTCFullYear();
  var month = date.getUTCMonth() + 1;
  var day = date.getUTCDate();

  return {
    date: toDateStr(date),
    universal: {
      year: calcUY(year),
      month: calcUM(year, month),
      day: calcUD(year, month, day)
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
    cycle: {
      year: getInstrumentPY(foundationDate, year),
      month: getInstrumentPM(foundationDate, year, month),
      day: getInstrumentPD(foundationDate, year, month, day)
    }
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

  // Instrument (per-symbol cycles)
  getInstrumentFoundation: getInstrumentFoundation,
  getInstrumentPY: getInstrumentPY,
  getInstrumentPM: getInstrumentPM,
  getInstrumentPD: getInstrumentPD,
  getInstrumentReading: getInstrumentReading,

  // All-in-One
  getDailyReading: getDailyReading
};
