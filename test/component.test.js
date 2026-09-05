import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'svelte/compiler';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'src', 'RiskBadge.svelte');
const source = fs.readFileSync(file, 'utf8');

/* ═══════════════════════════════════════════════════════════════════════════
   The component ships as source, so the consumer's compiler is the build
   ───────────────────────────────────────────────────────────────────────────
   That is the normal shape for a Svelte library and it is why this package
   needs no build step — but it moves the failure. A component that does not
   compile fails in the MERCHANT's build, with our file name in their error.
   So compiling it is part of our tests, not theirs.
   ═══════════════════════════════════════════════════════════════════════════ */

test('the badge compiles cleanly', () => {
  const { warnings } = compile(source, { filename: 'RiskBadge.svelte', generate: 'client' });

  const real = warnings.filter((w) => w.code !== 'options_deprecated_accessors');
  assert.deepEqual(
    real.map((w) => `${w.code}: ${w.message}`),
    [],
    'a warning here becomes noise in every merchant build that installs this',
  );
});

test('it compiles for the server too', () => {
  /* SvelteKit renders this on the server first. A component that only works
     in the browser shows up as a hydration mismatch, not as an error. */
  const { js } = compile(source, { filename: 'RiskBadge.svelte', generate: 'server' });
  assert.ok(js.code.length > 0);
});

test('it renders the right words, server-side', async () => {
  /* Compile to a real module and run it, rather than trusting that a clean
     compile means correct output. The rule being checked is the one the
     shared package exists for: a blacklisted number must never render as its
     band, or a Svelte storefront contradicts the control panel. */
  const { render } = await import('svelte/server');
  const Badge = await loadComponent();

  const blacklisted = render(Badge, {
    props: { check: { isBlacklisted: true, isRated: true, riskLevel: 'MEDIUM' } },
  });
  assert.match(blacklisted.body, /Blacklisted/);
  assert.doesNotMatch(blacklisted.body, /Medium/);

  const unrated = render(Badge, {
    props: { check: { isRated: false, riskLevel: 'LOW', riskScore: 12 } },
  });
  assert.match(unrated.body, /No history/);
  assert.doesNotMatch(unrated.body, /Low risk/);

  const loading = render(Badge, { props: { check: null, loading: true } });
  assert.match(loading.body, /Checking/);

  const nothing = render(Badge, { props: { check: null } });
  assert.doesNotMatch(nothing.body, /risk|history|Checking/i);
});

test('a failed lookup says the check did not run', async () => {
  /* There was no error prop and no error state behind it, so a 403, a 503
     QUOTA_EXCEEDED and a dead network rendered exactly what an empty field
     renders: nothing. The operator could not tell "this number has no
     history" from "we never got to ask", and only one of those needs a
     human. */
  const { render } = await import('svelte/server');
  const Badge = await loadComponent();

  const failed = render(Badge, { props: { check: null, error: new Error('QUOTA_EXCEEDED') } });
  assert.match(failed.body, /Check unavailable/);
  assert.doesNotMatch(failed.body, /risk|No history|Blacklisted/i, 'it must not read as a verdict');
});

test('the badge is announced when it appears', async () => {
  /* It appears and changes on its own while the operator is typing somewhere
     else; without a live region a screen-reader user never hears the verdict. */
  const { render } = await import('svelte/server');
  const Badge = await loadComponent();

  for (const props of [
    { check: { isRated: true, riskLevel: 'HIGH' } },
    { check: null, loading: true },
    { check: null, error: new Error('boom') },
  ]) {
    const html = render(Badge, { props }).body;
    assert.match(html, /role="status"/, `${Object.keys(props)} is not announced`);
  }

  /* No aria-label: the words are already inside, and naming it twice reads
     it twice. */
  const plain = render(Badge, { props: { check: { isRated: true, riskLevel: 'HIGH' } } }).body;
  assert.doesNotMatch(plain, /aria-label/);
});

/** Compile the .svelte source to a module and import it from memory. */
async function loadComponent() {
  const { js } = compile(source, {
    filename: 'RiskBadge.svelte',
    generate: 'server',
    /* The compiled output imports 'svelte/internal/server' and our own
       package by name; a data: URL cannot resolve either, so it is written
       beside the source where node's resolver finds both. */
  });
  const out = path.join(here, '.compiled-RiskBadge.js');
  fs.writeFileSync(out, js.code);
  try {
    return (await import(`file://${out.replace(/\\/g, '/')}?t=${Date.now()}`)).default;
  } finally {
    fs.rmSync(out, { force: true });
  }
}
