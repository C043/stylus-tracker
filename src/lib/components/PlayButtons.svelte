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

<div class="flex flex-col gap-3">
	<form method="POST" action="?/play" use:enhance={logPlay} class="grid grid-cols-2 gap-3">
		<input type="hidden" name="stylusId" value={stylusId} />
		{#each KEYS as key (key.kind)}
			<!-- Piano-key switch: brushed aluminium, travels down when pressed. -->
			<button
				name="kind"
				value={key.kind}
				data-spins={spins[key.kind]}
				onclick={() => press(key.kind)}
				class="flex min-h-20 items-center gap-3 rounded-lg border border-alu-600 bg-[linear-gradient(180deg,var(--color-alu-200),var(--color-alu-400))] px-3 text-left text-walnut-950 shadow-[0_4px_0_var(--color-alu-600),0_6px_8px_rgb(0_0_0/0.5)] transition-[translate,box-shadow] duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-glow active:translate-y-1 active:shadow-[0_0_0_var(--color-alu-600),0_1px_2px_rgb(0_0_0/0.5)]"
			>
				{#key spins[key.kind]}
					<span
						aria-hidden="true"
						class={[
							'grid size-10 shrink-0 place-items-center rounded-full bg-vinyl',
							spins[key.kind] > 0 && 'motion-safe:animate-[spin_0.9s_ease-out]'
						]}
						style="background-image: repeating-radial-gradient(circle, var(--color-vinyl) 0 2px, var(--color-groove) 2px 3px);"
					>
						<!-- Record label; half of it for one side. -->
						<span
							class={[
								'size-4 rounded-full bg-amber-glow',
								key.kind === 'side' && '[clip-path:inset(0_50%_0_0)]'
							]}
						></span>
					</span>
				{/key}
				<span class="flex flex-col leading-tight">
					<span class="font-display text-base font-semibold">{key.label}</span>
					<span aria-hidden="true" class="font-mono text-xs text-walnut-800">{key.hint}</span>
				</span>
			</button>
		{/each}
	</form>

	{#if message}
		<p role="alert" class="font-mono text-xs text-cream-50">
			<span aria-hidden="true" class="mr-1 text-vu-soon">▲</span>{message}
		</p>
	{/if}

	{#if canUndo}
		<form method="POST" action="?/undo" use:enhance={undo} class="self-center">
			<input type="hidden" name="stylusId" value={stylusId} />
			<button
				class="inline-flex min-h-11 items-center rounded-full px-4 font-mono text-xs text-cream-300 underline decoration-dotted underline-offset-4"
			>
				Undo last play
			</button>
		</form>
	{/if}
</div>
