import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNumraCheck, readonlyCheck } from '../src/numraCheck.js';

const tick = (ms) => new Promise((r) => setTimeout(r, ms));
const RATED = { isRated: true, riskLevel: 'HIGH', riskScore: 72 };
const ok = (body) => ({ ok: true, status: 200, json: async () => body });

function fakeFetch(plan) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, phone: JSON.parse(init.body).phone });
    return plan(calls.length, init);
  };
  f.calls = calls;
  return f;
}

/** Subscribe and record, the way a `$check` reference in a template does. */
function watch(store) {
  const seen = [];
  const off = store.subscribe((v) => seen.push(v));
  return { seen, last: () => seen[seen.length - 1], off };
}

test('the store starts idle and never fires for an empty number', async () => {
  const f = fakeFetch(() => ok(RATED));
  const check = createNumraCheck({ debounceMs: 5, fetch: f });
  const w = watch(check);

  check.set('');
  await tick(30);

  assert.equal(w.last().status, 'idle');
  assert.equal(w.last().isLoading, false);
  assert.equal(f.calls.length, 0);

  w.off();
  check.destroy();
});

test('a reactive statement calling set on every keystroke still costs one lookup', async () => {
  /* `$: check.set(phone)` runs on every character. The debounce is what keeps
     that from being one billable lookup per keystroke. */
  const f = fakeFetch(() => ok(RATED));
  const check = createNumraCheck({ debounceMs: 20, fetch: f });
  const w = watch(check);

  for (const v of ['0', '06', '060', '0600000000']) check.set(v);
  await tick(60);

  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].phone, '0600000000');
  assert.equal(w.last().status, 'success');
  assert.equal(w.last().data.riskLevel, 'HIGH');
  assert.equal(w.last().isLoading, false);

  w.off();
  check.destroy();
});

test('isLoading is true while in flight, so a template can say so', async () => {
  const f = fakeFetch(async () => { await tick(40); return ok(RATED); });
  const check = createNumraCheck({ debounceMs: 1, fetch: f });
  const w = watch(check);

  check.set('0600000000');
  await tick(20);
  assert.equal(w.last().isLoading, true);

  await tick(60);
  assert.equal(w.last().isLoading, false);

  w.off();
  check.destroy();
});

test('destroy cancels in flight work', async () => {
  let aborted = false;
  const f = fakeFetch(async (_n, init) => {
    init.signal.addEventListener('abort', () => { aborted = true; });
    await tick(60);
    return ok(RATED);
  });
  const check = createNumraCheck({ debounceMs: 1, fetch: f });
  const w = watch(check);

  check.set('0600000000');
  await tick(20);
  check.destroy();
  await tick(80);

  assert.equal(aborted, true);
  w.off();
});

test('the read-only view cannot start a lookup', async () => {
  /* Passing the store down a component tree should not hand every child the
     ability to spend the merchant's quota. */
  const f = fakeFetch(() => ok(RATED));
  const check = createNumraCheck({ debounceMs: 1, fetch: f });
  const view = readonlyCheck(check);

  assert.equal(typeof view.set, 'undefined');
  assert.equal(typeof view.refetch, 'undefined');

  const w = watch(view);
  check.set('0600000000');
  await tick(30);
  assert.equal(w.last().data.riskLevel, 'HIGH', 'it still receives updates');

  w.off();
  check.destroy();
});

test('current() reads the value outside a subscription', async () => {
  const f = fakeFetch(() => ok(RATED));
  const check = createNumraCheck({ debounceMs: 1, fetch: f });

  assert.equal(check.current().status, 'idle');
  check.set('0600000000');
  await tick(30);
  assert.equal(check.current().status, 'success');

  check.destroy();
});
