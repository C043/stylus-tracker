<script lang="ts">
	import { SOON_THRESHOLD_PERCENT, type Wear, type WearStatus } from '../domain/wear';

	interface Props {
		wear: Wear;
	}

	let { wear }: Props = $props();

	const STATUS_TEXT: Record<WearStatus, string> = {
		good: 'Good',
		soon: 'Order a replacement',
		replace: "Replace now, you're damaging records"
	};

	// Meter geometry: needle pivots at the bottom centre and sweeps ±SWEEP degrees.
	const CX = 100;
	const CY = 112;
	const R = 86;
	const SWEEP = 55;
	const angleFor = (percent: number) => -SWEEP + (percent / 100) * SWEEP * 2;
	const point = (deg: number, r = R) => {
		const rad = (deg * Math.PI) / 180;
		return `${(CX + r * Math.sin(rad)).toFixed(2)} ${(CY - r * Math.cos(rad)).toFixed(2)}`;
	};
	const arc = (from: number, to: number) =>
		`M ${point(angleFor(from))} A ${R} ${R} 0 0 1 ${point(angleFor(to))}`;
	const ticks = [0, 25, 50, 75, 100];

	let percent = $derived(Math.round(wear.wearPercent));
	let recordsWord = $derived(wear.remainingRecords === 1 ? 'record' : 'records');
	let valueText = $derived(
		`${percent}% worn, ${wear.remainingRecords} ${recordsWord}${wear.extraSide ? ' and 1 side' : ''} left. ${STATUS_TEXT[wear.status]}.`
	);
</script>

<div
	role="meter"
	aria-label="Stylus wear"
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={percent}
	aria-valuetext={valueText}
	data-status={wear.status}
	class="flex flex-col items-center gap-3"
>
	<!-- Backlit VU-meter face -->
	<div
		class="w-full max-w-64 rounded-xl border border-alu-600 bg-[radial-gradient(ellipse_at_50%_90%,var(--color-amber-glow),var(--color-cream-100)_70%)] p-2 shadow-[inset_0_2px_8px_rgb(0_0_0/0.45)]"
		aria-hidden="true"
	>
		<svg viewBox="0 0 200 124" class="w-full">
			<path d={arc(0, SOON_THRESHOLD_PERCENT)} class="fill-none stroke-vinyl" stroke-width="2" />
			<path
				d={arc(SOON_THRESHOLD_PERCENT, 100)}
				class="fill-none stroke-oxblood"
				stroke-width="6"
			/>
			{#each ticks as tick (tick)}
				<path
					d={`M ${point(angleFor(tick), R - 8)} L ${point(angleFor(tick), R + 4)}`}
					class={tick >= SOON_THRESHOLD_PERCENT ? 'stroke-oxblood' : 'stroke-vinyl'}
					stroke-width="2"
				/>
			{/each}
			<text x="22" y="40" class="fill-vinyl font-mono text-[11px]">GOOD</text>
			<text x="148" y="40" class="fill-oxblood font-mono text-[11px] font-semibold">WORN</text>
			<text
				x={CX}
				y="86"
				text-anchor="middle"
				class="fill-walnut-800 font-mono text-[10px] tracking-[0.2em]"
			>
				WEAR
			</text>
			<g
				class="transition-transform duration-700 ease-out"
				style:transform={`rotate(${angleFor(wear.wearPercent)}deg)`}
				style:transform-origin={`${CX}px ${CY}px`}
			>
				<line x1={CX} y1={CY} x2={CX} y2={CY - R - 2} class="stroke-vinyl" stroke-width="1.6" />
			</g>
			<circle cx={CX} cy={CY} r="7" class="fill-walnut-900" />
		</svg>
	</div>

	<p class="flex flex-col items-center leading-none">
		<span data-testid="remaining-records" class="font-mono text-6xl font-semibold text-cream-50">
			{wear.remainingRecords}
		</span>
		<span class="mt-1 text-cream-300">{recordsWord} left</span>
		{#if wear.extraSide}
			<span class="mt-1 font-mono text-sm text-cream-300">+ 1 side</span>
		{/if}
	</p>

	<p
		class={[
			'rounded-full px-3 py-1 font-mono text-xs font-semibold',
			wear.status === 'good' && 'bg-vu-good text-walnut-950',
			wear.status === 'soon' && 'bg-vu-soon text-walnut-950',
			wear.status === 'replace' && 'bg-oxblood text-cream-50'
		]}
	>
		{STATUS_TEXT[wear.status]}
	</p>
</div>
