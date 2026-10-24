<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import StylusFields from '#lib/components/StylusFields.svelte';
	import { addDays, formatShortDate, toLocalDate } from '#lib/domain/dates.ts';
	import { STYLUS_PROFILES, type StylusProfileId } from '#lib/domain/stylus-profiles.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Same date handling as adding a stylus: the phone's local date once hydrated.
	let today = $derived(data.serverToday);
	let hydrated = $state(false);
	onMount(() => {
		today = toLocalDate(new Date());
		hydrated = true;
	});
	let values = $derived(form?.values ?? { ...data.defaults, installedOn: today });
	let previousLabel = $derived(
		[
			data.previous.cartridge,
			STYLUS_PROFILES[data.previous.profile as StylusProfileId]?.label ?? data.previous.profile
		]
			.filter(Boolean)
			.join(' · ')
	);
</script>

<svelte:head>
	<title>Replace stylus · Stylus Tracker</title>
</svelte:head>

<header>
	<p class="font-mono text-xs tracking-wide text-cream-300 uppercase">Replace stylus</p>
	<h1 class="font-display text-3xl font-semibold text-cream-50">{data.turntable.name}</h1>
	<p class="font-mono text-xs text-cream-300">{data.modelName}</p>
</header>

<p class="rounded-xl recessed px-4 py-3 text-sm text-cream-100">
	The current stylus ({previousLabel}, installed {formatShortDate(
		data.previous.installedOn,
		today
	)}) moves to History, retired today. Its plays stay with it.
</p>

<form method="POST" use:enhance class="flex flex-col gap-5 rounded-2xl recessed p-4">
	{#if form?.errors.form}
		<p role="alert" class="rounded-lg bg-oxblood px-3 py-2 text-sm text-cream-50">
			{form.errors.form}
		</p>
	{/if}
	<input type="hidden" name="replacing" value={data.previous.id} />
	<StylusFields
		{values}
		errors={form?.errors}
		{today}
		latestInstalledOn={hydrated ? today : addDays(data.serverToday, 1)}
	/>
	<button
		class="min-h-12 rounded-full bg-amber-glow font-mono font-semibold text-walnut-950 shadow-[0_2px_0_var(--color-walnut-950)] active:translate-y-px"
	>
		Replace stylus
	</button>
</form>
