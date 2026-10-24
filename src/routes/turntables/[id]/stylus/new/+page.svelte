<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import StylusFields from '#lib/components/StylusFields.svelte';
	import { toLocalDate } from '#lib/domain/dates.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// The server renders with its own date; switch to the phone's local date once hydrated.
	let today = $derived(data.serverToday);
	onMount(() => {
		today = toLocalDate(new Date());
	});
</script>

<svelte:head>
	<title>Add stylus · Stylus Tracker</title>
</svelte:head>

<header>
	<p class="font-mono text-xs tracking-wide text-cream-300 uppercase">Step 2 of 2 · Stylus</p>
	<h1 class="font-display text-3xl font-semibold text-cream-50">{data.turntable.name}</h1>
	<p class="font-mono text-xs text-cream-300">{data.modelName}</p>
</header>

<form method="POST" use:enhance class="flex flex-col gap-5 rounded-2xl recessed p-4">
	{#if form?.errors.form}
		<p role="alert" class="rounded-lg bg-oxblood px-3 py-2 text-sm text-cream-50">
			{form.errors.form}
		</p>
	{/if}
	<StylusFields values={form?.values ?? data.defaults} errors={form?.errors} {today} />
	<button
		class="min-h-12 rounded-full bg-amber-glow font-mono font-semibold text-walnut-950 shadow-[0_2px_0_var(--color-walnut-950)] active:translate-y-px"
	>
		Save stylus
	</button>
</form>
