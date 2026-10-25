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
	// Bound, not just `checked={…}` / `value={…}`: hydration would otherwise clear what was
	// picked or typed before the JS loaded (slow phone). Follow the form's echo after a failed submit.
	let selected = $derived(values?.catalogId);
	let customBrand = $derived(values?.brand ?? '');
	let customModel = $derived(values?.model ?? '');
	let nickname = $derived(values?.name ?? '');

	const input = 'field-input';
	// A radio styled as a card; the ring shows the checked and keyboard-focused states.
	const choice =
		'group/choice relative flex min-h-11 cursor-pointer flex-col items-center gap-2 overflow-hidden rounded-2xl border border-cream-100/10 bg-black/25 p-1.5 pb-2.5 text-center transition-[border-color,background-color,box-shadow] hover:border-cream-100/20 has-checked:border-amber-glow has-checked:bg-amber-glow/10 has-checked:shadow-[0_0_0_1px_var(--color-amber-glow),0_8px_24px_-10px_rgb(255_179_71/0.5)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-amber-glow';
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

<header class="flex flex-col gap-2">
	<p class="eyebrow text-amber-glow">Step 1 of 2 · Turntable</p>
	<h1 class="font-display text-[2.125rem] leading-none font-semibold tracking-tight text-cream-50">
		Add a turntable
	</h1>
</header>

<form method="POST" use:enhance class="group flex flex-col gap-6">
	<fieldset
		class="flex min-w-0 flex-col gap-4"
		aria-describedby={errors.catalogId ? 'catalog-error' : undefined}
	>
		<legend class="mb-1 text-sm font-medium text-cream-100">Which turntable?</legend>
		{@render fieldError('catalog-error', errors.catalogId)}

		<nav
			aria-label="Jump to brand"
			class="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
		>
			{#each catalog as brand (brand.id)}
				<a href={`#brand-${brand.id}`} class="btn shrink-0 btn-secondary px-3.5 text-xs">
					{brand.brand}
				</a>
			{/each}
		</nav>

		<label class={[choice, 'flex-row text-left']}>
			<input
				type="radio"
				name="catalogId"
				value={CUSTOM_CHOICE}
				bind:group={selected}
				class="absolute inset-0 z-10 size-full cursor-pointer appearance-none rounded-2xl opacity-0"
			/>
			<img
				src={CUSTOM_IMAGE}
				alt=""
				width="64"
				height="64"
				class="size-16 rounded-xl bg-black/30 p-1"
			/>
			<span>
				<span class="block font-display text-lg text-cream-50">Custom</span>
				<span class="font-mono text-xs text-cream-300">Not listed? Type the brand and model.</span>
			</span>
		</label>

		<!-- Shown only while Custom is checked; pure CSS so it works before JS loads. -->
		<div class="hidden flex-col gap-4 card p-4 group-has-[input[value=custom]:checked]:flex">
			<div class="flex flex-col gap-2 text-sm font-medium text-cream-100">
				<label for="custom-brand">Brand</label>
				<input
					id="custom-brand"
					name="brand"
					bind:value={customBrand}
					maxlength="60"
					autocomplete="off"
					class={input}
					aria-invalid={errors.brand ? 'true' : undefined}
					aria-describedby={errors.brand ? 'brand-error' : undefined}
				/>
				{@render fieldError('brand-error', errors.brand)}
			</div>
			<div class="flex flex-col gap-2 text-sm font-medium text-cream-100">
				<label for="custom-model">Model</label>
				<input
					id="custom-model"
					name="model"
					bind:value={customModel}
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
				<h2
					id={`brand-${brand.id}-name`}
					class="mb-2.5 font-display text-xl font-semibold text-cream-50"
				>
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
								bind:group={selected}
								class="absolute inset-0 z-10 size-full cursor-pointer appearance-none rounded-2xl opacity-0"
							/>
							<img
								src={model.image ?? PLACEHOLDER_IMAGE}
								alt=""
								width="240"
								height="180"
								loading="lazy"
								class="aspect-4/3 w-full rounded-xl object-cover transition-transform duration-300 group-hover/choice:scale-[1.03]"
							/>
							<span class="font-mono text-xs font-medium text-cream-100">
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
		class="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] flex flex-col gap-3 card bg-walnut-950/85 p-3.5 backdrop-blur-xl"
	>
		<div class="flex flex-col gap-2 text-sm font-medium text-cream-100">
			<label for="turntable-name"
				>Nickname <span class="font-normal text-cream-300">(optional)</span></label
			>
			<input
				id="turntable-name"
				name="name"
				bind:value={nickname}
				maxlength="60"
				placeholder="e.g. Living room"
				autocomplete="off"
				class={input}
				aria-invalid={errors.name ? 'true' : undefined}
				aria-describedby={errors.name ? 'name-error' : undefined}
			/>
			{@render fieldError('name-error', errors.name)}
		</div>
		<button class="btn min-h-12 text-base btn-primary"> Next: stylus </button>
	</div>
</form>
