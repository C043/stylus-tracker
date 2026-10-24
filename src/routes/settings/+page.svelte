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

<h1 class="font-display text-3xl font-semibold text-cream-50">Settings</h1>

<form
	method="POST"
	use:enhance={() =>
		async ({ update }) => {
			await update({ reset: false });
			typed = undefined;
		}}
	class="flex flex-col gap-5 rounded-2xl recessed p-4"
>
	<div class="flex flex-col gap-1.5 text-sm text-cream-100">
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
			class="min-h-11 w-28 rounded-lg border border-alu-600 bg-walnut-950 px-3 font-mono text-cream-50 focus:border-amber-glow focus:outline-none aria-invalid:border-oxblood"
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
	<button
		class="min-h-12 rounded-full bg-amber-glow font-mono font-semibold text-walnut-950 shadow-[0_2px_0_var(--color-walnut-950)] active:translate-y-px"
	>
		Save settings
	</button>
	<p role="status" class="min-h-5 text-center font-mono text-xs text-cream-300">
		{#if form?.saved && typed === undefined}Saved{/if}
	</p>
</form>
