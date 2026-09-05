import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(here, '..', 'src');

/* Comments are stripped before scanning. The files explain at length WHY they
   hold no credential, and a scanner that cannot tell an explanation from an
   implementation would force those explanations to be deleted. */
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const files = fs.readdirSync(srcDir).map((f) => ({
  f,
  s: stripComments(fs.readFileSync(path.join(srcDir, f), 'utf8')),
}));
const pkg = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));

/* Browser code must never hold a Numra credential and must never reach the
   Numra API. One careless "just add an apiKey so it works standalone" and
   every merchant who upgrades ships their fraud-database key to every
   visitor. If this fails, the fix is not to relax the test. */

test('no source file mentions an API key', () => {
  for (const { f, s } of files) {
    assert.ok(!/apiKey|api_key|API_KEY/.test(s), `${f} mentions an API key`);
    assert.ok(!/secret/i.test(s), `${f} mentions a secret`);
  }
});

test('no source file can reach the Numra API directly', () => {
  for (const { f, s } of files) {
    assert.ok(!/api\.numra\.ma/.test(s), `${f} targets the Numra API directly`);
    assert.ok(!/Authorization/i.test(s), `${f} sets an Authorization header`);
    assert.ok(!/\bfetch\s*\(/.test(s), `${f} makes its own request instead of using @numra/browser`);
  }
});

test('the package does not depend on @numra/core', () => {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!('@numra/core' in deps), '@numra/core must not be a dependency of a browser package');
});

test('the component is published as source, so a consumer can compile it', () => {
  /* Svelte libraries ship .svelte files and the app's bundler compiles them.
     Without the `svelte` export condition, SvelteKit resolves `default` and
     hands raw component source to esbuild, which fails on the template. */
  assert.equal(pkg.exports['.'].svelte, './src/index.js');
  assert.ok(pkg.files.includes('src'));
});
