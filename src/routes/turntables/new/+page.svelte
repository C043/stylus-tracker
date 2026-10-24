<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		CUSTOM_CHOICE,
		CUSTOM_IMAGE,
		PLACEHOLDER_IMAGE,
		catalog
	} from '#lib/catalog/turntables.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	let values = $derived(form?.values);
	let errors = $derived(form?.errors ?? {});

	const input =
		'min-h-11 w-full rounded-lg border border-alu-600 bg-walnut-950 px-3 text-cream-50 placeholder:text-alu-400 focus:border-amber-glow focus:outline-none aria-invalid:border-oxblood';
	// A radio styled as a card; the ring shows the checked and keyboard-focused states.
	const choice =
		'relative flex min-h-11 cursor-pointer flex-col items-center gap-2 rounded-xl border border-walnut-700 bg-walnut-950/50 p-2 text-center has-checked:border-amber-glow has-checked:bg-walnut-800 has-checked:shadow-[0_0_0_1px_var(--color-amber-glow)] has-focus-visible:outline-2 has-focus-visible:outline-amber-glow';
</script>

<svelte:head>
	<title>Add a turntable · Stylus Tracker</title>
</svelte:head>

{#snippet fieldError(id: string, message: string | undefined)}
	{#if message}
		<span {id} class="font-mono text-xs text-cream-50">
			<span aria-hidden="true" class="mr-1 text-vu-soon">▲</span>{message}
		</span>
	{/if}
{/snippet}

<header>
	<p class="font-mono text-xs tracking-wide text-cream-300 uppercase">Step 1 of 2 · Turntable</p>
	<h1 class="font-display text-3xl font-semibold text-cream-50">Add a turntable</h1>
</header>

<form method="POST" use:enhance class="group flex flex-col gap-6">
	<fieldset
		class="flex min-w-0 flex-col gap-4"
		aria-describedby={errors.catalogId ? 'catalog-error' : undefined}
	>
		<legend class="mb-2 text-sm text-cream-100">Which turntable?</legend>
		{@render fieldError('catalog-error', errors.catalogId)}

		<nav aria-label="Jump to brand" class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
			{#each catalog as brand (brand.id)}
				<a
					href={`#brand-${brand.id}`}
					class="inline-flex min-h-11 shrink-0 items-center rounded-full border border-alu-600 px-3 font-mono text-xs text-cream-100"
				>
					{brand.brand}
				</a>
			{/each}
		</nav>

		<label class={[choice, 'flex-row text-left']}>
			<input
				type="radio"
				name="catalogId"
				value={CUSTOM_CHOICE}
				checked={values?.catalogId === CUSTOM_CHOICE}
				class="absolute inset-0 size-full cursor-pointer appearance-none rounded-xl opacity-0"
			/>
			<img src={CUSTOM_IMAGE} alt="" width="64" height="64" class="size-16" />
			<span>
				<span class="block font-display text-lg text-cream-50">Custom</span>
				<span class="font-mono text-xs text-cream-300">Not listed? Type the brand and model.</span>
			</span>
		</label>

		<!-- Shown only while Custom is checked; pure CSS so it works before JS loads. -->
		<div
			class="hidden flex-col gap-4 rounded-xl recessed p-4 group-has-[input[value=custom]:checked]:flex"
		>
			<div class="flex flex-col gap-1.5 text-sm text-cream-100">
				<label for="custom-brand">Brand</label>
				<input
					id="custom-brand"
					name="brand"
					value={values?.brand ?? ''}
					maxlength="60"
					autocomplete="off"
					class={input}
					aria-invalid={errors.brand ? 'true' : undefined}
					aria-describedby={errors.brand ? 'brand-error' : undefined}
				/>
				{@render fieldError('brand-error', errors.brand)}
			</div>
			<div class="flex flex-col gap-1.5 text-sm text-cream-100">
				<label for="custom-model">Model</label>
				<input
					id="custom-model"
					name="model"
					value={values?.model ?? ''}
					maxlength="60"
					autocomplete="off"
					class={input}
					aria-invalid={errors.model ? 'true' : undefined}
					aria-describedby={errors.model ? 'model-error' : undefined}
				/>
				{@render fieldError('model-error', errors.model)}
			</div>
		</div>

		{#each catalog as brand (brand.id)}
			<section
				id={`brand-${brand.id}`}
				class="scroll-mt-4"
				aria-labelledby={`brand-${brand.id}-name`}
			>
				<h2 id={`brand-${brand.id}-name`} class="mb-2 font-display text-lg text-cream-50">
					{brand.brand}
				</h2>
				<div class="grid grid-cols-2 gap-3">
					{#each brand.models as model (model.id)}
						{@const catalogId = `${brand.id}/${model.id}`}
						<label class={choice}>
							<input
								type="radio"
								name="catalogId"
								value={catalogId}
								checked={values?.catalogId === catalogId}
								class="absolute inset-0 size-full cursor-pointer appearance-none rounded-xl opacity-0"
							/>
							<img
								src={model.image ?? PLACEHOLDER_IMAGE}
								alt=""
								width="240"
								height="180"
								loading="lazy"
								class="aspect-4/3 w-full object-contain"
							/>
							<span class="font-mono text-xs text-cream-100">
								<span class="sr-only">{brand.brand} </span>{model.model}
							</span>
						</label>
					{/each}
				</div>
			</section>
		{/each}
	</fieldset>

	<!-- Sticky so the next step stays in thumb reach while scrolling the catalog. -->
	<div
		class="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-4 flex flex-col gap-3 border-t border-walnut-700 bg-walnut-900/95 px-4 py-3 backdrop-blur"
	>
		<div class="flex flex-col gap-1.5 text-sm text-cream-100">
			<label for="turntable-name">Nickname <span class="text-cream-300">(optional)</span></label>
			<input
				id="turntable-name"
				name="name"
				value={values?.name ?? ''}
				maxlength="60"
				placeholder="e.g. Living room"
				autocomplete="off"
				class={input}
				aria-invalid={errors.name ? 'true' : undefined}
				aria-describedby={errors.name ? 'name-error' : undefined}
			/>
			{@render fieldError('name-error', errors.name)}
		</div>
		<button
			class="min-h-12 rounded-full bg-amber-glow font-mono font-semibold text-walnut-950 shadow-[0_2px_0_var(--color-walnut-950)] active:translate-y-px"
		>
			Next: stylus
		</button>
	</div>
</form>
