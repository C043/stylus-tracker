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

<header class="flex items-end justify-between gap-3">
	<h1 class="font-display text-[2.125rem] leading-none font-semibold tracking-tight text-cream-50">
		Turntables
	</h1>
	<a href={resolve('/turntables/new')} class="btn px-3.5 btn-primary">
		<svg
			viewBox="0 0 16 16"
			class="size-3.5"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
		>
			<path d="M8 3v10M3 8h10" stroke-linecap="round" />
		</svg>
		Add<span class="sr-only"> a turntable</span>
	</a>
</header>

{#each data.rows as row (row.turntable.id)}
	<TurntableCard
		{...row}
		pending={row.stylus ? outbox.pendingFor(row.stylus.id) : []}
		unreachable={outbox.unreachable}
		today={data.today}
		variant="compact"
	/>
{:else}
	<section class="card px-6 py-10 text-center">
		<p class="text-cream-300">No turntables yet. Add the first one above.</p>
	</section>
{/each}
