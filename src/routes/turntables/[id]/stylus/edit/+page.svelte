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
	let cartridgeError = $derived(form?.errors.cartridge);
	let cartridge = $derived(form?.values.cartridge ?? data.stylus.cartridge ?? '');
</script>

<svelte:head>
	<title>Edit stylus · Stylus Tracker</title>
</svelte:head>

<header class="flex flex-col gap-2">
	<p class="eyebrow text-amber-glow">Edit stylus</p>
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
	<input type="hidden" name="stylusId" value={data.stylus.id} />
	<div class="flex flex-col gap-2 text-sm font-medium text-cream-100">
		<label for="stylus-cartridge"
			>Cartridge <span class="font-normal text-cream-300">(optional)</span></label
		>
		<input
			id="stylus-cartridge"
			name="cartridge"
			bind:value={cartridge}
			maxlength="80"
			placeholder="e.g. Ortofon 2M Red"
			autocomplete="off"
			class="field-input"
			aria-invalid={cartridgeError ? 'true' : undefined}
			aria-describedby={['cartridge-hint', cartridgeError && 'cartridge-error']
				.filter(Boolean)
				.join(' ')}
		/>
		<span id="cartridge-hint" class="text-xs text-cream-300">
			Fixes the name of this stylus. Fitted a new one? Use Replace stylus so the count starts again.
		</span>
		{#if cartridgeError}
			<span id="cartridge-error" class="font-mono text-xs text-cream-50">
				<span aria-hidden="true" class="mr-1 text-vu-soon">▲</span>{cartridgeError}
			</span>
		{/if}
	</div>
	<div class="flex flex-col gap-2 text-sm font-medium text-cream-100">
		<label for="stylus-installed">Installed on</label>
		<input
			id="stylus-installed"
			name="installedOn"
			type="date"
			max={createdOn}
			required
			bind:value={() => installedOn, (value) => (picked = value)}
			class="field-input font-mono"
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
	<button class="btn min-h-12 text-base btn-primary"> Save stylus </button>
</form>
