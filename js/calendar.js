// ── Invictus Edge · Cycle Calendar ───────────────────────────────────────────
// Renders THIS WEEK's weekday (Mon–Fri) cycle-bias forecast from precomputed
// verdicts (mechanism-free: the page only ever sees {ud, pd, v} from
// data/calendar-verdicts.json). Owns the shared verdict store on
// window.InvictusVerdicts so app.js can drive the chart banner and Cycle Bias
// card from the same source. Day-click jumps the dashboard date picker to that date.
(function () {
  "use strict";

  var SYMBOLS = ["SPY", "QQQ", "DIA"];
  var SYMBOL_META = { SPY: "S&P 500", QQQ: "Nasdaq 100", DIA: "Dow 30" };
  var MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYNAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  // Shared verdict metadata — used by both calendar badges and the chart banner.
  var VERDICT_META = {
    "STRONG RALLY": { cls: "v-srally", tag: "STRONG RALLY", sym: "▲▲", note: "Cycle runs hot — strongest historical up-lean for this instrument." },
    "RALLY":        { cls: "v-rally",  tag: "RALLY",        sym: "▲",       note: "Mild up-lean versus this instrument's normal day." },
    "NEUTRAL":      { cls: "v-neutral",tag: "NEUTRAL",      sym: "•",       note: "No meaningful cycle edge — a coin-flip day." },
    "BEAR":         { cls: "v-bear",   tag: "BEAR",         sym: "▼",       note: "Mild down-lean versus this instrument's normal day." },
    "STRONG BEAR":  { cls: "v-sbear",  tag: "STRONG BEAR",  sym: "▼▼", note: "Cycle runs cold — strongest historical down-lean." },
    "VOLATILE":     { cls: "v-vol",    tag: "VOLATILE",     sym: "◆",       note: "Master-number cycle (11/22) — expect sharp two-way moves." }
  };

  var store = {
    data: null,
    get: function (sym, key) {
      if (!this.data || !this.data.verdicts || !this.data.verdicts[sym]) return null;
      return this.data.verdicts[sym][key] || null;
    },
    meta: function (v) { return VERDICT_META[v] || VERDICT_META.NEUTRAL; }
  };
  window.InvictusVerdicts = store;

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function keyOf(y, m0, d) { return y + "-" + pad(m0 + 1) + "-" + pad(d); }

  // The five weekday Date objects (Mon–Fri) for the relevant trading week.
  // On a weekday → this week's Mon–Fri. On Sat/Sun → next week's Mon–Fri
  // (the week's trading is done, so we forecast ahead).
  function weekdays() {
    var t = new Date();
    var day = t.getDay(); // 0 Sun .. 6 Sat
    var monday = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    if (day === 0) monday.setDate(monday.getDate() + 1);        // Sun → tomorrow
    else if (day === 6) monday.setDate(monday.getDate() + 2);   // Sat → +2
    else monday.setDate(monday.getDate() - (day - 1));          // Mon–Fri → this Monday
    var out = [];
    for (var i = 0; i < 5; i++) {
      var d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      out.push(d);
    }
    return out;
  }

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    var root = document.getElementById("cycle-calendar");
    if (!root) return;

    var state = { sym: "SPY" };

    root.innerHTML =
      '<div class="cal-shell">' +
        '<div class="cal-toolbar">' +
          '<div class="cal-symbols" id="cal-symbols"></div>' +
          '<div class="cal-weeklabel" id="cal-weeklabel">—</div>' +
        '</div>' +
        '<div class="cal-strip" id="cal-strip"></div>' +
        '<div class="cal-grid cal-grid-week" id="cal-grid"><div class="cal-loading">Loading cycle calendar…</div></div>' +
        '<div class="cal-legend" id="cal-legend"></div>' +
        '<div class="cal-foot">' +
          '<span class="cal-foot-note">This week’s cycle-bias forecast · relative to each instrument’s own baseline drift · research context only, never a standalone signal.</span>' +
        '</div>' +
      '</div>';

    var symbolsEl = document.getElementById("cal-symbols");
    var weekLabelEl = document.getElementById("cal-weeklabel");
    var gridEl = document.getElementById("cal-grid");
    var stripEl = document.getElementById("cal-strip");
    var legendEl = document.getElementById("cal-legend");

    // symbol pills
    symbolsEl.innerHTML = SYMBOLS.map(function (s) {
      return '<button class="cal-pill' + (s === state.sym ? " active" : "") + '" data-sym="' + s + '">' + s +
        '<span class="cal-pill-sub">' + SYMBOL_META[s] + '</span></button>';
    }).join("");
    symbolsEl.querySelectorAll(".cal-pill").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.sym = btn.getAttribute("data-sym");
        symbolsEl.querySelectorAll(".cal-pill").forEach(function (b) { b.classList.toggle("active", b === btn); });
        render();
      });
    });

    // legend
    legendEl.innerHTML = ["STRONG RALLY", "RALLY", "NEUTRAL", "BEAR", "STRONG BEAR", "VOLATILE"].map(function (v) {
      var m = VERDICT_META[v];
      return '<span class="cal-legend-item"><span class="cal-dot ' + m.cls + '"></span>' + m.tag + "</span>";
    }).join("");

    fetch("data/calendar-verdicts.json")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        store.data = j;
        render();
        document.dispatchEvent(new CustomEvent("invictus-verdicts-ready"));
      })
      .catch(function (err) {
        gridEl.innerHTML = '<div class="cal-error">Cycle calendar unavailable right now.</div>';
        console.warn("Cycle verdicts failed to load:", err && err.message ? err.message : err);
      });

    function render() {
      renderLabel();
      renderStrip();
      renderWeek();
    }

    function renderLabel() {
      var days = weekdays();
      var a = days[0], b = days[4];
      var t = new Date();
      var isThisWeek = (t.getDay() >= 1 && t.getDay() <= 5);
      var span = MONTHS_SHORT[a.getMonth()] + " " + a.getDate() + " – " +
        (a.getMonth() === b.getMonth() ? b.getDate() : MONTHS_SHORT[b.getMonth()] + " " + b.getDate());
      weekLabelEl.innerHTML = '<span class="cal-weeklabel-tag">' + (isThisWeek ? "This Week" : "Next Week") +
        '</span><span class="cal-weeklabel-span">' + span + "</span>";
    }

    function renderStrip() {
      var t = new Date();
      var todayKey = keyOf(t.getFullYear(), t.getMonth(), t.getDate());
      var v = store.get(state.sym, todayKey);
      if (!v) { stripEl.innerHTML = ""; return; }
      var meta = store.meta(v.v);
      stripEl.innerHTML =
        '<div class="cal-strip-inner ' + meta.cls + '">' +
          '<span class="cal-strip-sym">' + meta.sym + "</span>" +
          '<span class="cal-strip-main"><strong>' + state.sym + " today</strong> · " + meta.tag + "</span>" +
          '<span class="cal-strip-cyc">UD ' + v.ud + " · PD " + v.pd + "</span>" +
        "</div>";
    }

    function renderWeek() {
      if (!store.data) return;
      var days = weekdays();
      var t = new Date();
      var todayKey = keyOf(t.getFullYear(), t.getMonth(), t.getDate());
      var picker = document.getElementById("date-picker");
      var selectedKey = picker && picker.value ? picker.value : null;

      var cells = days.map(function (d, idx) {
        var key = keyOf(d.getFullYear(), d.getMonth(), d.getDate());
        var v = store.get(state.sym, key);
        var classes = ["cal-cell"];
        if (key === todayKey) classes.push("cal-today-cell");
        if (key === selectedKey) classes.push("cal-selected");
        var badge = "";
        if (v) {
          var meta = store.meta(v.v);
          classes.push(meta.cls);
          badge = '<span class="cal-badge ' + meta.cls + '"><span class="cal-badge-sym">' + meta.sym + '</span><span class="cal-badge-tag">' + meta.tag + "</span></span>";
        }
        var cyc = v ? '<span class="cal-cyc">UD' + v.ud + "</span>" : '<span class="cal-cyc">—</span>';
        return '<button class="' + classes.join(" ") + '" data-key="' + key + '">' +
            '<span class="cal-dayname">' + DAYNAMES[idx] + "</span>" +
            '<span class="cal-daynum">' + MONTHS_SHORT[d.getMonth()] + " " + d.getDate() + "</span>" +
            cyc +
            badge +
          "</button>";
      }).join("");
      gridEl.innerHTML = cells;

      gridEl.querySelectorAll(".cal-cell[data-key]").forEach(function (cell) {
        cell.addEventListener("click", function () {
          var k = cell.getAttribute("data-key");
          var dp = document.getElementById("date-picker");
          if (dp) {
            dp.value = k;
            dp.dispatchEvent(new Event("change", { bubbles: true }));
          }
          gridEl.querySelectorAll(".cal-selected").forEach(function (c) { c.classList.remove("cal-selected"); });
          cell.classList.add("cal-selected");
          var dash = document.getElementById("calculator");
          if (dash && dash.scrollIntoView) dash.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }
  }
})();
