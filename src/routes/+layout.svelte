<script lang="ts">
	import './layout.css';

	import { page } from '$app/state';
	import BottomNav from '#lib/components/BottomNav.svelte';
	import { outbox } from '#lib/offline/outbox.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Send plays logged offline from whichever page is open.
	$effect(() => outbox.start());
</script>

<svelte:head>
	<link rel="icon" href="/icons/icon.svg" />
</svelte:head>

<!-- Bottom padding reserves the nav's height (56px + border) plus the home-indicator inset. -->
<main
	class="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
>
	{#if outbox.rejection}
		<div role="alert" class="flex items-center gap-3 card px-4 py-3">
			<p class="flex-1 font-mono text-xs text-cream-50">
				<span aria-hidden="true" class="text-vu-soon">▲</span>
				A play logged offline wasn't saved: {outbox.rejection}
			</p>
			<button class="btn btn-secondary px-3.5" onclick={outbox.dismissRejection}>Dismiss</button>
		</div>
	{/if}

	{@render children()}
</main>

<BottomNav pathname={page.url.pathname} />
