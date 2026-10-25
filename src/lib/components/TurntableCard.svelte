<script lang="ts">
	import { resolve } from '$app/paths';
	import { catalogImage, turntableModelName } from '../catalog/turntables';
	import { describeBackfill } from '../domain/backfill';
	import { formatShortDate, type LocalDate } from '../domain/dates';
	import { STYLUS_PROFILES, type StylusProfileId } from '../domain/stylus-profiles';
	import { addPlays, type PlayKind, type Wear } from '../domain/wear';
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
		/** Plays of the active stylus queued on this device that the server hasn't counted yet. */
		pending?: readonly { kind: PlayKind }[];
		/** The server couldn't be reached last time; say why pending plays are waiting. */
		unreachable?: boolean;
		/** The active stylus's last logged play; enables undo on the dashboard. */
		lastPlay?: { id: string } | null;
		/** Message from a failed play or undo on this stylus. */
		playError?: string;
		/** The user's local date; dates in another year show their year. */
		today: LocalDate;
		/** `gauge` for the dashboard, `compact` for the turntables list. */
		variant?: 'gauge' | 'compact';
	}

	let {
		turntable,
		stylus,
		wear: serverWear,
		pending = [],
		unreachable = false,
		lastPlay,
		playError,
		today,
		variant = 'gauge'
	}: Props = $props();

	let wear = $derived(serverWear && addPlays(serverWear, pending));
	let waiting = $derived(
		`${pending.length} ${pending.length === 1 ? 'play' : 'plays'} saved on this device, waiting for the server`
	);

	let titleId = $derived(`turntable-${turntable.id}`);
	let modelName = $derived(turntableModelName(turntable));
	let profileLabel = $derived(
		stylus ? (STYLUS_PROFILES[stylus.profile as StylusProfileId]?.label ?? stylus.profile) : ''
	);
</script>

<article aria-labelledby={titleId} class="flex flex-col gap-5 card p-4">
	<header class="flex items-center gap-3">
		<!-- Product shot on a small walnut plinth -->
		<div
			class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-cream-100/10 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] [background:var(--wood-grain)]"
		>
			<img
				src={catalogImage(turntable.catalogId)}
				alt=""
				width="64"
				height="64"
				class="size-full object-cover"
			/>
		</div>
		<div class="min-w-0 flex-1">
			<h2
				id={titleId}
				class="truncate font-display text-[1.375rem] leading-tight font-semibold text-cream-50"
			>
				{turntable.name}
			</h2>
			{#if modelName !== turntable.name}
				<p class="truncate font-mono text-xs text-cream-300">{modelName}</p>
			{/if}
		</div>
		{#if variant === 'compact' && wear}
			<p class="shrink-0 text-right font-mono leading-tight">
				<span
					data-testid="remaining-records"
					class="block text-[1.75rem] font-semibold tracking-tight text-cream-50 tabular-nums"
				>
					{wear.remainingRecords}
				</span>
				<span class="eyebrow">left</span>
			</p>
		{/if}
	</header>

	{#if stylus && wear}
		{#if variant === 'gauge'}
			<WearGauge {wear} />
			{#if unreachable && pending.length > 0}
				<p role="status" class="font-mono text-xs text-cream-300">{waiting}</p>
			{/if}
			<PlayButtons
				stylusId={stylus.id}
				canUndo={lastPlay != null || pending.length > 0}
				error={playError}
			/>
		{:else}
			<!-- Text equivalent is the "left" count above; this bar is just a glance. -->
			<div aria-hidden="true" class="-mt-1 h-1.5 overflow-hidden rounded-full bg-vinyl/60">
				<div
					class={[
						'h-full rounded-full',
						wear.status === 'good' && 'bg-vu-good',
						wear.status === 'soon' && 'bg-vu-soon',
						wear.status === 'replace' && 'bg-oxblood'
					]}
					style:width={`${Math.max(2, wear.wearPercent)}%`}
				></div>
			</div>
		{/if}
		<div class="flex flex-col gap-2">
			<dl
				class="divide-y divide-cream-100/8 rounded-2xl bg-black/20 px-3.5 font-mono text-xs shadow-[inset_0_1px_2px_rgb(0_0_0/0.4)]"
			>
				<div class="flex items-baseline justify-between gap-4 py-2.5">
					<dt class="eyebrow">Stylus</dt>
					<dd class="text-right text-cream-100">
						{stylus.cartridge ? `${stylus.cartridge} · ` : ''}{profileLabel}
					</dd>
				</div>
				<div class="flex items-baseline justify-between gap-4 py-2.5">
					<dt class="eyebrow">Installed</dt>
					<dd class="text-right text-cream-100">{formatShortDate(stylus.installedOn, today)}</dd>
				</div>
			</dl>
			{#if stylus.backfilledRecords > 0}
				<p class="px-1 font-mono text-[0.6875rem] text-amber-glow/90">
					{describeBackfill(stylus.backfilledRecords, stylus.installedOn, stylus.createdOn)}
				</p>
			{/if}
		</div>
		<div class="grid grid-cols-2 gap-2">
			<a
				href={resolve('/turntables/[id]/stylus/edit', { id: turntable.id })}
				class="btn btn-secondary px-2 text-xs"
			>
				Edit install date
			</a>
			<a
				href={resolve('/turntables/[id]/stylus/replace', { id: turntable.id })}
				class={['btn px-2 text-xs', wear.status === 'good' ? 'btn-secondary' : 'btn-primary']}
			>
				Replace stylus
			</a>
		</div>
	{:else}
		<div
			class="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-cream-100/15 p-3 pl-4"
		>
			<p class="text-sm text-cream-300">No stylus yet.</p>
			<a
				href={resolve('/turntables/[id]/stylus/new', { id: turntable.id })}
				class="btn btn-primary"
			>
				Add stylus
			</a>
		</div>
	{/if}
</article>
