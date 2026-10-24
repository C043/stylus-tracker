<script lang="ts">
	import { resolve } from '$app/paths';
	import { catalogImage, turntableModelName } from '../catalog/turntables';
	import { describeBackfill } from '../domain/backfill';
	import { formatShortDate, type LocalDate } from '../domain/dates';
	import { STYLUS_PROFILES, type StylusProfileId } from '../domain/stylus-profiles';
	import type { Wear } from '../domain/wear';
	import PlayButtons from './PlayButtons.svelte';
	import WearGauge from './WearGauge.svelte';

	interface Props {
		turntable: {
			id: string;
			name: string;
			catalogId: string | null;
			brand: string | null;
			model: string | null;
		};
		stylus: {
			id: string;
			profile: string;
			cartridge: string | null;
			installedOn: string;
			createdOn: string;
			backfilledRecords: number;
		} | null;
		wear: Wear | null;
		/** The active stylus's last logged play; enables undo on the dashboard. */
		lastPlay?: { id: string } | null;
		/** Message from a failed play or undo on this stylus. */
		playError?: string;
		/** The user's local date; dates in another year show their year. */
		today: LocalDate;
		/** `gauge` for the dashboard, `compact` for the turntables list. */
		variant?: 'gauge' | 'compact';
	}

	let { turntable, stylus, wear, lastPlay, playError, today, variant = 'gauge' }: Props = $props();

	let titleId = $derived(`turntable-${turntable.id}`);
	let modelName = $derived(turntableModelName(turntable));
	let profileLabel = $derived(
		stylus ? (STYLUS_PROFILES[stylus.profile as StylusProfileId]?.label ?? stylus.profile) : ''
	);
</script>

<article
	aria-labelledby={titleId}
	class="flex flex-col gap-4 rounded-2xl border border-walnut-700/60 recessed p-4"
>
	<header class="flex items-center gap-3">
		<img
			src={catalogImage(turntable.catalogId)}
			alt=""
			width="80"
			height="60"
			class="h-15 w-20 shrink-0 rounded-md bg-walnut-950/60 object-contain"
		/>
		<div class="min-w-0">
			<h2 id={titleId} class="truncate font-display text-xl font-semibold text-cream-50">
				{turntable.name}
			</h2>
			{#if modelName !== turntable.name}
				<p class="truncate font-mono text-xs text-cream-300">{modelName}</p>
			{/if}
		</div>
		{#if variant === 'compact' && wear}
			<p class="ml-auto shrink-0 text-right font-mono leading-tight">
				<span data-testid="remaining-records" class="block text-2xl font-semibold text-cream-50">
					{wear.remainingRecords}
				</span>
				<span class="text-xs text-cream-300">left</span>
			</p>
		{/if}
	</header>

	{#if stylus && wear}
		{#if variant === 'gauge'}
			<WearGauge {wear} />
			<PlayButtons stylusId={stylus.id} canUndo={lastPlay != null} error={playError} />
		{/if}
		<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs text-cream-300">
			<dt>Stylus</dt>
			<dd class="text-cream-100">
				{stylus.cartridge ? `${stylus.cartridge} · ` : ''}{profileLabel}
			</dd>
			<dt>Installed</dt>
			<dd class="text-cream-100">{formatShortDate(stylus.installedOn, today)}</dd>
		</dl>
		{#if stylus.backfilledRecords > 0}
			<p class="font-mono text-xs text-amber-glow">
				{describeBackfill(stylus.backfilledRecords, stylus.installedOn, stylus.createdOn)}
			</p>
		{/if}
	{:else}
		<div class="flex items-center justify-between gap-3">
			<p class="text-sm text-cream-300">No stylus yet.</p>
			<a
				href={resolve('/turntables/[id]/stylus/new', { id: turntable.id })}
				class="inline-flex min-h-11 items-center rounded-full bg-amber-glow px-4 font-mono text-sm font-semibold text-walnut-950"
			>
				Add stylus
			</a>
		</div>
	{/if}
</article>
