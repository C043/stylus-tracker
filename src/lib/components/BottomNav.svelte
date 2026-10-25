<script lang="ts">
	import { resolve } from '$app/paths';

	interface Props {
		/** Current URL pathname; the layout passes `page.url.pathname`. */
		pathname: string;
	}

	let { pathname }: Props = $props();

	const tabs = [
		{ href: '/', label: 'Dashboard', icon: 'record' },
		{ href: '/turntables', label: 'Turntables', icon: 'turntable' },
		{ href: '/history', label: 'History', icon: 'history' },
		{ href: '/settings', label: 'Settings', icon: 'knob' }
	] as const;

	// "/" only matches itself; other tabs also own their nested routes.
	const isActive = (href: string) =>
		href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
</script>

<!-- Floating dock: a brushed-metal strip hovering over the cabinet, lit on the current input. -->
<nav
	aria-label="Main"
	class="pointer-events-none fixed inset-x-0 bottom-0 z-10 pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))]"
>
	<ul
		class="pointer-events-auto mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.75rem] border border-cream-100/10 bg-walnut-950/80 p-1.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_12px_32px_-8px_rgb(0_0_0/0.8)] backdrop-blur-xl"
	>
		{#each tabs as tab (tab.href)}
			{@const active = isActive(tab.href)}
			<li>
				<a
					href={resolve(tab.href)}
					aria-current={active ? 'page' : undefined}
					class={[
						'relative flex min-h-13 min-w-11 flex-col items-center justify-center gap-0.5 rounded-[1.375rem] font-mono text-[0.625rem] font-medium tracking-normal uppercase transition-colors focus-visible:outline-2 focus-visible:outline-amber-glow min-[360px]:tracking-wider',
						active
							? 'bg-amber-glow/12 text-amber-glow shadow-[inset_0_0_0_1px_rgb(255_179_71/0.25)]'
							: 'text-alu-400 hover:text-cream-100'
					]}
				>
					<svg
						viewBox="0 0 24 24"
						class={[
							'size-6 transition-transform',
							active && 'drop-shadow-[0_0_6px_rgb(255_179_71/0.6)]'
						]}
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						aria-hidden="true"
					>
						{#if tab.icon === 'record'}
							<circle cx="12" cy="12" r="9" />
							<circle cx="12" cy="12" r="3" />
							<path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5" stroke-linecap="round" />
						{:else if tab.icon === 'turntable'}
							<rect x="2.5" y="5" width="19" height="14" rx="2" />
							<circle cx="10" cy="12" r="4.5" />
							<path d="M18.5 7.5v6l-3 2.5" stroke-linecap="round" stroke-linejoin="round" />
						{:else if tab.icon === 'knob'}
							<circle cx="12" cy="13" r="6.5" />
							<path d="M12 13 9 9.5" stroke-linecap="round" />
							<path
								d="M4 18.5 3 19.5M3.5 13H2M5.2 7 4 6M12 4.5V3M18.8 7 20 6M20.5 13H22M20 18.5l1 1"
								stroke-linecap="round"
							/>
						{:else}
							<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" stroke-linecap="round" />
							<path d="M3 4v4h4" stroke-linecap="round" stroke-linejoin="round" />
							<path d="M12 7.5V12l3 2" stroke-linecap="round" stroke-linejoin="round" />
						{/if}
					</svg>
					{tab.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
