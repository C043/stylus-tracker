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

	// Record geometry. A record plays from the outer groove inwards, so the tonearm's needle
	// travels from OUTER (0 % worn) to INNER (100 %, the run-out by the label).
	const C = { x: 100, y: 104 };
	const OUTER = 92;
	const INNER = 42;
	const LABEL = 34;
	const grooveRadius = (percent: number) => OUTER - ((OUTER - INNER) * percent) / 100;
	const grooves = Array.from({ length: 16 }, (_, i) => INNER + 2 + i * 3.1);

	// Tonearm pivots outside the record, top right. Solve the arm's angle so its needle sits
	// on the groove for the current wear (law of cosines on pivot, centre and needle).
	const PIVOT = { x: 214, y: 22 };
	const ARM = 150;
	const D = Math.hypot(C.x - PIVOT.x, C.y - PIVOT.y);
	const TO_CENTRE = (Math.atan2(C.y - PIVOT.y, C.x - PIVOT.x) * 180) / Math.PI;
	const armAngle = (r: number) =>
		TO_CENTRE - (Math.acos((D * D + ARM * ARM - r * r) / (2 * D * ARM)) * 180) / Math.PI;

	let percent = $derived(Math.round(wear.wearPercent));
	let needleAt = $derived(grooveRadius(Math.min(100, wear.wearPercent)));
	let recordsWord = $derived(wear.remainingRecords === 1 ? 'record' : 'records');
	let valueText = $derived(
		`${percent}% worn, ${wear.remainingRecords} ${recordsWord}${wear.extraSide ? ' and 1 side' : ''} left. ${STATUS_TEXT[wear.status]}.`
	);
	let tone = $derived(
		{
			good: { fill: 'fill-amber-glow', stroke: 'stroke-amber-glow', text: 'fill-walnut-950' },
			soon: { fill: 'fill-vu-soon', stroke: 'stroke-vu-soon', text: 'fill-walnut-950' },
			replace: { fill: 'fill-oxblood', stroke: 'stroke-oxblood', text: 'fill-cream-50' }
		}[wear.status]
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
	class="grid grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-3 @xs:grid-cols-[minmax(0,11rem)_1fr]"
>
	<svg viewBox="0 0 232 208" class="w-full overflow-visible" aria-hidden="true">
		<!-- Disc with its shadow on the platter -->
		<circle cx={C.x} cy={C.y + 4} r={OUTER + 4} class="fill-vinyl opacity-50 blur-[3px]" />
		<circle cx={C.x} cy={C.y} r={OUTER + 3} class="fill-vinyl" />
		{#each grooves as r (r)}
			<circle cx={C.x} cy={C.y} {r} class="fill-none stroke-groove" stroke-width="1.2" />
		{/each}
		<!-- Played grooves glow in the status colour, from the edge in to the needle. -->
		<circle
			cx={C.x}
			cy={C.y}
			r={(OUTER + needleAt) / 2}
			stroke-width={Math.max(0, OUTER - needleAt)}
			class={['fill-none opacity-25 transition-all duration-700 ease-out', tone.stroke]}
		/>
		<!-- Run-out zone: past this groove it's time to order a replacement. -->
		<circle
			cx={C.x}
			cy={C.y}
			r={grooveRadius(SOON_THRESHOLD_PERCENT)}
			class="fill-none stroke-oxblood"
			stroke-width="1.4"
			stroke-dasharray="3 3"
		/>
		<!-- Light sheen across the vinyl -->
		<path
			d={`M ${C.x} ${C.y} L ${C.x - 60} ${C.y - 72} A ${OUTER} ${OUTER} 0 0 1 ${C.x + 10} ${C.y - OUTER + 0.5} Z`}
			class="fill-cream-50 opacity-[0.06]"
		/>
		<path
			d={`M ${C.x} ${C.y} L ${C.x + 60} ${C.y + 72} A ${OUTER} ${OUTER} 0 0 1 ${C.x - 10} ${C.y + OUTER - 0.5} Z`}
			class="fill-cream-50 opacity-[0.04]"
		/>

		<!-- Label: wear percentage in the status colour -->
		<circle cx={C.x} cy={C.y} r={LABEL} class={['transition-colors duration-500', tone.fill]} />
		<circle
			cx={C.x}
			cy={C.y}
			r={LABEL - 4}
			class="fill-none stroke-walnut-950 opacity-20"
			stroke-width="0.8"
		/>
		<text
			x={C.x}
			y={C.y - 10}
			text-anchor="middle"
			class={['font-mono text-[15px] font-semibold', tone.text]}
		>
			{percent}%
		</text>
		<circle cx={C.x} cy={C.y} r="2.6" class="fill-vinyl" />
		<text
			x={C.x}
			y={C.y + 18}
			text-anchor="middle"
			class={['font-mono text-[7px] tracking-[0.25em] opacity-75', tone.text]}
		>
			WORN
		</text>

		<!-- Tonearm: drawn pointing right from the pivot, rotated onto the groove. -->
		<g
			class="transition-transform duration-700 ease-out"
			style:transform={`rotate(${armAngle(needleAt)}deg)`}
			style:transform-origin={`${PIVOT.x}px ${PIVOT.y}px`}
		>
			<line
				x1={PIVOT.x}
				y1={PIVOT.y}
				x2={PIVOT.x + ARM - 14}
				y2={PIVOT.y}
				class="stroke-alu-400"
				stroke-width="4"
				stroke-linecap="round"
			/>
			<line
				x1={PIVOT.x}
				y1={PIVOT.y - 1}
				x2={PIVOT.x + ARM - 14}
				y2={PIVOT.y - 1}
				class="stroke-alu-200"
				stroke-width="1"
				stroke-linecap="round"
			/>
			<!-- Headshell, angled like the real thing, with the needle at its tip. -->
			<rect
				x={PIVOT.x + ARM - 18}
				y={PIVOT.y - 5}
				width="20"
				height="10"
				rx="2"
				class="fill-alu-200"
				transform={`rotate(-20 ${PIVOT.x + ARM} ${PIVOT.y})`}
			/>
			<circle cx={PIVOT.x + ARM} cy={PIVOT.y} r="2.2" class={tone.fill} />
		</g>
		<!-- Pivot base and counterweight -->
		<circle
			cx={PIVOT.x}
			cy={PIVOT.y}
			r="13"
			class="fill-walnut-950 stroke-alu-600"
			stroke-width="1"
		/>
		<circle cx={PIVOT.x} cy={PIVOT.y} r="7" class="fill-alu-400" />
		<circle cx={PIVOT.x} cy={PIVOT.y} r="2.5" class="fill-alu-600" />
	</svg>

	<div class="flex min-w-0 flex-col items-start gap-1">
		<p class="flex flex-col leading-none">
			<span
				data-testid="remaining-records"
				class="font-mono text-[2.5rem] font-semibold tracking-tight text-cream-50 tabular-nums @2xs:text-[2.875rem] @xs:text-[3.25rem]"
			>
				{wear.remainingRecords}
			</span>
			<span class="mt-1.5 text-sm text-cream-300 @xs:text-base">{recordsWord} left</span>
			{#if wear.extraSide}
				<span class="mt-1 font-mono text-xs text-amber-glow">+ 1 side</span>
			{/if}
		</p>
		<p
			class={[
				'mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.6875rem] leading-tight font-semibold',
				wear.status === 'good' && 'bg-vu-good/15 text-vu-good',
				wear.status === 'soon' && 'bg-vu-soon/15 text-vu-soon',
				wear.status === 'replace' && 'bg-oxblood text-cream-50'
			]}
		>
			<span
				aria-hidden="true"
				class={[
					'size-1.5 shrink-0 rounded-full bg-current',
					wear.status !== 'good' && 'motion-safe:animate-pulse'
				]}
			></span>
			{STATUS_TEXT[wear.status]}
		</p>
	</div>
</div>
