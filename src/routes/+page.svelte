<script lang="ts">
	import { resolve } from '$app/paths';
	import TurntableCard from '#lib/components/TurntableCard.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Dashboard · Stylus Tracker</title>
</svelte:head>

<h1 class="font-display text-3xl font-semibold text-cream-50">Dashboard</h1>

{#each data.rows as row (row.turntable.id)}
	<TurntableCard
		{...row}
		today={data.today}
		playError={form && row.stylus?.id === form.stylusId ? form.error : undefined}
	/>
{:else}
	<section class="flex flex-col items-center gap-5 rounded-2xl recessed px-6 py-10 text-center">
		<div
			class="relative grid size-40 place-items-center rounded-full bg-vinyl shadow-2xl motion-safe:animate-[spin_1.8s_linear_infinite]"
			style="background-image: repeating-radial-gradient(circle, var(--color-vinyl) 0 3px, var(--color-groove) 3px 4px);"
			aria-hidden="true"
		>
			<div class="grid size-14 place-items-center rounded-full bg-amber-glow">
				<div class="size-1.5 rounded-full bg-vinyl"></div>
			</div>
		</div>
		<p class="text-lg text-cream-100">No turntables yet.</p>
		<a
			href={resolve('/turntables/new')}
			class="inline-flex min-h-11 items-center rounded-full bg-amber-glow px-5 font-mono text-sm font-semibold text-walnut-950"
		>
			Add a turntable
		</a>
	</section>
{/each}

{#if data.rows.length > 0}
	<a
		href={resolve('/turntables/new')}
		class="inline-flex min-h-11 items-center justify-center self-center rounded-full border border-alu-600 px-5 font-mono text-sm text-cream-100"
	>
		Add a turntable
	</a>
{/if}
