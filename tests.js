"use strict";

const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("js/numerology.js", "utf8"), sandbox);

const n = sandbox.window.InvictusNumerology;
assert(n, "InvictusNumerology should be exposed on window");

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("preserves direct master numbers", () => {
  assert.strictEqual(n.reduceNumber(11), 11);
  assert.strictEqual(n.reduceNumber(22), 22);
  assert.strictEqual(n.reduceNumber(33), 33);
});

test("reduces ordinary compounds", () => {
  assert.strictEqual(n.reduceNumber(34), 7);
  assert.strictEqual(n.reduceNumber(46), 1);
  assert.strictEqual(n.formatCompoundReduced(34), "34/7");
});

test("daily reading exposes only universal cycles (no personal leak)", () => {
  const reading = n.getDailyReading(new Date("2026-05-31T00:00:00Z"));
  assert.strictEqual(reading.personal, undefined);
  assert(reading.universal, "universal block should exist");
  assert(reading.universal.year && reading.universal.month && reading.universal.day);
});

test("calculates universal day from date digits", () => {
  const reading = n.getDailyReading(new Date("2026-06-02T00:00:00Z"));
  assert.strictEqual(reading.universal.day.display, "18/9");
});

test("calculates SPY foundation score", () => {
  const spy = n.getInstrumentReading("SPY", new Date("2026-06-02T00:00:00Z"), "1993-01-22");
  assert.strictEqual(spy.foundation.display, "27/9");
});

test("calculates QQQ foundation score", () => {
  const qqq = n.getInstrumentReading("QQQ", new Date("2026-06-02T00:00:00Z"), "1999-03-10");
  assert.strictEqual(qqq.foundation.display, "32/5");
});

console.log("All Invictus Edge sanity checks passed.");
