// ── Invictus Edge · Cycle Calendar ───────────────────────────────────────────
// Renders a month grid of precomputed daily cycle-bias verdicts (mechanism-free:
// the page only ever sees {ud, pd, v} from data/calendar-verdicts.json). Owns the
// shared verdict store on window.InvictusVerdicts so app.js can drive the chart
// banner and Cycle Bias card from the same source. Day-click jumps the dashboard
// date picker to that date.
(function () {
  "use strict";

  var SYMBOLS = ["SPY", "QQQ", "DIA"];
  var SYMBOL_META = { SPY: "S&P 500", QQQ: "Nasdaq 100", DIA: "Dow 30" };
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    var root = document.getElementById("cycle-calendar");
    if (!root) return;

    var now = new Date();
    var state = { sym: "SPY", y: now.getFullYear(), m: now.getMonth() };
    // bounds follow the precompute window (set after data loads)
    var bounds = { minY: 2025, minM: 0, maxY: 2027, maxM: 11 };

    root.innerHTML =
      '<div class="cal-shell">' +
        '<div class="cal-toolbar">' +
          '<div class="cal-symbols" id="cal-symbols"></div>' +
          '<div class="cal-nav">' +
            '<button class="cal-navbtn" id="cal-prev" title="Previous month" aria-label="Previous month">‹</button>' +
            '<div class="cal-month" id="cal-month">—</div>' +
            '<button class="cal-navbtn" id="cal-next" title="Next month" aria-label="Next month">›</button>' +
            '<button class="cal-today" id="cal-today" title="Jump to today">Today</button>' +
          '</div>' +
        '</div>' +
        '<div class="cal-strip" id="cal-strip"></div>' +
        '<div class="cal-grid-head">' + WEEKDAYS.map(function (w) { return '<div class="cal-dow">' + w + '</div>'; }).join("") + '</div>' +
        '<div class="cal-grid" id="cal-grid"><div class="cal-loading">Loading cycle calendar…</div></div>' +
        '<div class="cal-legend" id="cal-legend"></div>' +
        '<div class="cal-foot">' +
          '<span class="cal-foot-note">Cycle bias is relative to each instrument’s own baseline drift · research context only, never a standalone signal.</span>' +
          '<a class="cal-launch" href="https://tedphyo.github.io/Esoteric-Trading/" target="_blank" rel="noopener">Open the full workbench →</a>' +
        '</div>' +
      '</div>';

    var symbolsEl = document.getElementById("cal-symbols");
    var monthEl = document.getElementById("cal-month");
    var gridEl = document.getElementById("cal-grid");
    var stripEl = document.getElementById("cal-strip");
    var legendEl = document.getElementById("cal-legend");
    var prevBtn = document.getElementById("cal-prev");
    var nextBtn = document.getElementById("cal-next");
    var todayBtn = document.getElementById("cal-today");

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

    prevBtn.addEventListener("click", function () { step(-1); });
    nextBtn.addEventListener("click", function () { step(1); });
    todayBtn.addEventListener("click", function () {
      var t = new Date();
      state.y = t.getFullYear(); state.m = t.getMonth();
      render();
    });

    fetch("data/calendar-verdicts.json")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        store.data = j;
        if (j.range && j.range.start && j.range.end) {
          var s = j.range.start.split("-"), e = j.range.end.split("-");
          bounds = { minY: +s[0], minM: +s[1] - 1, maxY: +e[0], maxM: +e[1] - 1 };
        }
        render();
        document.dispatchEvent(new CustomEvent("invictus-verdicts-ready"));
      })
      .catch(function (err) {
        gridEl.innerHTML = '<div class="cal-error">Cycle calendar unavailable right now.</div>';
        console.warn("Cycle verdicts failed to load:", err && err.message ? err.message : err);
      });

    function atMin() { return state.y < bounds.minY || (state.y === bounds.minY && state.m <= bounds.minM); }
    function atMax() { return state.y > bounds.maxY || (state.y === bounds.maxY && state.m >= bounds.maxM); }

    function step(dir) {
      var m = state.m + dir, y = state.y;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      if (y < bounds.minY || (y === bounds.minY && m < bounds.minM)) return;
      if (y > bounds.maxY || (y === bounds.maxY && m > bounds.maxM)) return;
      state.y = y; state.m = m; render();
    }

    function render() {
      monthEl.textContent = MONTHS[state.m] + " " + state.y;
      prevBtn.disabled = atMin();
      nextBtn.disabled = atMax();
      renderStrip();
      renderGrid();
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

    function renderGrid() {
      if (!store.data) return;
      var first = new Date(Date.UTC(state.y, state.m, 1));
      var startDow = first.getUTCDay();
      var daysInMonth = new Date(Date.UTC(state.y, state.m + 1, 0)).getUTCDate();
      var t = new Date();
      var todayKey = keyOf(t.getFullYear(), t.getMonth(), t.getDate());
      var picker = document.getElementById("date-picker");
      var selectedKey = picker && picker.value ? picker.value : null;

      var cells = "";
      for (var i = 0; i < startDow; i++) cells += '<div class="cal-cell cal-blank"></div>';
      for (var d = 1; d <= daysInMonth; d++) {
        var key = keyOf(state.y, state.m, d);
        var dow = new Date(Date.UTC(state.y, state.m, d)).getUTCDay();
        var weekend = dow === 0 || dow === 6;
        var v = store.get(state.sym, key);
        var classes = ["cal-cell"];
        if (weekend) classes.push("cal-weekend");
        if (key === todayKey) classes.push("cal-today-cell");
        if (key === selectedKey) classes.push("cal-selected");
        var badge = "";
        if (v && !weekend) {
          var meta = store.meta(v.v);
          classes.push(meta.cls);
          badge = '<span class="cal-badge ' + meta.cls + '"><span class="cal-badge-sym">' + meta.sym + '</span><span class="cal-badge-tag">' + meta.tag + "</span></span>";
        }
        var cyc = v ? '<span class="cal-cyc">UD' + v.ud + "</span>" : "";
        cells +=
          '<button class="' + classes.join(" ") + '" data-key="' + key + '"' + (weekend ? ' tabindex="-1"' : "") + '>' +
            '<span class="cal-daynum">' + d + "</span>" +
            cyc +
            badge +
          "</button>";
      }
      gridEl.innerHTML = cells;

      gridEl.querySelectorAll(".cal-cell[data-key]").forEach(function (cell) {
        if (cell.classList.contains("cal-weekend")) return;
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
