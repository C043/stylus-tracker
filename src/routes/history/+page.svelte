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

<h1 class="font-display text-3xl font-semibold text-cream-50">History</h1>

{#if data.rows.length > 0}
	<ul class="flex flex-col gap-3">
		{#each data.rows as { turntable, stylus, sidesPlayed, wearPercent } (stylus.id)}
			<li class="flex flex-col gap-2 rounded-2xl border border-walnut-700/60 recessed p-4">
				<div class="flex items-baseline justify-between gap-3">
					<h2 class="truncate font-display text-lg font-semibold text-cream-50">
						{turntable.name}
					</h2>
					<p class="shrink-0 font-mono text-xs text-cream-300">
						{Math.round(wearPercent)}% worn
					</p>
				</div>
				{#if turntableModelName(turntable) !== turntable.name}
					<p class="-mt-2 truncate font-mono text-xs text-cream-300">
						{turntableModelName(turntable)}
					</p>
				{/if}
				<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs text-cream-300">
					<dt>Stylus</dt>
					<dd class="text-cream-100">
						{#if stylus.cartridge}<span>{stylus.cartridge}</span> ·{/if}
						{profileLabel(stylus.profile)}
					</dd>
					<dt>In use</dt>
					<dd class="text-cream-100">
						{formatShortDate(stylus.installedOn, data.today)} – {formatShortDate(
							stylus.retiredOn!,
							data.today
						)}
					</dd>
				</dl>
				<p class="font-mono text-sm text-amber-glow">{sides(sidesPlayed)}</p>
			</li>
		{/each}
	</ul>
{:else}
	<section class="rounded-2xl recessed px-6 py-8 text-center">
		<p class="font-mono text-sm text-cream-300">Retired styli show up here once you replace one.</p>
	</section>
{/if}
