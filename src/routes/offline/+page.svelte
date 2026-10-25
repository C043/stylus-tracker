<svelte:head>
	<title>Offline · Stylus Tracker</title>
</svelte:head>

<h1 class="font-display text-[2.125rem] leading-none font-semibold tracking-tight text-cream-50">
	You're offline
</h1>

<section class="flex flex-col items-center gap-5 card px-6 py-10 text-center">
	<div
		class="grid size-40 place-items-center rounded-full bg-vinyl [background-image:var(--vinyl-grooves)] shadow-[0_20px_40px_-12px_rgb(0_0_0/0.9)]"
		aria-hidden="true"
	>
		<div class="grid size-14 place-items-center rounded-full bg-amber-glow">
			<div class="size-1.5 rounded-full bg-vinyl"></div>
		</div>
	</div>
	<p class="font-display text-xl text-cream-50">This page isn't saved on your phone yet.</p>
	<p class="font-mono text-sm text-cream-300">
		Pages you've opened before still work. Reconnect to log plays.
	</p>
	<!-- No action: reloads whatever URL the user was trying to open, JS or not. -->
	<form method="get" data-sveltekit-reload>
		<button class="btn px-6 btn-primary">Try again</button>
	</form>
</section>
