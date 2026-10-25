<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Bound so hydration keeps what was typed before the JS loaded.
	let name = $derived(form?.values?.name ?? data.turntable.name);
	let errors = $derived(form?.errors ?? {});
</script>

<svelte:head>
	<title>Edit turntable · Stylus Tracker</title>
</svelte:head>

<header class="flex flex-col gap-2">
	<p class="eyebrow text-amber-glow">Edit turntable</p>
	<h1 class="font-display text-[2.125rem] leading-none font-semibold tracking-tight text-cream-50">
		{data.turntable.name}
	</h1>
	<p class="font-mono text-xs text-cream-300">{data.modelName}</p>
</header>

<form method="POST" action="?/rename" use:enhance class="flex flex-col gap-5 card p-4">
	{#if errors.form}
		<p role="alert" class="rounded-xl bg-oxblood/90 px-3.5 py-2.5 text-sm text-cream-50">
			{errors.form}
		</p>
	{/if}
	<div class="flex flex-col gap-2 text-sm font-medium text-cream-100">
		<label for="turntable-name">Nickname</label>
		<input
			id="turntable-name"
			name="name"
			bind:value={name}
			maxlength="60"
			placeholder={data.modelName}
			autocomplete="off"
			class="field-input"
			aria-invalid={errors.name ? 'true' : undefined}
			aria-describedby={['name-hint', errors.name && 'name-error'].filter(Boolean).join(' ')}
		/>
		<span id="name-hint" class="text-xs text-cream-300">
			Leave it empty to call it {data.modelName}.
		</span>
		{#if errors.name}
			<span id="name-error" class="font-mono text-xs text-cream-50">
				<span aria-hidden="true" class="mr-1 text-vu-soon">▲</span>{errors.name}
			</span>
		{/if}
	</div>
	<button class="btn min-h-12 text-base btn-primary">Save name</button>
</form>

<!-- A disclosure, not confirm(), so the second step works before JS loads. -->
<details class="group card p-4">
	<summary
		class="btn w-full cursor-pointer list-none btn-secondary text-cream-100 [&::-webkit-details-marker]:hidden"
	>
		Delete turntable
	</summary>
	<form method="POST" action="?/delete" use:enhance class="mt-4 flex flex-col gap-3">
		<p class="text-sm text-cream-100">
			This deletes {data.turntable.name}, its stylus, its stylus history and every play you've
			logged on it. It can't be undone.
		</p>
		<button class="btn min-h-12 bg-oxblood text-base text-cream-50 hover:bg-oxblood/85">
			Delete {data.turntable.name} for good
		</button>
	</form>
</details>
