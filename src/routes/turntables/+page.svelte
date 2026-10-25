<script lang="ts">
	import { resolve } from '$app/paths';
	import TurntableCard from '#lib/components/TurntableCard.svelte';
	import { outbox } from '#lib/offline/outbox.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Turntables · Stylus Tracker</title>
</svelte:head>

<div class="flex items-center justify-between gap-3">
	<h1 class="font-display text-3xl font-semibold text-cream-50">Turntables</h1>
	<a
		href={resolve('/turntables/new')}
		class="inline-flex min-h-11 items-center rounded-full bg-amber-glow px-4 font-mono text-sm font-semibold text-walnut-950"
	>
		Add a turntable
	</a>
</div>

{#each data.rows as row (row.turntable.id)}
	<TurntableCard
		{...row}
		pending={row.stylus ? outbox.pendingFor(row.stylus.id) : []}
		unreachable={outbox.unreachable}
		today={data.today}
		variant="compact"
	/>
{:else}
	<section class="rounded-2xl recessed px-6 py-8 text-center">
		<p class="text-cream-300">No turntables yet. Add the first one above.</p>
	</section>
{/each}
