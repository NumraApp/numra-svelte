# @numra/svelte

**A debounced phone-check store and a risk badge for Svelte, talking to your own backend.**

[![npm version](https://img.shields.io/npm/v/@numra/svelte)](https://www.npmjs.com/package/@numra/svelte) [![npm downloads](https://img.shields.io/npm/dm/@numra/svelte)](https://www.npmjs.com/package/@numra/svelte) [![licence: MIT](https://img.shields.io/npm/l/@numra/svelte)](LICENSE)

The browser half, Svelte-shaped. Calls **your** backend — it never holds a
Numra API key and cannot be made to.

```bash
npm install @numra/svelte
```

Works on Svelte 4 and 5. The store is a classic store rather than runes, so
it needs no compiler and ties you to neither version.

## You need the other half first

This package talks to an endpoint you mount yourself, with one of:
`@numra/express`, `@numra/fastify`, `@numra/next`, `@numra/nuxt`,
`numra/laravel`, or `Numra\Handlers` in plain PHP. That endpoint holds the key.

Numra reads a shared fraud ledger, so a key in a bundle is a key in everyone's
hands. There is no `apiKey` option here, and a test fails the build if one ever
appears.

## Use it

```svelte
<script>
  import { onDestroy } from 'svelte';
  import { createNumraCheck, RiskBadge } from '@numra/svelte';

  let phone = '';
  const check = createNumraCheck();

  $: check.set(phone);
  onDestroy(() => check.destroy());
</script>

<input bind:value={phone} inputmode="tel" />
<RiskBadge check={$check.data} loading={$check.isLoading} showScore />
```

`$: check.set(phone)` runs on every keystroke — that is fine, the store
debounces. `onDestroy` is not optional: without it a timer outlives the
component.

## What it does that a plain fetch would not

- **Debounces.** Every lookup is billable, and a reactive statement fires on
  every character.
- **Aborts the superseded request** rather than ignoring it.
- **Drops a late answer by identity**, not by catching `AbortError`. An abort
  landing while `res.json()` is still running does not always throw, and the
  operator would be shown the verdict for a number they already changed.
- **Clears the verdict when the field is cleared.**

All of that lives in `@numra/browser`, shared with the React, Vue and Angular
packages, so the four cannot drift apart.

## Reading the result

`riskScore` alone **cannot** tell a checked-and-clean customer from a complete
stranger — both come back low. On a cash-on-delivery store most buyers are
new, so `RiskBadge` renders an unrated number as **“No history”**, never “Low
risk”, and a blacklisted number as **“Blacklisted”** even when its band says
something milder.

## Passing it down

```js
import { readonlyCheck } from '@numra/svelte';
export const view = readonlyCheck(check);   // no set, no refetch
```

Handing a child component the full store hands it the ability to spend your
quota.

## Errors

`$check.error` is a `NumraRequestError` carrying the code your own endpoint
returned: `NUMRA_NOT_CONFIGURED`, `FORBIDDEN`, `QUOTA_EXCEEDED`,
`UPSTREAM_UNAVAILABLE`. Branch on `.code`, not on the message.

## SvelteKit

The component ships as `.svelte` source and your bundler compiles it, which is
why this package has no build step. The `svelte` export condition is what
points SvelteKit at the source — without it, esbuild is handed a template and
fails. It renders on the server too; there is a test for that.

## Release notes

Every release is tagged and written up on the
[Releases page](https://github.com/NumraApp/numra-svelte/releases). The same
history in one file is in [CHANGELOG.md](CHANGELOG.md).

## Contributing

Bug reports and patches are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers
running the tests, the regression test a change is expected to bring with it,
and which repository a given fix actually belongs in.

## Security

Vulnerabilities go privately to the address in [SECURITY.md](SECURITY.md).
**Do not open a public issue for a security problem** — a public report is a
working exploit for every merchant running the released version until a fix
ships.

## The rest of the family

Twelve packages, one contract. The server side holds the API key; the browser
side calls the endpoint the server side mounts.

Server:

| Package | Repository |
|---|---|
| `@numra/core` | [numra-js-core](https://github.com/NumraApp/numra-js-core) |
| `@numra/express` | [numra-express](https://github.com/NumraApp/numra-express) |
| `@numra/fastify` | [numra-fastify](https://github.com/NumraApp/numra-fastify) |
| `@numra/next` | [numra-next](https://github.com/NumraApp/numra-next) |
| `@numra/nuxt` | [numra-nuxt](https://github.com/NumraApp/numra-nuxt) |
| `numra/numra-php` | [numra-php](https://github.com/NumraApp/numra-php) |
| `numra/laravel` | [numra-laravel](https://github.com/NumraApp/numra-laravel) |

Browser:

| Package | Repository |
|---|---|
| `@numra/browser` | [numra-browser](https://github.com/NumraApp/numra-browser) |
| `@numra/react` | [numra-react](https://github.com/NumraApp/numra-react) |
| `@numra/vue` | [numra-vue](https://github.com/NumraApp/numra-vue) |
| `@numra/svelte` | [numra-svelte](https://github.com/NumraApp/numra-svelte) — this repo |
| `@numra/angular` | [numra-angular](https://github.com/NumraApp/numra-angular) |

Documentation for all of them is at [numra.ma/docs](https://numra.ma/docs).

## Licence

MIT
