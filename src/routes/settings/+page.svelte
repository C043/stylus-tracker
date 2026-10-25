<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let typed = $state<string>();
	let minutes = $derived(
		typed ?? form?.values?.minutesPerSide ?? String(data.settings.minutesPerSide)
	);
	let fullRecord = $derived(/^\d+$/.test(minutes) ? Number(minutes) * 2 : undefined);
	let error = $derived(form?.errors?.minutesPerSide);
</script>

<svelte:head>
	<title>Settings · Stylus Tracker</title>
</svelte:head>

<h1 class="font-display text-[2.125rem] leading-none font-semibold tracking-tight text-cream-50">
	Settings
</h1>

<form
	method="POST"
	use:enhance={() =>
		async ({ update }) => {
			await update({ reset: false });
			typed = undefined;
		}}
	class="flex flex-col gap-5 card p-4"
>
	<div class="flex flex-col gap-2 text-sm font-medium text-cream-100">
		<label for="minutes-per-side">Minutes per side</label>
		<input
			id="minutes-per-side"
			name="minutesPerSide"
			type="number"
			inputmode="numeric"
			min="1"
			max="60"
			step="1"
			required
			bind:value={() => minutes, (value) => (typed = String(value ?? ''))}
			class="field-input w-32 text-center font-mono text-2xl font-semibold"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={['minutes-hint', error && 'minutes-error'].filter(Boolean).join(' ')}
		/>
		<span id="minutes-hint" class="text-xs text-cream-300">
			How long one side of a record plays. An LP side usually runs 18 to 22 minutes, so 20 is a good
			average. Changing it updates the wear of every stylus, retired ones included.
		</span>
		{#if error}
			<span id="minutes-error" class="font-mono text-xs text-cream-50">
				<span aria-hidden="true" class="mr-1 text-vu-soon">▲</span>{error}
			</span>
		{/if}
		<p aria-live="polite" class="min-h-5 font-mono text-xs text-amber-glow">
			{#if fullRecord}A full record counts as {fullRecord} minutes of stylus time.{/if}
		</p>
	</div>
	<button class="btn min-h-12 text-base btn-primary"> Save settings </button>
	<p role="status" class="min-h-5 text-center font-mono text-xs text-cream-300">
		{#if form?.saved && typed === undefined}Saved{/if}
	</p>
</form>
