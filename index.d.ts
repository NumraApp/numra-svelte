import type { Readable } from 'svelte/store';
import type { BrowserCheck, NumraRequestError } from '@numra/browser';

export interface NumraCheckState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: BrowserCheck | null;
  error: NumraRequestError | null;
  isLoading: boolean;
}

export interface NumraCheckStore extends Readable<NumraCheckState> {
  /** Call whenever the number or the enabled flag changes. */
  set(phone: string | null, enabled?: boolean): void;
  /** Re-run now, skipping the debounce. */
  refetch(): Promise<BrowserCheck | null>;
  /** Call from onDestroy. */
  destroy(): void;
  current(): NumraCheckState;
}

/**
 * A lookup you drive from your own input binding.
 *
 * There is no apiKey option, by design: this package runs in a browser, and a
 * key in a bundle is a key in everyone's hands.
 */
export declare function createNumraCheck(options?: {
  endpoint?: string;
  debounceMs?: number;
}): NumraCheckStore;

/** A read-only view, for passing down without handing over `set`. */
export declare function readonlyCheck(check: NumraCheckStore): Readable<NumraCheckState>;

export declare const RiskBadge: import('svelte').ComponentType;

export { riskStateFor, RISK_STATES, NumraRequestError } from '@numra/browser';
export type { BrowserCheck, RiskState } from '@numra/browser';
