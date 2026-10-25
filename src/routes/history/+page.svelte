<script lang="ts">
	import { turntableModelName } from '#lib/catalog/turntables.ts';
	import { formatShortDate } from '#lib/domain/dates.ts';
	import { STYLUS_PROFILES, type StylusProfileId } from '#lib/domain/stylus-profiles.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const profileLabel = (profile: string) =>
		STYLUS_PROFILES[profile as StylusProfileId]?.label ?? profile;
	const sides = (n: number) => `${n} ${n === 1 ? 'side' : 'sides'} played`;
</script>

<svelte:head>
	<title>History · Stylus Tracker</title>
</svelte:head>

<header class="flex flex-col gap-1.5">
	<h1 class="font-display text-[2.125rem] leading-none font-semibold tracking-tight text-cream-50">
		History
	</h1>
	<p class="font-mono text-xs text-cream-300">Retired styli and how hard they worked.</p>
</header>

{#if data.rows.length > 0}
	<!-- Liner-notes timeline: one sleeve per retired stylus. -->
	<ul class="flex flex-col gap-3">
		{#each data.rows as { turntable, stylus, sidesPlayed, wearPercent } (stylus.id)}
			{@const worn = Math.round(wearPercent)}
			<li class="flex flex-col gap-3 card p-4">
				<div class="flex items-start gap-3">
					<span
						aria-hidden="true"
						class="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-vinyl [background-image:var(--vinyl-grooves)]"
					>
						<span class="size-3.5 rounded-full bg-cream-300"></span>
					</span>
					<div class="min-w-0 flex-1">
						<h2 class="truncate font-display text-lg leading-tight font-semibold text-cream-50">
							{turntable.name}
						</h2>
						{#if turntableModelName(turntable) !== turntable.name}
							<p class="truncate font-mono text-xs text-cream-300">
								{turntableModelName(turntable)}
							</p>
						{/if}
					</div>
					<p
						class={[
							'shrink-0 rounded-full px-2.5 py-1 font-mono text-[0.6875rem] font-semibold',
							worn >= 100 ? 'bg-oxblood text-cream-50' : 'bg-cream-100/8 text-cream-100'
						]}
					>
						{worn}% worn
					</p>
				</div>
				<div aria-hidden="true" class="h-1 overflow-hidden rounded-full bg-vinyl/60">
					<div
						class={['h-full rounded-full', worn >= 100 ? 'bg-oxblood' : 'bg-amber-glow/80']}
						style:width={`${Math.min(100, Math.max(2, wearPercent))}%`}
					></div>
				</div>
				<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-xs text-cream-300">
					<dt class="eyebrow">Stylus</dt>
					<dd class="text-cream-100">
						{#if stylus.cartridge}<span>{stylus.cartridge}</span> ·{/if}
						{profileLabel(stylus.profile)}
					</dd>
					<dt class="eyebrow">In use</dt>
					<dd class="text-cream-100">
						{formatShortDate(stylus.installedOn, data.today)} – {formatShortDate(
							stylus.retiredOn!,
							data.today
						)}
					</dd>
				</dl>
				<p class="font-mono text-sm font-medium text-amber-glow">{sides(sidesPlayed)}</p>
			</li>
		{/each}
	</ul>
{:else}
	<section class="flex flex-col items-center gap-4 card px-6 py-10 text-center">
		<div
			aria-hidden="true"
			class="grid size-20 place-items-center rounded-full bg-vinyl [background-image:var(--vinyl-grooves)] opacity-70"
		>
			<span class="size-7 rounded-full bg-cream-300/70"></span>
		</div>
		<p class="font-mono text-sm text-cream-300">Retired styli show up here once you replace one.</p>
	</section>
{/if}
