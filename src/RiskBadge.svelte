<script>
  import { badgeParts, styleString } from '@numra/browser';

  /* A presentational badge. No fetching, no key, no opinion about your
     layout. The label, the colours and the geometry come from
     @numra/browser, shared with the React and Vue packages — see there for
     why blacklisted outranks the band and why unrated has its own words.

     `export let` rather than $props(), so this compiles on Svelte 4 and 5
     alike. The package declares svelte >=4 and has to mean it. */

  export let check = null;
  export let loading = false;
  /** The store's `error`. Given one, the badge says the check did not run. */
  export let error = null;
  export let showScore = false;
  /** Merged over the container. The base geometry survives. */
  export let style = {};

  $: parts = badgeParts(check, { loading, error, showScore, style });
</script>

{#if parts}
  <!-- role="status" because the badge appears and changes on its own while
       the operator is typing somewhere else; without a live region a
       screen-reader user never hears the verdict. No aria-label: the label is
       the text inside, and naming it twice reads it twice. -->
  <span role="status" style={styleString(parts.container)}>
    <span aria-hidden="true" style={styleString(parts.dot)}></span>
    {parts.label}
    {#if parts.score !== null}
      <span style={styleString(parts.scoreStyle)}>{parts.score}</span>
    {/if}
  </span>
{/if}
