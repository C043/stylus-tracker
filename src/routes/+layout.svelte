<script lang="ts">
	import './layout.css';

	import { page } from '$app/state';
	import BottomNav from '#lib/components/BottomNav.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href="/icons/icon.svg" />
</svelte:head>

<!-- Bottom padding reserves the nav's height (56px + border) plus the home-indicator inset. -->
<main
	class="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
>
	{@render children()}
</main>

<BottomNav pathname={page.url.pathname} />
