import { readable, writable, get } from 'svelte/store';
import { createCheckController, IDLE } from '@numra/browser';

/* ═══════════════════════════════════════════════════════════════════════════
   @numra/svelte — the browser half, Svelte-shaped
   ───────────────────────────────────────────────────────────────────────────
   No apiKey option, and no way to add one: this package talks to YOUR
   backend, the endpoint one of the server packages mounts.

   Debounce, abort and stale-answer rejection live in @numra/browser's
   controller, shared with React and Vue — see there for why a late answer is
   dropped by identity rather than by catching AbortError.

   A classic store rather than runes, deliberately. Runes would tie this file
   to Svelte 5 and to the compiler; a store is plain JavaScript that works in
   Svelte 4 and 5 alike, needs no build step, and can be tested in Node
   without a DOM.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * A lookup you drive from your own input binding.
 *
 *     const check = createNumraCheck();
 *     $: check.set(phone);
 *     <RiskBadge check={$check.data} loading={$check.isLoading} />
 *
 * @param {{ endpoint?: string, debounceMs?: number }} [options]
 */
export function createNumraCheck(options = {}) {
  const store = writable({ ...IDLE, isLoading: false });

  const controller = createCheckController({
    endpoint: options.endpoint,
    debounceMs: options.debounceMs,
    fetch: options.fetch,
    onState: (s) => store.set({ ...s, isLoading: s.status === 'loading' }),
  });

  return {
    subscribe: store.subscribe,

    /** Call whenever the number or the enabled flag changes. */
    set(phone, enabled = true) {
      controller.set(phone, enabled);
    },

    /** An explicit re-run, for a "check again" button. */
    refetch: () => controller.refetch(),

    /**
     * Call from onDestroy. A component that goes away must not leave a timer
     * holding its state, nor a request nobody will read.
     */
    destroy: () => controller.dispose(),

    /** The current value, for code outside a reactive statement. */
    current: () => get(store),
  };
}

/** A read-only view, for passing down without handing over `set`. */
export function readonlyCheck(check) {
  return readable(check.current(), (set) => check.subscribe(set));
}
