<script lang="ts">
	import { resolve } from '$app/paths';
	import TurntableCard from '#lib/components/TurntableCard.svelte';
	import { outbox } from '#lib/offline/outbox.svelte.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Dashboard · Stylus Tracker</title>
</svelte:head>

<header class="flex items-end justify-between gap-3">
	<h1 class="font-display text-[2.125rem] leading-none font-semibold tracking-tight text-cream-50">
		Dashboard
	</h1>
	{#if data.rows.length > 0}
		<a href={resolve('/turntables/new')} class="btn btn-secondary px-3.5">
			<svg
				viewBox="0 0 16 16"
				class="size-3.5"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				aria-hidden="true"
			>
				<path d="M8 3v10M3 8h10" stroke-linecap="round" />
			</svg>
			Add<span class="sr-only"> a turntable</span>
		</a>
	{/if}
</header>

{#each data.rows as row (row.turntable.id)}
	<TurntableCard
		{...row}
		pending={row.stylus ? outbox.pendingFor(row.stylus.id) : []}
		unreachable={outbox.unreachable}
		today={data.today}
		playError={form && row.stylus?.id === form.stylusId ? form.error : undefined}
	/>
{:else}
	<section class="flex flex-col items-center gap-6 card px-6 py-12 text-center">
		<div
			class="grid size-44 place-items-center rounded-full bg-vinyl [background-image:var(--vinyl-grooves)] shadow-[0_20px_40px_-12px_rgb(0_0_0/0.9)] motion-safe:animate-spin-slow"
			aria-hidden="true"
		>
			<div class="grid size-16 place-items-center rounded-full bg-amber-glow">
				<div class="size-2 rounded-full bg-vinyl"></div>
			</div>
		</div>
		<div class="flex flex-col gap-1.5">
			<p class="font-display text-xl text-cream-50">No turntables yet.</p>
			<p class="font-mono text-xs text-cream-300">
				Add one to see how many records its stylus has left.
			</p>
		</div>
		<a href={resolve('/turntables/new')} class="btn px-6 btn-primary">Add a turntable</a>
	</section>
{/each}
