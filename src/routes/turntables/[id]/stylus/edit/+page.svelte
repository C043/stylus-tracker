<script lang="ts">
	import { enhance } from '$app/forms';
	import { computeBackfilledRecords, describeBackfill } from '#lib/domain/backfill.ts';
	import { calendarDaysBetween, formatShortDate, isLocalDate } from '#lib/domain/dates.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// The backfill counts up to the day the stylus was added, not today (AGENTS.md §3.4).
	let createdOn = $derived(data.stylus.createdOn);
	let picked = $state<string>();
	let installedOn = $derived(picked ?? form?.values.installedOn ?? data.stylus.installedOn);
	let estimate = $derived.by(() => {
		if (!isLocalDate(installedOn) || calendarDaysBetween(installedOn, createdOn) <= 0) {
			return 'No records estimated: only the plays you log count.';
		}
		const records = computeBackfilledRecords(installedOn, createdOn);
		return `${describeBackfill(records, installedOn, createdOn)} (one a day).`;
	});
	let error = $derived(form?.errors.installedOn);
</script>

<svelte:head>
	<title>Edit install date · Stylus Tracker</title>
</svelte:head>

<header>
	<p class="font-mono text-xs tracking-wide text-cream-300 uppercase">Edit install date</p>
	<h1 class="font-display text-3xl font-semibold text-cream-50">{data.turntable.name}</h1>
	<p class="font-mono text-xs text-cream-300">{data.modelName}</p>
</header>

<form method="POST" use:enhance class="flex flex-col gap-5 rounded-2xl recessed p-4">
	{#if form?.errors.form}
		<p role="alert" class="rounded-lg bg-oxblood px-3 py-2 text-sm text-cream-50">
			{form.errors.form}
		</p>
	{/if}
	<input type="hidden" name="stylusId" value={data.stylus.id} />
	<div class="flex flex-col gap-1.5 text-sm text-cream-100">
		<label for="stylus-installed">Installed on</label>
		<input
			id="stylus-installed"
			name="installedOn"
			type="date"
			max={createdOn}
			required
			bind:value={() => installedOn, (value) => (picked = value)}
			class="min-h-11 w-full rounded-lg border border-alu-600 bg-walnut-950 px-3 font-mono text-cream-50 focus:border-amber-glow focus:outline-none aria-invalid:border-oxblood"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={['installed-hint', error && 'installed-error'].filter(Boolean).join(' ')}
		/>
		<span id="installed-hint" class="text-xs text-cream-300">
			You added this stylus on {formatShortDate(createdOn, createdOn)}. Plays you've logged since
			then stay as they are.
		</span>
		{#if error}
			<span id="installed-error" class="font-mono text-xs text-cream-50">
				<span aria-hidden="true" class="mr-1 text-vu-soon">▲</span>{error}
			</span>
		{/if}
		<p aria-live="polite" class="min-h-5 font-mono text-xs text-amber-glow">{estimate}</p>
	</div>
	<button
		class="min-h-12 rounded-full bg-amber-glow font-mono font-semibold text-walnut-950 shadow-[0_2px_0_var(--color-walnut-950)] active:translate-y-px"
	>
		Save install date
	</button>
</form>
