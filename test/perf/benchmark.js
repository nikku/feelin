/**
 * Performance benchmark harness for the FEEL interpreter.
 *
 * Usage:
 *
 *   npm run build && node test/perf/benchmark.js [--json]
 *
 * Measures parse-heavy, evaluation-heavy and builtin-heavy scenarios.
 * Prints ops/sec and ms/op per scenario. Use to validate optimizations
 * against the recorded baseline.
 */
import { performance } from 'node:perf_hooks';

import { evaluate, unaryTest, compileExpression } from '../../dist/index.js';

const JSON_OUTPUT = process.argv.includes('--json');

// ---------- helpers ----------

function bench(name, fn, { iterations = 1000, warmup = 100 } = {}) {

  // warmup (JIT)
  for (let i = 0; i < warmup; i++) {
    fn(i);
  }

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    fn(i);
  }

  const elapsed = performance.now() - start;

  return {
    name,
    iterations,
    totalMs: round(elapsed),
    msPerOp: round(elapsed / iterations),
    opsPerSec: Math.round(iterations / (elapsed / 1000))
  };
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

function bigList(n) {
  return Array.from({ length: n }, (_, i) => i + 1);
}

function wideContext(n) {
  return Object.fromEntries(
    Array.from({ length: n }, (_, i) => [ `variable ${i}`, i ])
  );
}

// ---------- scenarios ----------

const results = [];

function scenario(name, fn, opts) {
  results.push(bench(name, fn, opts));
}

// --- parsing-dominated: many DISTINCT expressions, no repetition ---

const distinctExpressions = Array.from(
  { length: 200 },
  (_, i) => `a${i} + b${i} * 2 - foo(bar${i}, "baz ${i}")`
);

scenario('parse: distinct expressions', (i) => {
  const expr = distinctExpressions[i % distinctExpressions.length];
  evaluate(expr, {});
}, { iterations: 2000, warmup: 200 });

// --- repeated evaluation: SAME expression, varying context ---
// (typical DMN workload; benefits from parse caching)

scenario('eval: same expression, varying context', (i) => {
  evaluate('if age >= 18 then "adult" else "minor"', { age: i % 100 });
}, { iterations: 5000, warmup: 500 });

scenario('eval: arithmetic expression', (i) => {
  evaluate('a + b * 2 - c / 4', { a: i, b: i * 2, c: i * 3 });
}, { iterations: 5000, warmup: 500 });

// --- compiled artifact: parse + build once, evaluate many ---

const compiledArithmetic = compileExpression('a + b * 2 - c / 4');

scenario('eval: compiled arithmetic expression', (i) => {
  compiledArithmetic.evaluate({ a: i, b: i * 2, c: i * 3 });
}, { iterations: 5000, warmup: 500 });

const compiledConditional = compileExpression('if age >= 18 then "adult" else "minor"');

scenario('eval: compiled conditional, varying context', (i) => {
  compiledConditional.evaluate({ age: i % 100 });
}, { iterations: 5000, warmup: 500 });

const compiledTemporal = compileExpression('date and time("2024-03-15T10:30:00@Europe/Paris") + duration("P1Y2M")');

scenario('eval: compiled date/time literal', () => {
  compiledTemporal.evaluate({});
}, { iterations: 3000, warmup: 300 });

// --- context lookup ---

const wide = wideContext(100);

scenario('eval: variable lookup in wide context (100 entries, spaced keys)', () => {
  evaluate('variable 99 + variable 50 + variable 0', wide);
}, { iterations: 5000, warmup: 500 });

// --- builtins ---

const list1k = bigList(1000);

scenario('builtin: sum(1k list)', () => {
  evaluate('sum(list)', { list: list1k });
}, { iterations: 2000, warmup: 200 });

scenario('builtin: distinct values(1k list, 50% dupes)', () => {
  evaluate('distinct values(list)', { list: list1k.map(i => i % 500) });
}, { iterations: 200, warmup: 20 });

scenario('builtin: union(2 x 500)', () => {
  evaluate('union(a, b)', { a: bigList(500), b: bigList(500).map(i => i + 250) });
}, { iterations: 200, warmup: 20 });

scenario('builtin: concatenate(10 x 100)', () => {
  evaluate(
    'concatenate(a0,a1,a2,a3,a4,a5,a6,a7,a8,a9)',
    Object.fromEntries(Array.from({ length: 10 }, (_, i) => [ `a${i}`, bigList(100) ]))
  );
}, { iterations: 500, warmup: 50 });

scenario('builtin: flatten(10 x 10 nested)', () => {
  evaluate('flatten(list)', {
    list: Array.from({ length: 10 }, () => bigList(10))
  });
}, { iterations: 2000, warmup: 200 });

scenario('builtin: sort(1k list)', () => {
  evaluate('sort(list, function(x, y) x < y)', {
    list: bigList(1000).map(i => (i * 7919) % 1000)
  });
}, { iterations: 200, warmup: 20 });

// --- temporal ---

scenario('eval: date/time parsing', () => {
  evaluate('date and time("2024-03-15T10:30:00@Europe/Paris") + duration("P1Y2M")', {});
}, { iterations: 3000, warmup: 300 });

// --- for expression over wide context ---

const forCtx = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [ `v${i}`, i ]));

forCtx.list = bigList(1000);

scenario('eval: for x in 1k list, 50-wide context', () => {
  evaluate('for x in list return x * 2', forCtx);
}, { iterations: 500, warmup: 50 });

// --- unary tests ---

scenario('unaryTest: range + list of tests', (i) => {
  unaryTest('[1..10], > 100, "foo"', { '?': i % 200 });
}, { iterations: 5000, warmup: 500 });

// ---------- report ----------

if (JSON_OUTPUT) {
  console.log(JSON.stringify({
    node: process.version,
    date: new Date().toISOString(),
    results
  }, null, 2));
} else {
  console.log(`node ${process.version} — ${new Date().toISOString()}\n`);
  console.log(
    'scenario'.padEnd(58),
    'iters'.padStart(7),
    'total ms'.padStart(10),
    'ms/op'.padStart(9),
    'ops/s'.padStart(10)
  );
  console.log('-'.repeat(96));

  for (const r of results) {
    console.log(
      r.name.padEnd(58),
      String(r.iterations).padStart(7),
      String(r.totalMs).padStart(10),
      String(r.msPerOp).padStart(9),
      String(r.opsPerSec).padStart(10)
    );
  }
}
