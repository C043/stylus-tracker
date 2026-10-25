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
	<link rel="icon" type="image/png" href="/icons/favicon-32.png" />
</svelte:head>

<!-- Bottom padding reserves the floating dock (64px + its 12px gap) plus the home-indicator inset. -->
<main
	class="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]"
>
	<!-- Brand plate: a tiny record and the name, engraved like a cabinet badge. -->
	<div class="flex items-center gap-2 pt-1" aria-hidden="true">
		<span
			class="grid size-5 place-items-center rounded-full bg-vinyl [background-image:var(--vinyl-grooves)]"
		>
			<span class="size-2 rounded-full bg-amber-glow"></span>
		</span>
		<span class="eyebrow">Stylus Tracker</span>
	</div>

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
