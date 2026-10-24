<svelte:head>
	<title>Offline · Stylus Tracker</title>
</svelte:head>

<h1 class="font-display text-3xl font-semibold text-cream-50">You're offline</h1>

<section class="flex flex-col items-center gap-5 rounded-2xl recessed px-6 py-10 text-center">
	<div
		class="grid size-40 place-items-center rounded-full bg-vinyl shadow-2xl"
		style="background-image: repeating-radial-gradient(circle, var(--color-vinyl) 0 3px, var(--color-groove) 3px 4px);"
		aria-hidden="true"
	>
		<div class="grid size-14 place-items-center rounded-full bg-amber-glow">
			<div class="size-1.5 rounded-full bg-vinyl"></div>
		</div>
	</div>
	<p class="text-lg text-cream-100">This page isn't saved on your phone yet.</p>
	<p class="font-mono text-sm text-cream-300">
		Pages you've opened before still work. Reconnect to log plays.
	</p>
	<!-- No action: reloads whatever URL the user was trying to open, JS or not. -->
	<form method="get" data-sveltekit-reload>
		<button
			class="inline-flex min-h-11 items-center rounded-full bg-amber-glow px-5 font-mono text-sm font-semibold text-walnut-950"
		>
			Try again
		</button>
	</form>
</section>
