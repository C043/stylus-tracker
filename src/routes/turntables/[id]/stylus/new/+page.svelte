<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import StylusFields from '#lib/components/StylusFields.svelte';
	import { addDays, toLocalDate } from '#lib/domain/dates.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// The server renders with its own date; switch to the phone's local date once hydrated.
	// The default install date follows, so it's never the phone's tomorrow. Until then (or
	// without JS) allow one day past the server's date, in case the phone is ahead of it.
	let today = $derived(data.serverToday);
	let hydrated = $state(false);
	onMount(() => {
		today = toLocalDate(new Date());
		hydrated = true;
	});
	let values = $derived(form?.values ?? { ...data.defaults, installedOn: today });
</script>

<svelte:head>
	<title>Add stylus · Stylus Tracker</title>
</svelte:head>

<header class="flex flex-col gap-2">
	<p class="eyebrow text-amber-glow">Step 2 of 2 · Stylus</p>
	<h1 class="font-display text-[2.125rem] leading-none font-semibold tracking-tight text-cream-50">
		{data.turntable.name}
	</h1>
	<p class="font-mono text-xs text-cream-300">{data.modelName}</p>
</header>

<form method="POST" use:enhance class="flex flex-col gap-5 card p-4">
	{#if form?.errors.form}
		<p role="alert" class="rounded-xl bg-oxblood/90 px-3.5 py-2.5 text-sm text-cream-50">
			{form.errors.form}
		</p>
	{/if}
	<StylusFields
		{values}
		errors={form?.errors}
		{today}
		latestInstalledOn={hydrated ? today : addDays(data.serverToday, 1)}
	/>
	<button class="btn min-h-12 text-base btn-primary"> Save stylus </button>
</form>
