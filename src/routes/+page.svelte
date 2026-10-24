<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Dashboard · Stylus Tracker</title>
</svelte:head>

<h1 class="font-display text-3xl font-semibold text-cream-50">Dashboard</h1>

<section class="flex flex-col items-center gap-5 rounded-2xl recessed px-6 py-10 text-center">
	<div
		class="relative grid size-40 place-items-center rounded-full bg-vinyl shadow-2xl motion-safe:animate-[spin_1.8s_linear_infinite]"
		style="background-image: repeating-radial-gradient(circle, var(--color-vinyl) 0 3px, #1f1f1f 3px 4px);"
		aria-hidden="true"
	>
		<div class="grid size-14 place-items-center rounded-full bg-amber-glow">
			<div class="size-1.5 rounded-full bg-vinyl"></div>
		</div>
	</div>
	<p class="text-lg text-cream-100">No turntables yet.</p>
	<a
		href={resolve('/turntables')}
		class="inline-flex min-h-11 items-center rounded-full bg-amber-glow px-5 font-mono text-sm font-semibold text-walnut-950"
	>
		Add a turntable
	</a>
</section>
