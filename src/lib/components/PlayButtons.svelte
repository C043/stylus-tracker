<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PlayKind } from '../domain/wear';
	import { outbox } from '../offline/outbox.svelte';

	interface Props {
		stylusId: string;
		/** Whether the stylus has a logged or queued play to take back. */
		canUndo: boolean;
		/** Message from a failed play or undo posted without JS. */
		error?: string;
	}

	let { stylusId, canUndo, error }: Props = $props();

	const KEYS: { kind: PlayKind; label: string; hint: string }[] = [
		{ kind: 'full', label: 'Full record', hint: '2 sides' },
		{ kind: 'side', label: 'One side', hint: '½ record' }
	];

	let spins = $state<Record<PlayKind, number>>({ full: 0, side: 0 });
	let failed = $state<string>();
	let message = $derived(failed ?? error);

	function press(kind: PlayKind) {
		navigator.vibrate?.(15);
		spins[kind] += 1;
	}

	// With JS, plays go through the outbox: counted at once, sent when the server can be reached.
	const logPlay: SubmitFunction = ({ formData, cancel }) => {
		cancel();
		failed = undefined;
		const kind = formData.get('kind');
		if (kind === 'full' || kind === 'side') outbox.log(stylusId, kind);
	};

	// A play still waiting in the outbox is taken back there; otherwise the server undoes it.
	// The action redirects so a no-JS refresh can't undo twice. With JS, reload the data in
	// place instead: following the redirect would scroll back to the top.
	const undo: SubmitFunction<undefined, { error?: string }> = async ({ cancel }) => {
		failed = undefined;
		if (await outbox.undo(stylusId)) return cancel();
		return async ({ result }) => {
			if (result.type === 'redirect') await invalidateAll();
			else if (result.type === 'failure') failed = result.data?.error;
			else failed = "Couldn't reach the server to undo, try again once it's back";
		};
	};
</script>

<div class="flex flex-col gap-2">
	<form method="POST" action="?/play" use:enhance={logPlay} class="grid grid-cols-2 gap-2.5">
		<input type="hidden" name="stylusId" value={stylusId} />
		{#each KEYS as key (key.kind)}
			<!-- Piano-key switch: travels down when pressed. Full record is the lit key. -->
			<button
				name="kind"
				value={key.kind}
				data-spins={spins[key.kind]}
				onclick={() => press(key.kind)}
				class={[
					'group flex min-h-18 items-center gap-2.5 rounded-2xl px-2.5 text-left transition-[translate,box-shadow] duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-glow active:translate-y-[3px]',
					key.kind === 'full'
						? 'bg-[linear-gradient(180deg,var(--color-amber-glow),var(--color-vu-soon))] text-walnut-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_3px_0_var(--color-walnut-700),0_10px_20px_-8px_rgb(255_179_71/0.5)] active:shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_0_0_var(--color-walnut-700)]'
						: 'bg-[linear-gradient(180deg,var(--color-alu-200),var(--color-alu-400))] text-walnut-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_3px_0_var(--color-alu-600),0_10px_20px_-10px_rgb(0_0_0/0.8)] active:shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_0_0_var(--color-alu-600)]'
				]}
			>
				{#key spins[key.kind]}
					<span
						aria-hidden="true"
						class={[
							'grid size-9 shrink-0 place-items-center rounded-full bg-vinyl [background-image:var(--vinyl-grooves)] shadow-[0_2px_6px_rgb(0_0_0/0.45)]',
							spins[key.kind] > 0 && 'motion-safe:animate-[spin_0.9s_ease-out]'
						]}
					>
						<!-- Record label; half of it for one side. -->
						<span
							class={[
								'size-3.5 rounded-full',
								key.kind === 'full' ? 'bg-cream-100' : 'bg-amber-glow',
								key.kind === 'side' && '[clip-path:inset(0_50%_0_0)]'
							]}
						></span>
					</span>
				{/key}
				<span class="flex min-w-0 flex-col leading-tight">
					<span class="font-display text-base font-semibold whitespace-nowrap">{key.label}</span>
					<span aria-hidden="true" class="font-mono text-[0.6875rem] opacity-70">{key.hint}</span>
				</span>
			</button>
		{/each}
	</form>

	{#if message}
		<p role="alert" class="flex items-center gap-1.5 font-mono text-xs text-cream-50">
			<span aria-hidden="true" class="text-vu-soon">▲</span>{message}
		</p>
	{/if}

	{#if canUndo}
		<form method="POST" action="?/undo" use:enhance={undo} class="self-center">
			<input type="hidden" name="stylusId" value={stylusId} />
			<button
				class="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 font-mono text-xs text-cream-300 transition-colors hover:text-cream-50"
			>
				<svg
					viewBox="0 0 16 16"
					class="size-3.5"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<path d="M3 6h7a3.5 3.5 0 0 1 0 7H6" stroke-linecap="round" />
					<path d="M5.5 3.5 3 6l2.5 2.5" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				Undo last play
			</button>
		</form>
	{/if}
</div>
